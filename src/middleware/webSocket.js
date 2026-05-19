import { WebSocketServer, WebSocket } from 'ws'

export default class WS {
  constructor () {
    this.ws = null
    this.clients = new Set()
  }

  init (server) {
    this.ws = new WebSocketServer({ server, path: '/ws' })
    this.ws.on('connection', (ws, req) => {
      const ip = req.socket.remoteAddress
      console.log(`[WS] 客户端已连接，IP: ${ip}`)
      this.clients.add(ws)

      ws.send('欢迎连接到 Koa WebSocket 服务器！')

      ws.on('message', (message) => {
        const msgStr = message.toString('utf-8')
        console.log(`[WS] 收到消息: ${msgStr}`)

        ws.send(`服务器回复: 我收到了你的消息 "${msgStr}"`)
      })

      ws.on('close', () => {
        console.log(`[WS] 客户端已断开连接`)
        this.clients.delete(ws)
      })

      ws.on('error', (err) => {
        console.error(`[WS] 发生错误:`, err)
        this.clients.delete(ws)
      })
    })
  }

  getClientCount () {
    let count = 0
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) count++
    }
    return count
  }

  sendToClient (data) {
    const message = JSON.stringify(data)
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  }

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
