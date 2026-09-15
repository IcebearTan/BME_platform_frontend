import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path';
import { readFileSync } from 'fs';

// 读取 package.json 获取版本号
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

// https://vitejs.dev/config/
export default defineConfig({
  base: '/AMEII/',
  plugins: [
    vue(),
    tailwindcss(),
    // Element Plus 按需引入：模板内 el-* 编译期解析（组件 JS + 样式随行），不再全量注册
    Components({ resolvers: [ElementPlusResolver()], dts: false }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),  // 将 '@' 映射到 'src' 目录
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8081, // 你想要的端口号
  },
})