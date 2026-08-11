/**
 * 生产模式入口 — 单端口运行 SvelteKit + WebSocket。
 * 替代 adapter-node 默认的 build/index.js。
 */
import 'dotenv/config'
import { createServer } from 'http'
import { handler } from './build/handler.js'
import { getWS } from './src/lib/server/ws.js'

const PORT = process.env.PORT || 3000

const server = createServer((req, res) => {
  // WebSocket 升级由 ws 库自动处理（已挂载到 server），其余交给 SvelteKit
  handler(req, res, (err) => {
    if (err) {
      console.error('[Server] handler error:', err)
      res.writeHead(500)
      res.end('Internal Server Error')
    }
  })
})

// 挂载 WebSocket
const ws = getWS()
ws.init(server)
console.log('[WS] WebSocket 已挂载到 /ws')

server.listen(PORT, () => {
  console.log(`[Server] Running at http://localhost:${PORT}`)
})
