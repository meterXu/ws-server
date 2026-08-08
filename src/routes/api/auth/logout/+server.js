import { json } from '@sveltejs/kit'
import { deleteSession } from '$lib/server/auth.js'

/** POST /api/auth/logout — 退出登录 */
export async function POST({ cookies }) {
  const token = cookies.get('session')
  if (token) {
    deleteSession(token)
  }
  cookies.delete('session', { path: '/' })
  return json({ success: true, message: '已退出登录' })
}
