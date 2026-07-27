import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: true,   // bind to 0.0.0.0 so LAN IP works
    port: 5173,
    allowedHosts: ['billvyapp.com', 'www.billvyapp.com', 'app.billvyapp.com', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // Ensure auth cookies from the API stick on the Vite origin (LAN IP / domain).
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const raw = proxyRes.headers['set-cookie']
            if (!raw) return
            const cookies = Array.isArray(raw) ? raw : [raw]
            proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
              cookie
                .replace(/;\s*Secure/gi, '')
                .replace(/;\s*Domain=[^;]*/gi, '')
                .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
                // Legacy path broke refresh through some proxies — normalize to /api
                .replace(/;\s*Path=\/api\/auth/gi, '; Path=/api'),
            )
          })
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
