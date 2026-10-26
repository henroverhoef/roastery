import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Shown in Settings ("Version 44b8d9e · 16 Oct"), so it's easy to see whether a phone has
// the latest app. Vercel provides the commit; locally we ask git.
function appVersion(): string {
  let commit = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  if (!commit) {
    try { commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { commit = 'dev' }
  }
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Johannesburg' })
  return `${commit.slice(0, 7)} · ${date}`
}
process.env.VITE_APP_VERSION = appVersion()

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        id: 'roastery-app',
        name: 'Roastery',
        short_name: 'Roastery',
        description: 'Roast log and coach for the Gene Café CBR-101',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1c1917',
        theme_color: '#1c1917',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: '/index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
})
