import React from 'react';
import { motion } from 'framer-motion';
import { Package, Scissors, Link2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function fmtDims(d) {
  if (!d) return '';
  const [a,b,c] = d;
  return `${Number(a).toFixed(1)} × ${Number(b).toFixed(1)} × ${Number(c).toFixed(1)}`;
}

export default function BoxRecommendation({ recommendation, itemDimensions, padding }) {
  if (!recommendation) return null;

  if (recommendation.noFit) {
    return <NoBoxFits itemDimensions={itemDimensions} padding={padding} requiredDims={recommendation.requiredDims} />;
  }

  const method = recommendation.method || 'single';

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {method === 'single' && (
        <SingleRecommendation recommendation={recommendation} />
      )}
      {method === 'telescoping' && (
        <TelescopingRecommendation recommendation={recommendation} />
      )}
    </motion.div>
  );
}

function SingleRecommendation({ recommendation }) {
  const { box, fit, alternatives, cutDown } = recommendation;

  const efficiency = fit?.efficiency || 0;
  const effBadge = efficiency >= 80 ? 'bg-emerald-50 text-emerald-700'
    : efficiency >= 60 ? 'bg-amber-50 text-amber-700'
    : 'bg-red-50 text-red-700';

  return (
    <>
      <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-700" />
              <div className="text-lg font-semibold text-slate-900">Recommended Box</div>
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-800">{box?.name}</div>
            <div className="text-sm text-slate-600">
              {box?.length}" × {box?.width}" × {box?.height}"
            </div>
          </div>

          <Badge className={effBadge}>{efficiency.toFixed(0)}% fit</Badge>
        </div>

        {cutDown && (
          <div className="mt-4 rounded-xl bg-white/70 border p-4">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Scissors className="h-4 w-4" /> Cut-down option
            </div>
            <div className="mt-1 text-sm text-slate-700">
              Cut from <strong>{fmtDims(cutDown.from)}</strong> to <strong>{fmtDims(cutDown.to)}</strong> (inches).
            </div>
            <div className="mt-1 text-xs text-slate-600">{cutDown.note}</div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Remaining L" value={`${fit?.remainingSpace?.length?.toFixed?.(1) ?? '-'}"`} />
          <Stat label="Remaining W" value={`${fit?.remainingSpace?.width?.toFixed?.(1) ?? '-'}"`} />
          <Stat label="Remaining H" value={`${fit?.remainingSpace?.height?.toFixed?.(1) ?? '-'}"`} />
        </div>
      </div>

      {Array.isArray(alternatives) && alternatives.length > 0 && (
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold text-slate-900 mb-3">Alternates</div>
          <div className="grid gap-2">
            {alternatives.slice(0,2).map((alt) => (
              <div key={alt.box?.id || alt.box?.name} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div className="font-medium">{alt.box?.name}</div>
                  <div className="text-xs text-slate-500">{alt.box?.length}" × {alt.box?.width}" × {alt.box?.height}"</div>
                </div>
                <Badge className="bg-slate-100 text-slate-700">{(alt.fit?.efficiency || 0).toFixed(0)}%</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function TelescopingRecommendation({ recommendation }) {
  const t = recommendation.telescoping;
  const alts = recommendation.alternatives || [];

  return (
    <>
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-50 to-slate-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-indigo-700" />
              <div className="text-lg font-semibold text-slate-900">Telescoping Solution</div>
            </div>
            <div className="mt-1 text-sm text-slate-700">
              Best fit when no single box works.
            </div>
          </div>
          <Badge className="bg-indigo-100 text-indigo-800">2-box build</Badge>
        </div>

        <div className="mt-4 rounded-xl bg-white/70 border p-4 space-y-2">
          <div className="text-sm text-slate-700">
            Required (padded): <strong>{t.required.length.toFixed(1)} × {t.required.width.toFixed(1)} × {t.required.height.toFixed(1)}</strong> in
          </div>
          <div className="text-sm text-slate-700">
            Use: <strong>{t.boxes[0]?.box?.name}</strong> + <strong>{t.boxes[1]?.box?.name}</strong>
          </div>
          <div className="text-sm text-slate-700">
            Overlap: <strong>{t.overlap.toFixed(1)}"</strong> • Combined length possible: <strong>{t.combinedLengthPossible.toFixed(1)}"</strong>
          </div>
          <div className="text-xs text-slate-600">{t.note}</div>
        </div>
      </div>

      {alts.length > 0 && (
        <div className="rounded-2xl border bg-white p-5">
          <div className="font-semibold text-slate-900 mb-3">Alternate telescoping options</div>
          <div className="grid gap-2">
            {alts.slice(0,2).map((a, idx) => (
              <div key={idx} className="rounded-xl border p-3 text-sm text-slate-700">
                <div><strong>{a.boxes[0]?.box?.name}</strong> + <strong>{a.boxes[1]?.box?.name}</strong></div>
                <div className="text-xs text-slate-500">Overlap {a.overlap.toFixed(1)}" • Combined {a.combinedLengthPossible.toFixed(1)}"</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border bg-white/60 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function NoBoxFits({ itemDimensions, padding, requiredDims }) {
  const totalSize = requiredDims
    ? requiredDims
    : {
        length: (Number(itemDimensions.length) || 0) + padding * 2,
        width: (Number(itemDimensions.width) || 0) + padding * 2,
        height: (Number(itemDimensions.height) || 0) + padding * 2,
      };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50 p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-700" />
          <div className="text-lg font-semibold text-slate-900">No single box fits</div>
        </div>
        <div className="mt-2 text-sm text-slate-700">
          Required internal size (including padding):
        </div>
        <div className="mt-2 inline-flex gap-4 rounded-lg border bg-white/70 px-4 py-2 text-sm">
          <span><strong>{Number(totalSize.length).toFixed(1)}"</strong> L</span>
          <span><strong>{Number(totalSize.width).toFixed(1)}"</strong> W</span>
          <span><strong>{Number(totalSize.height).toFixed(1)}"</strong> H</span>
        </div>
        <div className="mt-3 text-sm text-amber-800">
          Tip: Try a different packing category (padding), add larger boxes to inventory, or use telescoping if available.
        </div>
      </div>
    </motion.div>
  );
}
