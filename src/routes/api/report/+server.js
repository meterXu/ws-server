import { json } from '@sveltejs/kit'
import { getWS, reportLogs, autoReplyRules } from '$lib/server/ws.js'
import { insertReportLog, trimReportLogs, updateAutoReplyRule } from '$lib/server/db.js'

const MAX_REPORT_LOGS = 200
const MAX_BODY_SIZE = 64 * 1024 // 64KB

/** POST /api/report — 接收上报数据 */
export async function POST (event) {
  const { request, getClientAddress } = event

  // 限制请求体大小
  const contentLength = parseInt(request.headers.get('content-length'), 10)
  if (contentLength > MAX_BODY_SIZE) {
    return json({ code: -1, success: false, message: '请求体过大' }, { status: 413 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    // 如果不是 JSON，尝试读取文本
    body = await request.text().catch(() => '')
  }

  // 检查 body 大小
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
  if (bodyStr.length > MAX_BODY_SIZE) {
    return json({ code: -1, success: false, message: '请求体过大' }, { status: 413 })
  }

  const entry = {
    time: new Date().toISOString(),
    ip: getClientAddress() || 'unknown',
    method: 'POST',
    body
  }

  reportLogs.push(entry)
  while (reportLogs.length > MAX_REPORT_LOGS) reportLogs.shift()
  insertReportLog(entry)
  trimReportLogs(MAX_REPORT_LOGS)

  // 自动回复规则匹配
  let matched = false
  const ws = getWS()

  for (const rule of autoReplyRules) {
    if (!rule.enabled) continue
    try {
      if (new RegExp(rule.pattern).test(bodyStr)) {
        rule.matchCount++
        rule.lastMatch = new Date().toISOString()
        updateAutoReplyRule(rule.id, { matchCount: rule.matchCount, lastMatch: rule.lastMatch })
        ws.sendToClient(rule.reply)
        console.log(`[AutoReply] 规则"${rule.name}"已匹配，自动回复已发送`)
        matched = true
      }
    } catch (_) { /* 无效正则跳过 */ }
  }

  if (!matched) {
    ws.sendToClient(body)
  }

  return json({ code: 0, success: true, message: '数据接收成功' })
}
