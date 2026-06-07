import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
      },
    }),
  ],
})
