import { createApp } from 'vue'
// EP 组件由 unplugin-vue-components 按需解析，不再全量注册。
// 全局保留：v-loading 指令 + ElMessage/ElMessageBox 函数式 API 及其样式
// （Options API 组件用 this.$message / this.$confirm，按需引入后不会自动挂载，须手动注册）
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/es/components/loading/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
// import { createApp } from 'vue'
import '@bme/styles/tokens.css'
import '@bme/styles/article-content.css'
import './styles/variables.css'
import './styles/global.css'
import './styles/pages.css'
import App from './App.vue'
import router from './router'
import store from './store'
import api from './api'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

// 续期即同步身份（2026-09-17）：store 里的 role/permissions 只在登录时写一次，
// 后台改身份后旧客户端要重新登录才生效；挂上后 401 静默续期时自动拉平
api.setOnRefreshed((identity) => store.commit('patchIdentity', identity))

const app = createApp(App)

app.use(ElLoading)   // v-loading 指令 + 服务

// 函数式 API 挂回全局：否则 this.$confirm 点退出无反应、this.$message 在跳转前抛错把登录卡死
app.config.globalProperties.$message = ElMessage
app.config.globalProperties.$confirm = ElMessageBox.confirm
app.config.globalProperties.$alert = ElMessageBox.alert
app.config.globalProperties.$prompt = ElMessageBox.prompt

// 注册 Quill 编辑器组件（富文本全局件）
app.component('QuillEditor', QuillEditor)

app.use(router)
app.use(store)
app.mount('#app')