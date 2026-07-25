import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** POST /api/broadcast — 向所有客户端广播消息 */
export async function POST ({ request }) {
  const ws = getWS()
  const body = await request.json()
  const count = ws.getClientCount()
  if (count === 0) {
    return json({ success: true, clientCount: 0, message: '当前没有已连接的客户端' })
  }
  ws.sendToClient(body)
  console.log('[Broadcast] 消息已广播至 ' + count + ' 个客户端:', body)
  return json({ success: true, clientCount: count, message: '广播成功' })
}
