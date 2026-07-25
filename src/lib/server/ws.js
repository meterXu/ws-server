import { WebSocketServer, WebSocket } from 'ws'
import {
  loadMessageLogs, insertMessageLog, trimMessageLogs,
  loadTimerConfigs, insertTimerConfig, updateTimerSendCount, deleteTimerConfig,
  loadStats, saveStats, getKV, setKV,
  loadAutoReplyRules, insertAutoReplyRule, updateAutoReplyRule, deleteAutoReplyRule,
  loadReportLogs, insertReportLog, trimReportLogs
} from './db.js'

const MAX_MESSAGE_SIZE = 64 * 1024 // 64KB
const MAX_CLIENTS = 1000
const MAX_LOG_ENTRIES = 200
const MAX_REPORT_LOGS = 200
const MAX_AUTO_REPLY_RULES = 50

let _idCounter = 0

// ---- Shared state (globalThis 确保源模块与编译模块共享同一份数据) ----

function initSharedState() {
  if (!globalThis.__sharedState) {
    const rules = loadAutoReplyRules()
    globalThis.__sharedState = {
      reportLogs: loadReportLogs(),
      autoReplyRules: rules,
      _nextRuleId: rules.length > 0 ? Math.max(...rules.map(r => r.id)) : 0
    }
  }
  return globalThis.__sharedState
}

const _state = initSharedState()

/** @type {Array} */
export const reportLogs = _state.reportLogs

/** @type {Array} */
export const autoReplyRules = _state.autoReplyRules

export function getNextRuleId() {
  return ++_state._nextRuleId
}

export class WS {
  constructor () {
    this.ws = null
    this.clients = new Map() // id → {ws, ip, connectedAt}

    // 从 DB 恢复持久化数据
    this._messageLogs = loadMessageLogs()
    const stats = loadStats()
    this._totalBytesSent = stats.totalBytesSent
    this._totalSendCount = stats.totalSendCount

    this._nextTimerId = 0
    this.timers = new Map()
    this._loadTimers()
  }

  _loadTimers () {
    const configs = loadTimerConfigs()
    for (const cfg of configs) {
      // 恢复定时器: 服务器重启后重新启动 interval
      cfg.handle = setInterval(() => {
        const count = this.getClientCount()
        if (count > 0) {
          this.sendToClient(cfg.message)
          cfg.sendCount++
          updateTimerSendCount(cfg.id, cfg.sendCount)
        }
      }, cfg.intervalMs)
      this.timers.set(cfg.id, cfg)
      console.log(`[Timer] 已恢复定时器 #${cfg.id}，间隔 ${cfg.intervalMs}ms`)
    }
    const maxLoaded = configs.length > 0 ? Math.max(...configs.map(c => c.id)) : 0
    const storedNext = parseInt(getKV('_nextTimerId', '0'), 10)
    this._nextTimerId = Math.max(maxLoaded, storedNext)
  }

  init (server) {
    this.ws = new WebSocketServer({ server, path: '/ws' })
    this.ws.on('connection', (ws, req) => {
      const ip = req.socket.remoteAddress
      if (this.clients.size >= MAX_CLIENTS) {
        console.warn(`[WS] 连接数已达上限 ${MAX_CLIENTS}，拒绝 ${ip}`)
        ws.close(1013, '服务器连接数已达上限')
        return
      }
      const id = ++_idCounter
      const now = new Date().toISOString()
      ws._clientId = id
      this.clients.set(id, { ws, ip, connectedAt: now })
      console.log(`[WS] 客户端已连接 #${id}，IP: ${ip}，当前连接数: ${this.clients.size}`)

      ws.send(JSON.stringify({ type: 'welcome', clientId: id, message: '欢迎连接到 WebSocket 服务器！' }))

      ws.on('message', (message) => {
        const msgStr = message.toString('utf-8')
        console.log(`[WS] 收到消息 来自#${id}: ${msgStr}`)
        this._addLog('receive', { clientId: id, ip, data: msgStr })

        // 自动回复规则匹配
        let matched = false
        for (const rule of autoReplyRules) {
          if (!rule.enabled) continue
          try {
            if (new RegExp(rule.pattern).test(msgStr)) {
              rule.matchCount++
              rule.lastMatch = new Date().toISOString()
              updateAutoReplyRule(rule.id, { matchCount: rule.matchCount, lastMatch: rule.lastMatch })
              this.sendToClient(rule.reply)
              console.log(`[AutoReply] 规则"${rule.name}"已匹配，自动回复已发送`)
              matched = true
            }
          } catch (_) { /* 无效正则跳过 */ }
        }

        if (!matched) {
          this.sendToClient({ type: 'ws-message', clientId: id, data: msgStr })
        }
      })

      ws.on('close', () => {
        console.log(`[WS] 客户端已断开连接 #${id}`)
        this.clients.delete(id)
      })

      ws.on('error', (err) => {
        console.error(`[WS] 发生错误 #${id}:`, err)
        this.clients.delete(id)
      })
    })
  }

  // ---- 客户端管理 ----

  getClientCount () {
    let count = 0
    for (const { ws } of this.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) count++
    }
    return count
  }

  getClientsDetail () {
    const list = []
    for (const [id, { ws, ip, connectedAt }] of this.clients) {
      list.push({
        id,
        ip,
        connectedAt,
        isOpen: ws.readyState === WebSocket.OPEN,
        readyState: ws.readyState
      })
    }
    return list
  }

  kickClient (id) {
    const entry = this.clients.get(id)
    if (!entry) return false
    console.log(`[WS] 踢出客户端 #${id}，IP: ${entry.ip}`)
    entry.ws.close(1000, '已被管理员踢出')
    this.clients.delete(id)
    return true
  }

  // ---- 消息日志 ----

  _addLog (type, detail) {
    const entry = { time: new Date().toISOString(), type, ...detail }
    this._messageLogs.push(entry)
    // 保持内存中日志数量不超过上限
    while (this._messageLogs.length > MAX_LOG_ENTRIES) {
      this._messageLogs.shift()
    }
    // 持久化写入 + 始终裁剪 DB，防止无限增长
    insertMessageLog(entry)
    trimMessageLogs(MAX_LOG_ENTRIES)
  }

  getLogs (limit = 50) {
    return this._messageLogs.slice(-limit).reverse()
  }

  // ---- 消息发送 ----

  _normalizeMessage (data) {
    // 如果 data 已经是字符串则直接使用，否则 JSON.stringify
    // 避免对 auto-reply rule.reply 等已有 JSON 字符串做双重编码
    if (typeof data === 'string') return data
    return JSON.stringify(data)
  }

  sendToClient (data) {
    const message = this._normalizeMessage(data)
    if (message.length > MAX_MESSAGE_SIZE) {
      console.warn(`[WS] 消息过大被拒绝: ${message.length} bytes (上限 ${MAX_MESSAGE_SIZE} bytes)`)
      return
    }
    let sent = 0
    for (const { ws } of this.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
        sent++
      }
    }
    const totalBytes = message.length * sent
    this._totalBytesSent += totalBytes
    this._totalSendCount++
    this._addLog('send', { data: data, clientCount: sent, bytes: totalBytes })
    if (this._totalSendCount % 100 === 0) {
      console.log(`[WS] 统计: 已发送 ${this._totalSendCount} 次, 累计 ${(this._totalBytesSent / 1024 / 1024).toFixed(2)} MB`)
    }
    saveStats(this._totalBytesSent, this._totalSendCount)
  }

  sendToClientById (id, data) {
    const client = this.clients.get(id)
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false
    }
    const message = this._normalizeMessage(data)
    if (message.length > MAX_MESSAGE_SIZE) {
      console.warn(`[WS] 消息过大被拒绝: ${message.length} bytes (上限 ${MAX_MESSAGE_SIZE} bytes)`)
      return false
    }
    client.ws.send(message)
    this._totalBytesSent += message.length
    this._totalSendCount++
    this._addLog('send', { clientId: id, ip: client.ip, data: data, bytes: message.length })
    saveStats(this._totalBytesSent, this._totalSendCount)
    return true
  }

  // ---- 定时广播 ----

  startTimer (message, intervalMs) {
    const id = ++this._nextTimerId
    setKV('_nextTimerId', String(this._nextTimerId))
    const entry = { id, message, intervalMs, startAt: Date.now(), sendCount: 0, handle: null }
    entry.handle = setInterval(() => {
      const count = this.getClientCount()
      if (count > 0) {
        this.sendToClient(message)
        entry.sendCount++
        updateTimerSendCount(id, entry.sendCount)
      }
    }, intervalMs)
    this.timers.set(id, entry)
    insertTimerConfig(entry)
    return { id, message, intervalMs, startAt: entry.startAt, sendCount: 0, active: true }
  }

  stopTimer (id) {
    const entry = this.timers.get(id)
    if (!entry || !entry.handle) return false
    clearInterval(entry.handle)
    entry.handle = null
    return true
  }

  removeTimer (id) {
    const entry = this.timers.get(id)
    if (!entry) return true
    if (entry.handle) clearInterval(entry.handle)
    this.timers.delete(id)
    deleteTimerConfig(id)
    return true
  }

  getTimers () {
    const list = []
    for (const t of this.timers.values()) {
      list.push({
        id: t.id,
        message: t.message,
        intervalMs: t.intervalMs,
        startAt: t.startAt,
        sendCount: t.sendCount,
        active: t.handle !== null
      })
    }
    return list
  }
}

// ---- 单例 (globalThis 确保跨模块缓存共享) ----

/**
 * @returns {WS}
 */
export function getWS () {
  if (!globalThis.__wsInstance) {
    globalThis.__wsInstance = new WS()
  }
  return globalThis.__wsInstance
}
