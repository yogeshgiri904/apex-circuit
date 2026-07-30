import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Keep the stable rendering engine independently cacheable from game code.
        manualChunks: { three: ['three'] },
      },
    },
  },
});
