import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      // Required for SharedArrayBuffer and AudioWorklet cross-origin isolation
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  // Serve alphaTab static assets (fonts, workers, soundfonts) without processing
  assetsInclude: ['**/*.sf2', '**/*.sf3', '**/*.woff', '**/*.woff2'],
  optimizeDeps: {
    // pitchy is ESM-only; alphaTab uses dynamic imports internally
    include: ['pitchy'],
    exclude: ['@coderline/alphatab'],
  },
})
