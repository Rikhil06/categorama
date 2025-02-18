import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'
import { VitePluginRadar } from 'vite-plugin-radar'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    Sitemap({hostname: 'https://categorama.co.uk/'}),
    VitePluginRadar({ 
      analytics: { id: 'G-4QM1632KQ0', },
      gtm: { id: 'GTM-WBM2FVZN', }
    }),
  ],
  build: {
    target: "es2022"
  },
  esbuild: {
    target: "es2022"
  },
  optimizeDeps:{
    esbuildOptions: {
      target: "es2022",
    }
  }
})
