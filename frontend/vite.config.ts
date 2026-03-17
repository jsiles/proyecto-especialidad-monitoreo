import { defineConfig } from 'vitest/config'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
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

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Development server configuration
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://backend:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/ws': {
        target: process.env.VITE_WS_URL || 'ws://backend:3000',
        ws: true,
        changeOrigin: true,
      },
      '/grafana': {
        target: process.env.VITE_GRAFANA_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    fileParallelism: false,
    // Use 'forks' pool (child_process.fork) instead of 'threads' (worker_threads).
    // Worker threads have a default 128MB heap limit; child processes do not.
    // This prevents "JS heap out of memory" when loading heavy UI modules.
    pool: 'forks',
    maxWorkers: 1,
    execArgv: ['--max-old-space-size=8192'],
    // Recycle the worker before module graphs from UI-heavy tests accumulate indefinitely.
    vmMemoryLimit: '512MB',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
        'src/app/components/ui/**',
      ],
    },
  },
})
