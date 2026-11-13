import {mergeConfig} from 'vite'
import base from './vite.config.js'

// 用普通HTTP测试来源复现生产环境，后端仍使用隔离预览库。
export default mergeConfig(base, {server: {
  host: '127.0.0.1', port: 18098, strictPort: true,
  hmr: false,
  proxy: {'/api': {target: 'http://127.0.0.1:5016', changeOrigin: true, rewrite: path => path.replace(/^\/api/, '')}},
}})
