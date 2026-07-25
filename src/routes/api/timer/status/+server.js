import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** GET /api/timer/status — 获取所有定时器状态 */
export function GET () {
  const ws = getWS()
  return json({ success: true, timers: ws.getTimers() })
}
