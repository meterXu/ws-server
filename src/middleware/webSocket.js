import { WebSocketServer, WebSocket } from 'ws'

export default class WS {
  constructor () {
    this.ws = null
  }

  init (server) {
    this.ws = new WebSocketServer({ server, path: '/ws' })
    this.ws.on('connection', (ws, req) => {
      const ip = req.socket.remoteAddress
      console.log(`[WS] 客户端已连接，IP: ${ip}`)
      this.ws.client = ws
      // 发送欢迎消息给客户端
      ws.send('欢迎连接到 Koa WebSocket 服务器！')

      // 监听客户端发来的消息
      ws.on('message', (message) => {
        // ws 接收到的 message 默认是 Buffer，如果是文本需要转为字符串
        const msgStr = message.toString('utf-8')
        console.log(`[WS] 收到消息: ${msgStr}`)

        // 回声测试：将收到的消息加上前缀发回去
        ws.send(`服务器回复: 我收到了你的消息 "${msgStr}"`)
      })

      // 监听连接断开事件
      ws.on('close', () => {
        console.log(`[WS] 客户端已断开连接`)
        this.ws.client = null
      })

      // 监听错误事件
      ws.on('error', (err) => {
        console.error(`[WS] 发生错误:`, err)
        this.ws.client = null
      })
    })
  }

  sendToClient (data) {
    if (!this.ws.client) return
    this.ws.client.send(JSON.stringify(data))
  }
}
