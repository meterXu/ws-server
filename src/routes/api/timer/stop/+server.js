import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** POST /api/timer/stop — 停止定时广播 */
export async function POST ({ request }) {
  const ws = getWS()
  const { id } = await request.json()
  if (!id) return json({ success: false, message: 'id 不能为空' })

  const ok = ws.stopTimer(id)
  if (!ok) return json({ success: false, message: '定时任务不存在或已停止' })

  console.log('[Timer] 定时广播 #' + id + ' 已停止')
  return json({ success: true, message: '定时广播已停止' })
}
