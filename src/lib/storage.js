// localStorage-backed persistence with defaults.

export const STORAGE_KEYS = {
  boxes: 'boxfit.boxes.v1',
  guidelines: 'boxfit.guidelines.v1',
  preferences: 'boxfit.preferences.v1',
};

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  return safeParse(raw, fallback);
}

export function writeJson(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function ensureSeeded({ defaultBoxes, defaultGuidelines }) {
  const boxes = readJson(STORAGE_KEYS.boxes, null);
  if (!Array.isArray(boxes) || boxes.length === 0) {
    writeJson(STORAGE_KEYS.boxes, defaultBoxes);
  }

  const guidelines = readJson(STORAGE_KEYS.guidelines, null);
  if (!Array.isArray(guidelines) || guidelines.length === 0) {
    writeJson(STORAGE_KEYS.guidelines, defaultGuidelines);
  }

  const prefs = readJson(STORAGE_KEYS.preferences, null);
  if (!prefs || typeof prefs !== 'object') {
    writeJson(STORAGE_KEYS.preferences, {
      // Used for Basic (employee choice) to add optional padding per side.
      basicExtraPadding: 0,
      // Used by Photo mode later.
      photoReference: 'paper_8.5x11',
    });
  }
}
