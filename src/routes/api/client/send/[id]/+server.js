import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** POST /api/client/send/:id — 向指定客户端发送消息 */
export async function POST ({ params, request }) {
  const ws = getWS()
  const id = parseInt(params.id, 10)
  if (!id) {
    return json({ success: false, message: '客户端 ID 无效' })
  }
  const data = await request.json()
  if (!data || Object.keys(data).length === 0) {
    return json({ success: false, message: '消息不能为空' })
  }
  const sent = ws.sendToClientById(id, data)
  return sent
    ? json({ success: true, message: `消息已发送至客户端 #${id}` })
    : json({ success: false, message: `客户端 #${id} 不存在或已断开` })
}
