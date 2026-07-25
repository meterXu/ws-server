import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** POST /api/clients/kick/:id — 踢出客户端 */
export function POST ({ params }) {
  const ws = getWS()
  const id = parseInt(params.id, 10)
  if (!id) {
    return json({ success: false, message: '客户端 ID 无效' })
  }
  const ok = ws.kickClient(id)
  return ok
    ? json({ success: true, message: `客户端 #${id} 已被踢出` })
    : json({ success: false, message: `客户端 #${id} 不存在` })
}
