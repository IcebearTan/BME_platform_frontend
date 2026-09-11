import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173, // 你想要的端口号
  },
  base: "/admin/",
  build: {
    rollupOptions: {
      output: {
        // 功能债 #5：EP 全量引入曾把主 chunk 顶到 2.4MB——拆独立 vendor 便于缓存
        // （按需引入属工程化批，此处不动 main.js 的全量注册）
        manualChunks: {
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
        },
      },
    },
  },
})
