// Packaging rules helper.
// These defaults are aligned to the provided minimum packaging guidelines.

const BANDS = [
  { min: 1, max: 10, label: '1-10' },
  { min: 11, max: 40, label: '11-40' },
  { min: 41, max: 70, label: '41-70' },
  { min: 71, max: 150, label: '71-150' },
];

function getBand(weight) {
  const w = Number(weight) || 0;
  return BANDS.find(b => w >= b.min && w <= b.max) || (w > 150 ? { min: 151, max: 9999, label: '150+' } : null);
}

const BOX_STRENGTH_BY_BAND = {
  '1-10': { strength: '150-lb', double_wall: false },
  '11-40': { strength: '200-lb', double_wall: false },
  '41-70': { strength: '275-lb', double_wall: false },
  '71-150': { strength: '350-lb', double_wall: true },
  '150+': { strength: '350-lb', double_wall: true },
};

const MATERIALS = {
  basic: [
    'Appropriate corrugated box for the item weight',
    'Void fill as needed to prevent movement',
    '3" carton tape using six-strip (H-taping) method',
  ],
  standard: [
    'Appropriate corrugated box for the item weight',
    'Two layers of large bubble wrap or inflatable air cushioning',
    'Void fill as needed to prevent movement',
    '3" carton tape using six-strip (H-taping) method',
  ],
  fragile: [
    'Appropriate corrugated box for the item weight',
    'One layer of small bubble wrap or foamwrap',
    'Two layers of large bubble wrap or inflatable air cushioning',
    'Void fill as needed to prevent movement',
    'Corrugate dividers if packing multiple items/layers',
    '3" carton tape using six-strip (H-taping) method',
  ],
  custom: [
    'Appropriate corrugated box for the item weight',
    '1" foam plank on all six sides (inside the box)',
    'One layer of small bubble wrap or foamwrap',
    'Two layers of large bubble wrap or inflatable air cushioning',
    'Void fill as needed to prevent movement',
    '3" carton tape using six-strip (H-taping) method',
  ],
};

export function computePaddingPerSide({ sensitivity, weight, basicExtraPadding = 0 }) {
  const band = getBand(weight);
  const label = band?.label || '1-10';
  if (sensitivity === 'basic') {
    // Employee choice / void fill only; allow optional extra padding.
    return Math.max(0, Number(basicExtraPadding) || 0);
  }
  if (sensitivity === 'standard') {
    return label === '1-10' ? 1 : 2;
  }
  if (sensitivity === 'fragile') return 2;
  if (sensitivity === 'custom') return 3;
  return 1;
}

export function makeGuideline({ sensitivity, weight, basicExtraPadding = 0 }) {
  const band = getBand(weight);
  if (!band) return null;
  const strengthMeta = BOX_STRENGTH_BY_BAND[band.label] || BOX_STRENGTH_BY_BAND['1-10'];
  const min_padding = computePaddingPerSide({ sensitivity, weight, basicExtraPadding });

  let notes = '';
  if (sensitivity === 'basic') {
    notes = 'Employee choice / void fill only. Ensure the item cannot shift inside the box.';
  } else if (sensitivity === 'fragile') {
    notes = 'Minimum 2" clearance on all sides for fragile items.';
  } else if (sensitivity === 'custom') {
    notes = 'Minimum 3" clearance on all sides. Custom packing may be required for irregular or high-value items.';
  } else if (sensitivity === 'standard' && band.label !== '1-10') {
    notes = 'Minimum 2" clearance on all sides for this weight range.';
  }

  return {
    name: `${sensitivity.charAt(0).toUpperCase()}${sensitivity.slice(1)} ${band.label} lbs`,
    sensitivity,
    weight_min: band.min,
    weight_max: band.max,
    min_padding,
    box_strength: strengthMeta.strength,
    double_wall: strengthMeta.double_wall,
    materials: MATERIALS[sensitivity] || [],
    notes,
  };
}