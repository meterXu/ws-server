import { json } from '@sveltejs/kit'
import { validateSession } from '$lib/server/auth.js'
import { loadUserById } from '$lib/server/db.js'

/** GET /api/auth/me — 获取当前登录用户信息 */
export async function GET({ cookies }) {
  const token = cookies.get('session')
  if (!token) {
    return json({ success: false, message: '未登录' })
  }

  const session = validateSession(token)
  if (!session) {
    return json({ success: false, message: '会话已过期' })
  }

  const user = loadUserById(session.userId)
  if (!user) {
    return json({ success: false, message: '用户不存在' })
  }

  return json({
    success: true,
    user: { id: user.id, username: user.username }
  })
}
