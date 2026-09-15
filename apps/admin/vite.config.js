import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Element Plus 按需引入：模板内 el-* 编译期解析（组件 JS + 样式随行），不再全量注册
    Components({ resolvers: [ElementPlusResolver()], dts: false }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173, // 你想要的端口号
  },
  base: "/admin/",
  build: {
    rollupOptions: {
      output: {
        // 功能债 #5 清账：曾用 manualChunks 钉 element-plus 单 vendor 块（全量引入时代的缓存补丁）。
        // 按需引入 + 路由懒加载后此钉反而把所有页面的 EP 并进一个被入口急拉的大块——拆除，
        // 交给 rollup 随消费方 chunk 自然分布（组件按需 + 页面分包本身就带来稳定哈希缓存）
      },
    },
  },
})
