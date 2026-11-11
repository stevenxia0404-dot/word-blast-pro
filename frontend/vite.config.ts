import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * dev-frame 标注收件通道 —— 仅 dev 生效（apply: 'serve'，生产构建零痕迹）
 *
 * 以前靠 navigator.clipboard 往外送，但内嵌预览是 iframe，剪贴板权限经常被拒，
 * 而且 writeText 是异步的，try/catch 抓不到失败，界面还显示「已复制」的假成功。
 * 现在改成同源 POST 直接落盘：
 *   POST /api/dev-marks  body = Mark[] → .workbuddy/marks.json（最新快照）
 *                                     + .workbuddy/marks.jsonl（每次一行，永不丢）
 * 标完读文件即可，Steven 不用复制粘贴、也不用点任何按钮。
 */
function devMarksReceiver(): Plugin {
  return {
    name: 'wb-dev-marks',
    apply: 'serve',
    configureServer(server) {
      const dir = resolve(server.config.root, '..', '.workbuddy')
      const snap = resolve(dir, 'marks.json')
      const log = resolve(dir, 'marks.jsonl')

      server.middlewares.use('/api/dev-marks', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Content-Type', 'application/json; charset=utf-8')

        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

        if (req.method === 'GET') {
          try {
            res.end(existsSync(snap) ? readFileSync(snap, 'utf8') : JSON.stringify({ marks: [], count: 0 }))
          } catch {
            res.end(JSON.stringify({ marks: [], count: 0 }))
          }
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, error: 'method not allowed' }))
          return
        }

        let raw = ''
        req.on('data', (c: Buffer) => {
          raw += c.toString()
          if (raw.length > 4_000_000) req.destroy()
        })
        req.on('end', () => {
          try {
            const marks = JSON.parse(raw || '[]')
            if (!Array.isArray(marks)) throw new Error('expect an array of marks')
            mkdirSync(dir, { recursive: true })
            const ts = new Date().toISOString()
            writeFileSync(snap, JSON.stringify({ updatedAt: ts, count: marks.length, marks }, null, 2), 'utf8')
            appendFileSync(log, JSON.stringify({ ts, count: marks.length, marks }) + '\n', 'utf8')
            res.end(JSON.stringify({ ok: true, count: marks.length, savedTo: snap }))
          } catch (e) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  server: {
    proxy: {
      // 本地同步 API（wrangler pages dev 起在 8788 时可直连；E2E 用 Playwright 拦截）
      '/sync-api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/sync-api/, '/api/sync'),
      },
    },
  },
  plugins: [
    devMarksReceiver(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Word Blast - 中英单词配对消消乐',
        short_name: 'Word Blast',
        description: '中英单词配对消消乐 - 趣味英语学习PWA',
        theme_color: '#84cc16',
        background_color: '#d9f99d',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icon-180.png', sizes: '180x180', type: 'image/png' },
          { src: 'icon-1024.png', sizes: '1024x1024', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
        // 音频 4MB+ 不进 precache（首屏不下载）；播放过的走 CacheFirst 离线可听
        runtimeCaching: [
          {
            // manifest 在线优先：换词库后能立刻拿到新清单；音频文件名是内容哈希，永远不用失效
            urlPattern: /\/audio\/manifest\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'wb-audio-manifest',
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wb-audio-v1',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
