import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** GET /api/clients/detail — 客户端详情列表 */
export function GET () {
  const ws = getWS()
  return json({ success: true, clients: ws.getClientsDetail() })
}
