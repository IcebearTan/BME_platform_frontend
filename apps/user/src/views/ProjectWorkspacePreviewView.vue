<template>
  <main class="workspace-preview-entry"><h1>项目工作台 · 本地试用</h1><p>选择一个身份进入同一演示营期。可以实际提交、评价和登记成果，数据仅保存在隔离的本地演示库。</p><DewSkeleton v-if="loading" :lines="3" /><p v-else-if="error" role="alert">{{ error }}</p><div v-else class="preview-roles"><DewCard v-for="account in accounts" :key="account.email" no-hover><h2>{{ account.username }}</h2><p>{{ descriptions[account.email] }}</p><DewButton :loading="entering === account.email" :disabled="!!entering" @click="enter(account)">进入工作台</DewButton></DewCard></div><p class="preview-caption">此入口仅开发环境可见。正式平台仍使用正常账号和营期授权。</p></main>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import md5 from 'js-md5'
import api, { session } from '../api'
import { DewCard, DewButton, DewSkeleton } from '@bme/dew-ui'
const store = useStore(), router = useRouter(), accounts = ref([]), loading = ref(true), error = ref(''), entering = ref(null)
const descriptions = {
 'workspace-leader@seed.dev': '负责口琴项目，同时参与另一项目；可评价成员、管理节点计划、登记成果。',
 'workspace-member@seed.dev': '参与两个项目；提交本人材料并查看自己的评价。',
 'workspace-teacher@seed.dev': '查看全营进展、组会和项目材料；项目内容只读。',
 'workspace-dual@seed.dev': '同时担任营期负责人和项目成员，可切换两个有效视角。',
}
onMounted(async () => {
 try { const health = await api.get('/preview/health'); if (!health.data.preview || health.data.database !== 'bme_workspace_preview_20261016') throw Error('本入口仅用于隔离的项目工作台演示环境'); const response = await api.get('/auth/dev_accounts'); accounts.value = (response.data.data?.accounts || []).filter(a => descriptions[a.email]) }
 catch (e) { error.value = e.response?.data?.message || e.message || '本地试用环境未启动' }
 finally { loading.value = false }
})
async function enter(account) {
 entering.value = account.email; error.value = ''
 try { const response = await api.post('/auth/login', { User_Email: account.email, User_Password: md5('12345678') }); session.save(response.data); store.commit('setUser', response.data); const data = await api.get('/camp/sessions'); const camp = data.data.sessions?.find(c => c.name === '项目工作台 · 本地试用'); if (!camp) throw Error('未找到本地试用营期'); await router.push({ path: '/camp', query: { sid: camp.id, preview: 'workspace' } }) }
 catch (e) { error.value = e.response?.data?.message || e.message || '进入失败，请重试' }
 finally { entering.value = null }
}
</script>
<style scoped>
.workspace-preview-entry { max-width: 1060px; margin: 0 auto; padding: 60px 24px; color: var(--dew-text); }.workspace-preview-entry h1 { font-size: 26px; color: var(--dew-text-heading); }.workspace-preview-entry > p { color: var(--dew-text-muted); line-height: 1.8; }.preview-roles { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin: 30px 0; }.preview-roles h2 { font-size: 18px; }.preview-roles p { line-height: 1.7; color: var(--dew-text-muted); min-height: 68px; font-size: 14px; }.preview-caption { font-size: 12px; }
</style>
