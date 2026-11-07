import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CantiereSafe',
        short_name: 'CantiereSafe',
        description: 'Workplace safety inspections',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
  },
})
