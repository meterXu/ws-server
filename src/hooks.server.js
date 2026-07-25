/**
 * Server-side hooks — CORS for API routes, OPTIONS preflight.
 */

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  // Handle OPTIONS preflight for API routes
  if (event.request.method === 'OPTIONS' && event.url.pathname.startsWith('/api')) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Access-Control-Allow-Methods': 'PUT, POST, GET, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }

  const response = await resolve(event)

  // Add CORS headers for API routes
  if (event.url.pathname.startsWith('/api')) {
    const headers = new Headers(response.headers)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    headers.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS')
    headers.set('Access-Control-Allow-Credentials', 'true')
    return new Response(response.body, {
      status: response.status,
      headers
    })
  }

  return response
}
