import { WebSocketServer, WebSocket } from 'ws'

const MAX_MESSAGE_SIZE = 64 * 1024 // 64KB
const MAX_CLIENTS = 1000
const MAX_LOG_ENTRIES = 200

let _idCounter = 0

export default class WS {
  constructor () {
    this.ws = null
    this.clients = new Map() // id → {ws, ip, connectedAt}
    this._totalBytesSent = 0
    this._totalSendCount = 0
    this._messageLogs = []
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

      ws.send(JSON.stringify({ type: 'welcome', clientId: id, message: '欢迎连接到 Koa WebSocket 服务器！' }))

      ws.on('message', (message) => {
        const msgStr = message.toString('utf-8')
        console.log(`[WS] 收到消息 来自#${id}: ${msgStr}`)
        this._addLog('receive', { clientId: id, ip, data: msgStr })
        ws.send(JSON.stringify({ type: 'echo', message: `服务器回复: 我收到了你的消息 "${msgStr}"` }))
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
    if (this._messageLogs.length > MAX_LOG_ENTRIES) {
      this._messageLogs.shift()
    }
  }

  getLogs (limit = 50) {
    return this._messageLogs.slice(-limit).reverse()
  }

  // ---- 消息发送 ----

  sendToClient (data) {
    const message = JSON.stringify(data)
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
  }

  // ---- 定时广播 ----

  startTimer (message, intervalMs) {
    if (this._timerId) return false
    this._timerMessage = message
    this._timerIntervalMs = intervalMs
    this._timerStartAt = Date.now()
    this._timerSendCount = 0
    this._timerId = setInterval(() => {
      const count = this.getClientCount()
      if (count > 0) {
        this.sendToClient(message)
        this._timerSendCount++
      }
    }, intervalMs)
    return true
  }

  stopTimer () {
    if (!this._timerId) return false
    clearInterval(this._timerId)
    this._timerId = null
    return true
  }

  getTimerStatus () {
    return {
      active: !!this._timerId,
      message: this._timerMessage || null,
      intervalMs: this._timerIntervalMs || null,
      startAt: this._timerStartAt || null,
      sendCount: this._timerSendCount || 0
    }
  }
}
