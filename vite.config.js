import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { getWS } from './src/lib/server/ws.js'

export default defineConfig({
  plugins: [
    sveltekit(),
    {
      name: 'websocket',
      configureServer (server) {
        // 在 Vite dev server 上挂载 WebSocket
        if (server.httpServer) {
          const ws = getWS()
          ws.init(server.httpServer)
          console.log('[WS] WebSocket 已挂载到 Vite dev server')
        }
      }
    }
  ]
})
