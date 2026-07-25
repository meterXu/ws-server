import { json } from '@sveltejs/kit'

/** GET /api — 健康检查 */
export function GET () {
  return json({ success: true, message: '用于知眸AI数据上报' })
}
