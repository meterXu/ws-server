/**
 * Server-side hooks — CORS for API routes, auth guard.
 */
import { validateSession } from '$lib/server/auth.js'
import { loadUserById } from '$lib/server/db.js'

// 无需认证的路径
const PUBLIC_PATHS = ['/login', '/api/auth/login']

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

  const pathname = event.url.pathname

  // ---- 认证检查 ----

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // 验证会话
  const token = event.cookies.get('session')
  if (token) {
    const session = validateSession(token)
    if (session) {
      const user = loadUserById(session.userId)
      if (user) {
        event.locals.user = { id: user.id, username: user.username }
      }
    }
  }

  // 未登录用户访问受保护页面 → 重定向到登录页
  if (!isPublic && !event.locals.user) {
    if (pathname.startsWith('/api')) {
      return new Response(JSON.stringify({ success: false, message: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    })
  }

  // 已登录用户访问登录页 → 重定向到首页
  if (pathname.startsWith('/login') && event.locals.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/' }
    })
  }

  // ---- 正常请求处理 ----

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
