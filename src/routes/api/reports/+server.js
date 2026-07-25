import { json } from '@sveltejs/kit'
import { reportLogs } from '$lib/server/ws.js'

/** GET /api/reports — Report 消息列表 */
export function GET ({ url }) {
  const limit = parseInt(url.searchParams.get('limit'), 10) || 50
  return json({
    success: true,
    total: reportLogs.length,
    reports: reportLogs.slice(-Math.min(limit, 200)).reverse()
  })
}
