import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Keep the stable rendering engine independently cacheable from game code.
        manualChunks: { three: ['three'] },
      },
    },
  },
});
