import { getStore } from '@netlify/blobs';

function json(res, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async (request) => {
  try {
    const body = await request.json();
    const { storeId = '4979', pin, config } = body || {};

    const requiredPin = (process.env.ADMIN_PIN || '4979').toString();
    if ((pin || '').toString() !== requiredPin) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (!config || typeof config !== 'object') {
      return json({ error: 'Missing config' }, 400);
    }

    const store = getStore('boxit-config');
    const key = `store_${storeId}`;

    const existing = await store.get(key, { type: 'json' });
    const nextVersion = Number(existing?.version || 0) + 1;

    const next = {
      storeId: storeId.toString(),
      boxes: Array.isArray(config.boxes) ? config.boxes : (existing?.boxes || []),
      guidelines: Array.isArray(config.guidelines) ? config.guidelines : (existing?.guidelines || []),
      preferences: (config.preferences && typeof config.preferences === 'object') ? config.preferences : (existing?.preferences || {}),
      updatedAt: new Date().toISOString(),
      version: nextVersion,
    };

    await store.set(key, next);

    return json(next, 200);
  } catch (e) {
    return json({ error: 'Server error' }, 500);
  }
};
