import Router from 'koa-router'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import {
  loadAutoReplyRules, insertAutoReplyRule, updateAutoReplyRule, deleteAutoReplyRule,
  loadReportLogs, insertReportLog, trimReportLogs
} from '../db/database.js'

const demoRouter = new Router();
const dataMap = new Map()
let syncData = ""
const MAX_REPORT_LOGS = 200
const reportLogs = loadReportLogs()
const MAX_AUTO_REPLY_RULES = 50
export const autoReplyRules = loadAutoReplyRules()
let _nextRuleId = autoReplyRules.length > 0 ? Math.max(...autoReplyRules.map(r => r.id)) : 0
import path from "node:path"
import fs from "node:fs"
import os from "node:os"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

demoRouter.get('/api', async (ctx) => {
    ctx.body = {
        success: true,
        message: '用于知眸AI数据上报'
    };
});


demoRouter.post('/api/report', (ctx) => {
    console.log(ctx.request.body)
    const entry = {
        time: new Date().toISOString(),
        ip: ctx.request.ip || ctx.ip || 'unknown',
        method: ctx.request.method,
        body: ctx.request.body
    }
    reportLogs.push(entry)
    if (reportLogs.length > MAX_REPORT_LOGS) reportLogs.shift()
    insertReportLog(entry)
    if (reportLogs.length >= MAX_REPORT_LOGS) trimReportLogs(MAX_REPORT_LOGS)

    // 自动回复规则匹配
    const bodyStr = typeof ctx.request.body === 'string'
        ? ctx.request.body
        : JSON.stringify(ctx.request.body)
    let matched = false
    for (const rule of autoReplyRules) {
        if (!rule.enabled) continue
        try {
            if (new RegExp(rule.pattern).test(bodyStr)) {
                rule.matchCount++
                rule.lastMatch = new Date().toISOString()
                updateAutoReplyRule(rule.id, { matchCount: rule.matchCount, lastMatch: rule.lastMatch })
                global.webSocket.sendToClient(rule.reply)
                console.log(`[AutoReply] 规则"${rule.name}"已匹配，自动回复已发送`)
                matched = true
            }
        } catch (_) { /* 无效正则跳过 */ }
    }

    if (!matched) {
        global.webSocket.sendToClient(ctx.request.body)
    }

    ctx.body = {
        code:0,
        success: true,
        message: `数据接收成功`
    }
})

demoRouter.get('/admin', async (ctx) => {
    const htmlPath = path.join(__dirname, '..', 'views', 'admin.html')
    ctx.type = 'text/html; charset=utf-8'
    ctx.body = fs.readFileSync(htmlPath, 'utf-8')
})

demoRouter.get('/api/clients', async (ctx) => {
    ctx.body = {
        success: true,
        clientCount: global.webSocket ? global.webSocket.getClientCount() : 0
    }
})

demoRouter.post('/api/broadcast', async (ctx) => {
    const count = global.webSocket ? global.webSocket.getClientCount() : 0
    if (count === 0) {
        ctx.body = { success: true, clientCount: 0, message: '当前没有已连接的客户端' }
        return
    }
    global.webSocket.sendToClient(ctx.request.body)
    console.log('[Broadcast] 消息已广播至 ' + count + ' 个客户端:', ctx.request.body)
    ctx.body = { success: true, clientCount: count, message: '广播成功' }
})

// ---- 定时广播 ----

demoRouter.post('/api/timer/start', async (ctx) => {
    const { message, interval } = ctx.request.body
    if (!message) {
        ctx.body = { success: false, message: 'message 不能为空' }
        return
    }
    const messageStr = JSON.stringify(message)
    if (messageStr.length > 64 * 1024) {
        ctx.body = { success: false, message: '消息体不能超过 64KB' }
        return
    }
    if (!interval || interval < 1) {
        ctx.body = { success: false, message: '间隔必须 >= 1 秒' }
        return
    }
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    const timer = global.webSocket.startTimer(message, interval * 1000)
    console.log('[Timer] 定时广播 #' + timer.id + ' 已启动，间隔 ' + interval + 's')
    ctx.body = { success: true, message: '定时广播已启动', timer }
})

demoRouter.post('/api/timer/stop', async (ctx) => {
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    const { id } = ctx.request.body
    if (!id) {
        ctx.body = { success: false, message: 'id 不能为空' }
        return
    }
    const ok = global.webSocket.stopTimer(id)
    if (!ok) {
        ctx.body = { success: false, message: '定时任务不存在或已停止' }
        return
    }
    console.log('[Timer] 定时广播 #' + id + ' 已停止')
    ctx.body = { success: true, message: '定时广播已停止' }
})

demoRouter.post('/api/timer/remove', async (ctx) => {
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    const { id } = ctx.request.body
    if (!id) {
        ctx.body = { success: false, message: 'id 不能为空' }
        return
    }
    const ok = global.webSocket.removeTimer(id)
    if (!ok) {
        ctx.body = { success: false, message: '定时任务不存在' }
        return
    }
    ctx.body = { success: true, message: '定时任务已删除' }
})

demoRouter.get('/api/timer/status', async (ctx) => {
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    ctx.body = { success: true, timers: global.webSocket.getTimers() }
})

// ---- 页面 ----

demoRouter.get('/timer', async (ctx) => {
    const htmlPath = path.join(__dirname, '..', 'views', 'timer.html')
    ctx.type = 'text/html; charset=utf-8'
    ctx.body = fs.readFileSync(htmlPath, 'utf-8')
})

// ---- 首页 ----

demoRouter.get('/', async (ctx) => {
    const htmlPath = path.join(__dirname, '..', 'views', 'index.html')
    ctx.type = 'text/html; charset=utf-8'
    ctx.body = fs.readFileSync(htmlPath, 'utf-8')
})

// ---- 客户端管理 API ----

demoRouter.get('/api/clients/detail', async (ctx) => {
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    ctx.body = { success: true, clients: global.webSocket.getClientsDetail() }
})

demoRouter.post('/api/clients/kick/:id', async (ctx) => {
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    const id = parseInt(ctx.params.id, 10)
    if (!id) {
        ctx.body = { success: false, message: '客户端 ID 无效' }
        return
    }
    const ok = global.webSocket.kickClient(id)
    ctx.body = ok
        ? { success: true, message: `客户端 #${id} 已被踢出` }
        : { success: false, message: `客户端 #${id} 不存在` }
})

demoRouter.post('/api/client/send/:id', async (ctx) => {
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    const id = parseInt(ctx.params.id, 10)
    if (!id) {
        ctx.body = { success: false, message: '客户端 ID 无效' }
        return
    }
    const data = ctx.request.body
    if (!data || Object.keys(data).length === 0) {
        ctx.body = { success: false, message: '消息不能为空' }
        return
    }
    const sent = global.webSocket.sendToClientById(id, data)
    ctx.body = sent
        ? { success: true, message: `消息已发送至客户端 #${id}` }
        : { success: false, message: `客户端 #${id} 不存在或已断开` }
})

// ---- 系统资源 API ----

demoRouter.get('/api/system/stats', async (ctx) => {
    const mem = process.memoryUsage()
    const cpus = os.cpus()
    const loadAvg = os.loadavg()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()

    let cpuUsage = 0
    for (const cpu of cpus) {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0)
        const idle = cpu.times.idle
        cpuUsage += ((total - idle) / total) * 100
    }
    cpuUsage = cpuUsage / cpus.length

    ctx.body = {
        success: true,
        stats: {
            cpu: {
                usagePercent: Math.round(cpuUsage * 100) / 100,
                cores: cpus.length,
                model: cpus[0]?.model || 'unknown',
                loadAvg1m: loadAvg[0],
                loadAvg5m: loadAvg[1],
                loadAvg15m: loadAvg[2]
            },
            memory: {
                heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
                heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
                rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
                externalMB: Math.round(mem.external / 1024 / 1024 * 100) / 100,
                systemTotalMB: Math.round(totalMem / 1024 / 1024 * 100) / 100,
                systemFreeMB: Math.round(freeMem / 1024 / 1024 * 100) / 100,
                systemUsedPercent: Math.round((1 - freeMem / totalMem) * 10000) / 100
            },
            uptime: Math.round(process.uptime())
        }
    }
})

// ---- 消息日志 API ----

demoRouter.get('/api/logs', async (ctx) => {
    if (!global.webSocket) {
        ctx.body = { success: false, message: 'WebSocket 服务未初始化' }
        return
    }
    const limit = parseInt(ctx.query.limit, 10) || 50
    ctx.body = { success: true, logs: global.webSocket.getLogs(Math.min(limit, 200)) }
})

// ---- Report 消息 ----

demoRouter.get('/reports', async (ctx) => {
    const htmlPath = path.join(__dirname, '..', 'views', 'reports.html')
    ctx.type = 'text/html; charset=utf-8'
    ctx.body = fs.readFileSync(htmlPath, 'utf-8')
})

demoRouter.get('/api/reports', async (ctx) => {
    const limit = parseInt(ctx.query.limit, 10) || 50
    ctx.body = {
        success: true,
        total: reportLogs.length,
        reports: reportLogs.slice(-Math.min(limit, 200)).reverse()
    }
})

// ---- 自动回复规则 API ----

demoRouter.get('/api/auto-reply/rules', async (ctx) => {
    ctx.body = { success: true, rules: autoReplyRules }
})

demoRouter.post('/api/auto-reply/rules', async (ctx) => {
    const { name, pattern, reply, enabled } = ctx.request.body
    if (!name || !pattern || !reply) {
        ctx.body = { success: false, message: 'name, pattern, reply 不能为空' }
        return
    }
    if (autoReplyRules.length >= MAX_AUTO_REPLY_RULES) {
        ctx.body = { success: false, message: `规则数量已达上限 ${MAX_AUTO_REPLY_RULES}` }
        return
    }
    try { new RegExp(pattern) } catch (_) {
        ctx.body = { success: false, message: '正则表达式无效' }
        return
    }
    const rule = {
        id: ++_nextRuleId,
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
    ctx.body = { success: true, rule }
})

demoRouter.put('/api/auto-reply/rules/:id', async (ctx) => {
    const id = parseInt(ctx.params.id, 10)
    const rule = autoReplyRules.find(r => r.id === id)
    if (!rule) {
        ctx.body = { success: false, message: '规则不存在' }
        return
    }
    const { name, pattern, reply, enabled } = ctx.request.body
    if (pattern !== undefined) {
        try { new RegExp(pattern) } catch (_) {
            ctx.body = { success: false, message: '正则表达式无效' }
            return
        }
        rule.pattern = pattern
    }
    if (name !== undefined) rule.name = name
    if (reply !== undefined) rule.reply = reply
    if (enabled !== undefined) rule.enabled = enabled
    updateAutoReplyRule(id, { name, pattern, reply, enabled })
    ctx.body = { success: true, rule }
})

demoRouter.delete('/api/auto-reply/rules/:id', async (ctx) => {
    const id = parseInt(ctx.params.id, 10)
    const idx = autoReplyRules.findIndex(r => r.id === id)
    if (idx === -1) {
        ctx.body = { success: false, message: '规则不存在' }
        return
    }
    autoReplyRules.splice(idx, 1)
    deleteAutoReplyRule(id)
    ctx.body = { success: true }
})

demoRouter.post('/api/auto-reply/rules/:id/toggle', async (ctx) => {
    const id = parseInt(ctx.params.id, 10)
    const rule = autoReplyRules.find(r => r.id === id)
    if (!rule) {
        ctx.body = { success: false, message: '规则不存在' }
        return
    }
    rule.enabled = !rule.enabled
    updateAutoReplyRule(id, { enabled: rule.enabled })
    ctx.body = { success: true, rule }
})

export {demoRouter}
