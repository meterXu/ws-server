import { json } from '@sveltejs/kit'
import { getWS } from '$lib/server/ws.js'

/** POST /api/timer/start — 启动定时广播 */
export async function POST ({ request }) {
  const ws = getWS()
  const { name, message, interval } = await request.json()

  if (!name || !name.trim()) return json({ success: false, message: 'name 不能为空' })
  if (!message) return json({ success: false, message: 'message 不能为空' })

  const messageStr = JSON.stringify(message)
  if (messageStr.length > 64 * 1024) {
    return json({ success: false, message: '消息体不能超过 64KB' })
  }
  if (!interval || interval < 1) {
    return json({ success: false, message: '间隔必须 >= 1 秒' })
  }

  const timer = ws.startTimer(name.trim(), message, interval * 1000)
  console.log('[Timer] 定时广播 #' + timer.id + (timer.name ? '（' + timer.name + '）' : '') + ' 已启动，间隔 ' + interval + 's')
  return json({ success: true, message: '定时广播已启动', timer })
}
