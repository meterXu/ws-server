import { json } from '@sveltejs/kit'
import { loadUserByUsername } from '$lib/server/db.js'
import { verifyPassword, createSession } from '$lib/server/auth.js'

/** POST /api/auth/login — 用户登录 */
export async function POST({ request, cookies }) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ success: false, message: '请求格式无效' })
  }

  const { username, password } = body || {}

  if (!username || !password) {
    return json({ success: false, message: '请输入用户名和密码' })
  }

  const user = loadUserByUsername(username.trim())
  if (!user) {
    return json({ success: false, message: '用户名或密码错误' })
  }

  if (!verifyPassword(password, user.password)) {
    return json({ success: false, message: '用户名或密码错误' })
  }

  const token = createSession(user.id)
  cookies.set('session', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 86400, // 24 小时
    secure: false
  })

  return json({
    success: true,
    message: '登录成功',
    user: { id: user.id, username: user.username }
  })
}
