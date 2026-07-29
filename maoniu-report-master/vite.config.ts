import react from '@vitejs/plugin-react';
import { join } from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 8888,
    proxy: {
      '^/api': {
        target: 'http://192.168.5.123:8761',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
    },
  },
  build: {
    // rollup 配置
    rollupOptions: {
      output: {
        manualChunks(id: any): string {
          // // 最小化拆分包
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        },
      },
    },
  },
});
