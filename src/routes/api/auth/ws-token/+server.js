import { json } from '@sveltejs/kit'
import { validateSession, getOrCreateWSToken, rotateWSToken } from '$lib/server/auth.js'

const WS_REQUIRE_TOKEN = process.env.WS_REQUIRE_TOKEN !== 'false'

/** GET /api/auth/ws-token — 获取 WebSocket 鉴权信息 */
export async function GET({ cookies, url }) {
  const token = cookies.get('session')
  if (!token) {
    return json({ success: false, message: '未登录' })
  }
  const session = validateSession(token)
  if (!session) {
    return json({ success: false, message: '会话已过期' })
  }

  const wsToken = getOrCreateWSToken(session.userId)
  const host = url.host
  const wsUrl = 'ws://' + host + '/ws' + (WS_REQUIRE_TOKEN ? '?token=' + wsToken : '')

  return json({ success: true, wsUrl, token: wsToken })
}

/** POST /api/auth/ws-token — 轮换（重置）WebSocket 鉴权令牌 */
export async function POST({ cookies, url }) {
  const token = cookies.get('session')
  if (!token) {
    return json({ success: false, message: '未登录' })
  }
  const session = validateSession(token)
  if (!session) {
    return json({ success: false, message: '会话已过期' })
  }

  const wsToken = rotateWSToken(session.userId)
  const host = url.host
  const wsUrl = 'ws://' + host + '/ws' + (WS_REQUIRE_TOKEN ? '?token=' + wsToken : '')

  return json({ success: true, wsUrl, token: wsToken, message: '令牌已重置' })
}
