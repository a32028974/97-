// worker.js
const TARGET = 'https://script.google.com/macros/s/AKfycbwnxCb9szK4tRJlGNxT2pW9bOAgJLy7yIChiL9MhLV94Ef7p1CsbCTB8CXlAnlSw4MGMw/exec';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response('', { status: 204, headers: corsHeaders() });
    }

    const init = {
      method: request.method,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.text();
    }

    const r = await fetch(TARGET, init);
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': r.headers.get('content-type') || 'text/plain',
      },
    });
  },
};
