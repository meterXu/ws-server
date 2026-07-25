import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [
    sveltekit(),
    {
      name: 'websocket',
      configureServer(server) {
        import('./src/lib/server/ws.js').then(({ getWS }) => {
          if (server.httpServer) {
            const ws = getWS()
            ws.init(server.httpServer)
            console.log('[WS] WebSocket 已挂载到 Vite dev server')
          }
        })
      }
    }
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer()
      ]
    }
  },
  server: {
    watch: {
      // 白名单策略：仅监听 src/ 和根目录关键配置文件
      // 其他一切（.idea/、node_modules/、data/、build/、.git/、lock 文件等）全部忽略
      ignored: (path) => {
        const cwd = process.cwd()
        const rel = path.startsWith(cwd) ? path.slice(cwd.length) : path
        if (rel.startsWith('/src/') ||
            rel === '/vite.config.js' ||
            rel === '/svelte.config.js' ||
            rel === '/tailwind.config.js' ||
            rel === '/package.json' ||
            rel === '/index.html' ||
            rel === '/.env' ||
            rel.startsWith('/.env.') ||
            rel === '/postcss.config.js') {
          return false // 监听
        }
        return true // 忽略
      }
    }
  },
  optimizeDeps: {
    exclude: ['better-sqlite3']
  }
})
