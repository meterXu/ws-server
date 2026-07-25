import { json } from '@sveltejs/kit'
import { autoReplyRules, getNextRuleId } from '$lib/server/ws.js'
import { insertAutoReplyRule } from '$lib/server/db.js'

const MAX_AUTO_REPLY_RULES = 50

/** GET /api/auto-reply/rules — 获取所有规则 */
export function GET () {
  return json({ success: true, rules: autoReplyRules })
}

/** POST /api/auto-reply/rules — 创建规则 */
export async function POST ({ request }) {
  const { name, pattern, reply, enabled } = await request.json()

  if (!name || !pattern || !reply) {
    return json({ success: false, message: 'name, pattern, reply 不能为空' })
  }
  if (autoReplyRules.length >= MAX_AUTO_REPLY_RULES) {
    return json({ success: false, message: `规则数量已达上限 ${MAX_AUTO_REPLY_RULES}` })
  }
  try { new RegExp(pattern) } catch (_) {
    return json({ success: false, message: '正则表达式无效' })
  }

  const rule = {
    id: getNextRuleId(),
    name,
    pattern,
    reply,
    enabled: enabled !== false,
    matchCount: 0,
    lastMatch: null,
    createdAt: new Date().toISOString()
  }
  autoReplyRules.push(rule)
  insertAutoReplyRule(rule)
  return json({ success: true, rule })
}
