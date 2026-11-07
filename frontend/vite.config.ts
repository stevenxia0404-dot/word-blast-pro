import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // dev-frame 标注器收件通道：同源 /api/dev-marks → 本机收件服务（仅 dev 生效，生产构建不受影响）
  server: {
    proxy: {
      '/api/dev-marks': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api\/dev-marks/, '/marks'),
      },
    },
  },
  plugins: [
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
