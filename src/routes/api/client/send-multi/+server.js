import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** POST /api/client/send-multi — 向选中的多个客户端发送消息 */
export async function POST ({ request }) {
  const ws = getWS()
  const body = await request.json()
  const { clientIds, data } = body

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return json({ success: false, message: '请选择至少一个客户端' })
  }
  if (!data || Object.keys(data).length === 0) {
    return json({ success: false, message: '消息不能为空' })
  }

  let sent = 0
  let failed = 0
  for (const id of clientIds) {
    if (ws.sendToClientById(id, data)) {
      sent++
    } else {
      failed++
    }
  }

  return json({
    success: sent > 0,
    sent,
    failed,
    total: clientIds.length,
    message: `已发送至 ${sent} 个客户端` + (failed > 0 ? `，${failed} 个失败` : '')
  })
}
