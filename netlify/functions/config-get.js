import { getStore } from '@netlify/blobs';

export default async (request) => {
  try {
    const url = new URL(request.url);
    const storeId = (url.searchParams.get('store') || '4979').toString();
    const store = getStore('boxit-config');
    const key = `store_${storeId}`;
    const data = await store.get(key, { type: 'json' });

    if (!data) {
      return new Response(JSON.stringify({ exists: false, storeId }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
