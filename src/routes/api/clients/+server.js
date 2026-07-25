import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** GET /api/clients — 客户端数量 */
export function GET () {
  const ws = getWS()
  return json({ success: true, clientCount: ws.getClientCount() })
}
