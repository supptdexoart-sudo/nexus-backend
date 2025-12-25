
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Načteme env proměnné, abychom je mohli použít v definici
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './', // Důležité pro GitHub Pages (relativní cesty)
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      // Optimalizace obrázků během buildu
      ViteImageOptimizer({
        test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
        exclude: undefined,
        include: undefined,
        includePublic: true,
        logStats: true,
        svg: {
          multipass: true,
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  cleanupNumericValues: false,
                  removeViewBox: false, // Důležité pro škálování ikon
                  noSpaceAfterFlags: false,
                },
              },
            },
            'sortAttrs',
            {
              name: 'addAttributesToSVGElement',
              params: {
                attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
              },
            },
          ],
        },
        png: { quality: 80 },
        jpeg: { quality: 80 },
        jpg: { quality: 80 },
        webp: { lossless: true },
      }),
      // Gzip komprese výsledných souborů
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
        deleteOriginFile: false,
      })
    ],
    define: {
      // Polyfill pro process.env, aby knihovny jako @google/genai nepadaly
      // Zároveň bezpečně předáme API klíč, pokud existuje v systému (GitHub Secrets)
      'process.env': {
         API_KEY: JSON.stringify(env.API_KEY || env.VITE_API_KEY || ''),
         NODE_ENV: JSON.stringify(mode)
      }
    },
    esbuild: {
      // V produkci odstraníme console.logy pro čistší výkon
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      outDir: 'dist',
      minify: 'esbuild',
      rollupOptions: {
        external: ['html5-qrcode'],
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          manualChunks: {
            vendor: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
            utils: ['@google/genai', '@react-oauth/google']
          }
        },
      },
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000,
    },
  };
});
