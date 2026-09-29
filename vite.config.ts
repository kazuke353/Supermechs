/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` produces a normal multi-file build for GitHub Pages.
// `npm run build:single` inlines everything into one self-contained index.html.
// `--mode artifact` is the single-file build for sandboxed embeds, where
// peer-to-peer connections are blocked, so online duels are switched off.
export default defineConfig(({ mode }) => {
  const single = mode === 'single' || mode === 'artifact'
  return {
    base: './',
    plugins: [preact(), ...(single ? [viteSingleFile()] : [])],
    define: {
      'import.meta.env.VITE_EMBED': JSON.stringify(mode === 'artifact' ? '1' : ''),
    },
    build: {
      outDir: mode === 'artifact' ? 'dist-artifact' : single ? 'dist-single' : 'dist',
      target: 'es2020',
      chunkSizeWarningLimit: 2000,
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  }
})
