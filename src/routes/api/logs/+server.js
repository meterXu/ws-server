import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** GET /api/logs — 消息日志 */
export function GET ({ url }) {
  const ws = getWS()
  const limit = parseInt(url.searchParams.get('limit'), 10) || 50
  return json({ success: true, logs: ws.getLogs(Math.min(limit, 200)) })
}
