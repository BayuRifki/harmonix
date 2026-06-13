import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/main',
      rollupOptions: {
        input: resolve(__dirname, 'electron/main/index.ts'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@electron': resolve(__dirname, 'electron'),
        '@shared': resolve(__dirname, 'src/types'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        input: resolve(__dirname, 'electron/preload/index.ts'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@electron': resolve(__dirname, 'electron'),
        '@shared': resolve(__dirname, 'src/types'),
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react()],
    build: {
      outDir: 'dist',
      // Keep ESM output small per chunk and split the heaviest runtime
      // deps into their own chunks so the entry chunk stays tiny. The
      // long-tail effect is lower initial parse cost AND a smaller
      // post-load working set in the renderer's V8 heap because we
      // don't keep every library's module-level state in one chunk.
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
        output: {
          manualChunks: {
            'framer-motion': ['framer-motion'],
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            zustand: ['zustand'],
          },
        },
      },
    },
    esbuild: {
      target: 'esnext',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
      },
      // lucide-react ships 3,900+ icons through a single barrel
      // `dist/esm/lucide-react.mjs`. We import ~80 icons across the
      // codebase. Vite's trailing-glob prebundle (Vite 5.0+) makes
      // esbuild pre-scan every deep import path in one shot at
      // startup, so we don't pay the 200-800ms cost per cold start
      // as Vite discovers new icons one-by-one. Rollup's tree-shake
      // then drops the unused 3,800+ from the final bundle.
      include: ['lucide-react/dist/esm/icons/*'],
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'src/types'),
      },
    },
  },
});
