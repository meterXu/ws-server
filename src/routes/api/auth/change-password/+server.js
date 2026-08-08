import { json } from '@sveltejs/kit'
import { loadUserById, updateUserPassword } from '$lib/server/db.js'
import { verifyPassword, hashPassword, validateSession } from '$lib/server/auth.js'

/** POST /api/auth/change-password — 修改密码 */
export async function POST({ request, cookies }) {
  // 验证登录状态
  const token = cookies.get('session')
  if (!token) {
    return json({ success: false, message: '未登录' })
  }
  const session = validateSession(token)
  if (!session) {
    return json({ success: false, message: '会话已过期，请重新登录' })
  }

  const user = loadUserById(session.userId)
  if (!user) {
    return json({ success: false, message: '用户不存在' })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ success: false, message: '请求格式无效' })
  }

  const { oldPassword, newPassword } = body || {}

  if (!oldPassword || !newPassword) {
    return json({ success: false, message: '请输入旧密码和新密码' })
  }

  if (newPassword.length < 4) {
    return json({ success: false, message: '新密码长度不能少于 4 位' })
  }

  // 验证旧密码
  if (!verifyPassword(oldPassword, user.password)) {
    return json({ success: false, message: '旧密码错误' })
  }

  // 更新为新密码
  updateUserPassword(user.id, hashPassword(newPassword))

  return json({ success: true, message: '密码修改成功' })
}
