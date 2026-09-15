import { createApp } from 'vue'
// EP 组件由 unplugin-vue-components 按需解析，不再全量注册。
// 全局保留：v-loading 指令 + ElMessage/ElMessageBox 函数式组件样式
import { ElLoading } from 'element-plus'
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
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const app = createApp(App)

app.use(ElLoading)   // v-loading 指令 + 服务

// 注册 Quill 编辑器组件（富文本全局件）
app.component('QuillEditor', QuillEditor)

app.use(router)
app.use(store)
app.mount('#app')