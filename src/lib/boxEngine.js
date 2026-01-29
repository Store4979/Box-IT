// Box fitting engine: rotation-aware fit + scoring, plus cut-down and telescoping suggestions.

export function getPermutations3([a, b, c]) {
  return [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];
}

export function calcRequiredDims(itemDims, paddingPerSide) {
  const pad = Math.max(0, Number(paddingPerSide) || 0);
  return [
    (Number(itemDims.length) || 0) + pad * 2,
    (Number(itemDims.width) || 0) + pad * 2,
    (Number(itemDims.height) || 0) + pad * 2,
  ];
}

function boxDimsOf(box) {
  return [Number(box.length), Number(box.width), Number(box.height)];
}

function volume([a, b, c]) {
  return a * b * c;
}

function bestSingleBoxFit({ boxes, reqDims, reqVol }) {
  const activeBoxes = (boxes || []).filter(b => b.is_active !== false);

  const candidates = [];
  for (const box of activeBoxes) {
    const dims = boxDimsOf(box);
    if (dims.some(n => !Number.isFinite(n) || n <= 0)) continue;

    let bestFit = null;
    for (const perm of getPermutations3(reqDims)) {
      const fits = dims[0] >= perm[0] && dims[1] >= perm[1] && dims[2] >= perm[2];
      if (!fits) continue;

      const slack = [dims[0] - perm[0], dims[1] - perm[1], dims[2] - perm[2]];
      const maxSlack = Math.max(...slack);
      const wastedVol = volume(dims) - reqVol;
      const efficiency = reqVol > 0 ? (reqVol / volume(dims)) * 100 : 0;

      const fit = {
        orientation: { req: perm, box: dims },
        remainingSpace: { length: slack[0], width: slack[1], height: slack[2] },
        efficiency,
        score: wastedVol + maxSlack * 10 + (box.cost ? Number(box.cost) * 50 : 0),
      };

      if (!bestFit || fit.score < bestFit.score) bestFit = fit;
    }

    if (bestFit) candidates.push({ box, fit: bestFit });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.fit.score - b.fit.score);
  return {
    box: candidates[0].box,
    fit: candidates[0].fit,
    alternatives: candidates.slice(1),
  };
}

// Cut-down suggestion: typically only height is cut down.
// We suggest cutting down to the required height (plus a small tolerance for flaps).
function getCutDownSuggestion({ box, fit, flapTolerance = 0.25 }) {
  if (!box || !fit) return null;
  const [reqL, reqW, reqH] = fit.orientation.req;
  const [boxL, boxW, boxH] = fit.orientation.box;

  // Only suggest if the box is taller than needed by a meaningful margin.
  const targetH = Math.min(boxH, reqH + flapTolerance);
  const canCut = boxH - targetH >= 0.75; // at least 3/4" excess
  if (!canCut) return null;

  return {
    method: 'cut_down',
    from: [boxL, boxW, boxH],
    to: [boxL, boxW, Number(targetH.toFixed(2))],
    note: 'Suggested cut-down (height). Leave enough material for proper closure and taping.',
  };
}

/**
 * Telescoping search:
 * - If no single box fits, try combining two boxes along a "length axis" with overlap.
 * - Uses required dims (already includes padding), so guidelines are respected.
 */
function findTelescopingSolution({ boxes, reqDims, minOverlap = 6, maxAlternates = 2 }) {
  const active = (boxes || []).filter(b => b.is_active !== false);
  if (active.length === 0) return null;

  // We will treat reqDims as [reqL, reqW, reqH] (not sorted). We'll allow rotations by permuting req dims.
  const reqPerms = getPermutations3(reqDims);

  let best = null;
  const alternates = [];

  for (const req of reqPerms) {
    const [reqLen, reqA, reqB] = req;

    // Candidate boxes must be able to match cross-section (A,B) in some orientation.
    const orientedBoxes = [];
    for (const box of active) {
      const dims = boxDimsOf(box);
      for (const o of getPermutations3(dims)) {
        const [lenAxis, crossA, crossB] = o;
        // cross-section must fit
        if (crossA >= reqA && crossB >= reqB) {
          orientedBoxes.push({
            box,
            orientation: { lenAxis, crossA, crossB, raw: o },
          });
        }
      }
    }

    // Try pairs
    for (let i = 0; i < orientedBoxes.length; i++) {
      const A = orientedBoxes[i];
      for (let j = i; j < orientedBoxes.length; j++) {
        const B = orientedBoxes[j];

        // Cross-sections must be compatible to telescope. We allow some mismatch but the smaller must fit inside the larger.
        const aCross = [A.orientation.crossA, A.orientation.crossB].sort((x, y) => y - x);
        const bCross = [B.orientation.crossA, B.orientation.crossB].sort((x, y) => y - x);

        const aFitsInB = aCross[0] <= bCross[0] && aCross[1] <= bCross[1];
        const bFitsInA = bCross[0] <= aCross[0] && bCross[1] <= aCross[1];
        if (!aFitsInB && !bFitsInA) continue;

        const overlapCap = Math.min(A.orientation.lenAxis, B.orientation.lenAxis) - 1;
        const overlap = Math.min(Math.max(minOverlap, minOverlap), overlapCap);
        if (!Number.isFinite(overlap) || overlap < minOverlap) continue;

        const maxCombinedLen = A.orientation.lenAxis + B.orientation.lenAxis - overlap;
        if (maxCombinedLen < reqLen) continue;

        // Compute waste: combined volume minus required volume, plus penalties.
        const combinedLen = reqLen; // we only need reqLen, overlap adjusts.
        const outerCross = [
          Math.max(A.orientation.crossA, B.orientation.crossA),
          Math.max(A.orientation.crossB, B.orientation.crossB),
        ];
        const usedDims = [combinedLen, ...outerCross];
        const reqVol = volume([reqLen, reqA, reqB]);
        const waste = volume(usedDims) - reqVol;

        const costPenalty = (A.box.cost ? Number(A.box.cost) : 0) + (B.box.cost ? Number(B.box.cost) : 0);
        const score = waste + costPenalty * 50 + overlap * 2;

        const solution = {
          method: 'telescoping',
          required: { length: reqLen, width: reqA, height: reqB },
          boxes: [
            { box: A.box, orientation: A.orientation.raw },
            { box: B.box, orientation: B.orientation.raw },
          ],
          overlap: Number(overlap.toFixed(2)),
          combinedLengthPossible: Number(maxCombinedLen.toFixed(2)),
          score,
          note: 'Telescoping solution (two boxes). Ensure strong overlap and tape reinforcement along seam.',
        };

        if (!best || score < best.score) {
          if (best) alternates.push(best);
          best = solution;
        } else if (alternates.length < maxAlternates) {
          alternates.push(solution);
        }
      }
    }
  }

  if (!best) return null;
  alternates.sort((a, b) => a.score - b.score);
  return { best, alternates: alternates.slice(0, maxAlternates) };
}

/**
 * Main entry: returns best single-box recommendation, plus optional cut-down,
 * or telescoping suggestion if no single box fits.
 */
export function findBestPackagingSolution({
  boxes,
  itemDims,
  paddingPerSide,
  maxAlternates = 2,
  allowCutDown = true,
  allowTelescoping = true,
  telescopingMinOverlap = 6,
}) {
  if (!itemDims?.length || !itemDims?.width || !itemDims?.height) return null;

  const reqDims = calcRequiredDims(itemDims, paddingPerSide);
  const reqVol = volume(reqDims);

  const single = bestSingleBoxFit({ boxes, reqDims, reqVol });
  if (single) {
    const cutDown = allowCutDown ? getCutDownSuggestion({ box: single.box, fit: single.fit }) : null;
    return {
      method: 'single',
      requiredDims: { length: reqDims[0], width: reqDims[1], height: reqDims[2] },
      box: single.box,
      fit: single.fit,
      cutDown,
      alternatives: single.alternatives.slice(0, maxAlternates),
    };
  }

  if (allowTelescoping) {
    const telescope = findTelescopingSolution({ boxes, reqDims, minOverlap: telescopingMinOverlap, maxAlternates });
    if (telescope) {
      return {
        method: 'telescoping',
        requiredDims: { length: reqDims[0], width: reqDims[1], height: reqDims[2] },
        telescoping: telescope.best,
        alternatives: telescope.alternates,
        noFit: false,
      };
    }
  }

  return { noFit: true, requiredDims: { length: reqDims[0], width: reqDims[1], height: reqDims[2] } };
}

// Backward-compatible wrapper (used elsewhere)
export function findBestBoxes({ boxes, itemDims, paddingPerSide, maxAlternates = 2 }) {
  return findBestPackagingSolution({ boxes, itemDims, paddingPerSide, maxAlternates });
}
