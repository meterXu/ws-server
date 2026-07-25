import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** POST /api/timer/remove — 删除定时广播 */
export async function POST ({ request }) {
  const ws = getWS()
  const { id } = await request.json()
  if (!id) return json({ success: false, message: 'id 不能为空' })

  ws.removeTimer(id)
  return json({ success: true, message: '定时任务已删除' })
}
