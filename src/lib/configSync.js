import { readJson, writeJson, STORAGE_KEYS } from '@/lib/storage';

/**
 * Shared config sync (one store, multiple devices)
 * Backed by Netlify Functions + Netlify Blobs.
 *
 * Store ID can be set via VITE_STORE_ID. Default is "4979".
 */
const STORE_ID = (import.meta.env.VITE_STORE_ID || '4979').toString();

const ENDPOINT_GET = '/.netlify/functions/config-get';
const ENDPOINT_SAVE = '/.netlify/functions/config-save';

function nowIso() {
  return new Date().toISOString();
}

function getLocalConfig() {
  return {
    storeId: STORE_ID,
    boxes: readJson(STORAGE_KEYS.boxes, []),
    guidelines: readJson(STORAGE_KEYS.guidelines, []),
    preferences: readJson(STORAGE_KEYS.preferences, {}),
    updatedAt: readJson('boxfit.config.updatedAt', null),
    version: readJson('boxfit.config.version', 0),
  };
}

function setLocalConfig(config) {
  if (Array.isArray(config?.boxes)) writeJson(STORAGE_KEYS.boxes, config.boxes);
  if (Array.isArray(config?.guidelines)) writeJson(STORAGE_KEYS.guidelines, config.guidelines);
  if (config?.preferences && typeof config.preferences === 'object') writeJson(STORAGE_KEYS.preferences, config.preferences);
  if (config?.updatedAt) writeJson('boxfit.config.updatedAt', config.updatedAt);
  if (Number.isFinite(config?.version)) writeJson('boxfit.config.version', config.version);
}

async function fetchRemoteConfig() {
  const url = `${ENDPOINT_GET}?store=${encodeURIComponent(STORE_ID)}`;
  const res = await fetch(url, { method: 'GET' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Config fetch failed (${res.status})`);
  return await res.json();
}

async function saveRemoteConfig({ pin, config }) {
  const res = await fetch(ENDPOINT_SAVE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId: STORE_ID, pin, config }),
  });
  if (res.status === 401) throw new Error('Invalid admin PIN.');
  if (!res.ok) throw new Error(`Config save failed (${res.status})`);
  return await res.json();
}

/**
 * Initializes shared config sync.
 * - Seeds defaults locally (handled by ensureSeeded)
 * - Pulls remote config if available
 * - Periodically refreshes remote config (so other devices see updates)
 */
export function initConfigSync({ defaultBoxes, defaultGuidelines, queryClient }) {
  // Ensure preferences exist (some older builds didn't seed prefs)
  const prefs = readJson(STORAGE_KEYS.preferences, null);
  if (!prefs || typeof prefs !== 'object') {
    writeJson(STORAGE_KEYS.preferences, { basicExtraPadding: 0, photoReference: 'paper_8.5x11' });
  }

  // Kick off a remote pull (best effort).
  (async () => {
    try {
      const remote = await fetchRemoteConfig();
      if (remote && Number.isFinite(remote.version)) {
        const localVersion = Number(readJson('boxfit.config.version', 0)) || 0;
        if (remote.version >= localVersion) {
          setLocalConfig(remote);
          if (queryClient) {
            queryClient.invalidateQueries({ queryKey: ['boxes'] });
            queryClient.invalidateQueries({ queryKey: ['guidelines'] });
          }
        }
      } else {
        // No remote yet: keep local defaults.
        // Admin can push settings from Settings page when ready.
      }
    } catch (e) {
      // Offline / first load: ignore
      // console.warn(e);
    }
  })();

  // Refresh every 60 seconds to pick up changes made on another device.
  window.setInterval(async () => {
    try {
      const remote = await fetchRemoteConfig();
      if (!remote) return;
      const localVersion = Number(readJson('boxfit.config.version', 0)) || 0;
      if (remote.version > localVersion) {
        setLocalConfig(remote);
        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: ['boxes'] });
          queryClient.invalidateQueries({ queryKey: ['guidelines'] });
        }
      }
    } catch {
      // ignore
    }
  }, 60_000);
}

/**
 * Exposed helpers for Settings page
 */
export const configApi = {
  storeId: STORE_ID,
  fetchRemoteConfig,
  saveRemoteConfig,
  getLocalConfig,
  setLocalConfig,
  nowIso,
};
