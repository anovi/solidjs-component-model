import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SolidComponentModel',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'solid-js',
        'solid-js/store',
        'rxjs',
      ],
    },
  },
});