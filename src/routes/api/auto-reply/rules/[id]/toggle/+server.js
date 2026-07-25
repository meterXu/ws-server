import { json } from '@sveltejs/kit'
import { autoReplyRules } from '$lib/server/ws.js'
import { updateAutoReplyRule } from '$lib/server/db.js'

/** POST /api/auto-reply/rules/:id/toggle — 切换规则启用状态 */
export function POST ({ params }) {
  const id = parseInt(params.id, 10)
  const rule = autoReplyRules.find(r => r.id === id)
  if (!rule) {
    return json({ success: false, message: '规则不存在' })
  }
  rule.enabled = !rule.enabled
  updateAutoReplyRule(id, { enabled: rule.enabled })
  return json({ success: true, rule })
}
