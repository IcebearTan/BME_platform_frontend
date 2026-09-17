import { createApp } from 'vue'
// EP 组件由 unplugin-vue-components 按需解析（模板 el-* + 样式随行），不再 app.use(ElementPlus) 全量注册。
// 三件全局能力保留：v-loading 指令（12 处在用）+ ElMessage/ElMessageBox 函数式组件样式（显式 import 不带样式）
import { ElLoading } from 'element-plus'
import 'element-plus/es/components/loading/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import './styles/main.css'
import '@bme/styles/tokens.css'
import '@bme/styles/backgrounds.css'
import '@bme/styles/article-content.css'
import App from './App.vue'
import router from './router'
import store from './store'
import api from './api'
//import './utils/rem.js';
//import './flexible.js';

// 续期即同步身份（2026-09-17）：store 里的 role/permissions 只在登录时写一次，
// 后台改身份后旧客户端要重新登录才生效；挂上后 401 静默续期时自动拉平
api.setOnRefreshed((identity) => store.commit('patchIdentity', identity))

const app = createApp(App)

app.use(ElLoading)   // v-loading 指令 + 服务
app.use(router)
app.use(store)
app.mount('#app')
