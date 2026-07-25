import { json } from '@sveltejs/kit'
import { autoReplyRules } from '$lib/server/ws.js'
import { updateAutoReplyRule, deleteAutoReplyRule } from '$lib/server/db.js'

/** PUT /api/auto-reply/rules/:id — 更新规则 */
export async function PUT ({ params, request }) {
  const id = parseInt(params.id, 10)
  const rule = autoReplyRules.find(r => r.id === id)
  if (!rule) {
    return json({ success: false, message: '规则不存在' })
  }

  const { name, pattern, reply, enabled } = await request.json()
  if (pattern !== undefined) {
    try { new RegExp(pattern) } catch (_) {
      return json({ success: false, message: '正则表达式无效' })
    }
    rule.pattern = pattern
  }
  if (name !== undefined) rule.name = name
  if (reply !== undefined) rule.reply = reply
  if (enabled !== undefined) rule.enabled = enabled
  updateAutoReplyRule(id, { name, pattern, reply, enabled })
  return json({ success: true, rule })
}

/** DELETE /api/auto-reply/rules/:id — 删除规则 */
export function DELETE ({ params }) {
  const id = parseInt(params.id, 10)
  const idx = autoReplyRules.findIndex(r => r.id === id)
  if (idx === -1) {
    return json({ success: false, message: '规则不存在' })
  }
  autoReplyRules.splice(idx, 1)
  deleteAutoReplyRule(id)
  return json({ success: true })
}
