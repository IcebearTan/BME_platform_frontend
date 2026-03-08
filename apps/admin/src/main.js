import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// import { createApp } from 'vue'
import './styles/variables.css'
import './styles/global.css'
import App from './App.vue'
import router from './router'
import store from './store'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

// 注册 Quill 编辑器组件
app.component('QuillEditor', QuillEditor)

app.use(router)
app.use(store)
app.use(ElementPlus)
app.mount('#app')