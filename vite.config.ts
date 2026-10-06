import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// BASE_PATH wird beim Deployment auf GitHub Pages gesetzt (z. B. /blackjack-trainer/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Blackjack Basic Strategy Trainer',
        short_name: 'BJ Trainer',
        description: 'Lerne die Blackjack Basic Strategy spielerisch – mit Erklärung, warum jeder Zug richtig ist.',
        lang: 'de',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a141c',
        theme_color: '#0a141c',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
