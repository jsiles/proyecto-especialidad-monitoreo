import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
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
                rewrite: function (path) { return path.replace(/^\/api/, '/api'); },
            },
            '/ws': {
                target: process.env.VITE_WS_URL || 'ws://backend:3000',
                ws: true,
                changeOrigin: true,
            },
        },
    },
});
