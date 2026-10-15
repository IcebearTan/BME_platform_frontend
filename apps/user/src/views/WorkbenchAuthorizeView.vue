<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { DewCard, DewButton } from '@bme/dew-ui'
import api from '../api'

const route = useRoute()
const busy = ref(false)
const error = ref('')
async function authorize() {
  busy.value = true
  error.value = ''
  try {
    const fields = ['client_id', 'response_type', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'scope']
    const body = Object.fromEntries(fields.map((key) => [key, typeof route.query[key] === 'string' ? route.query[key] : '']))
    const { data } = await api.post('/workbench-sso/authorize', body)
    const target = new URL(data.redirect_url)
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Invalid callback')
    window.location.replace(target.href)
  } catch (e) {
    error.value = e.response?.data?.message || '暂时无法进入工作台，请稍后重试。'
    busy.value = false
  }
}
onMounted(authorize)
</script>

<template>
  <main class="workbench-authorize">
    <DewCard variant="flat">
      <h1>进入内部工作台</h1>
      <p v-if="busy" role="status">正在核验训练营账号与社团身份…</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <DewButton v-if="error" :loading="busy" @click="authorize">重新核验</DewButton>
    </DewCard>
  </main>
</template>

<style scoped>
.workbench-authorize { max-width: 540px; margin: 15vh auto; padding: 24px; }
.workbench-authorize h1 { font-size: 24px; }
.workbench-authorize p { margin: 20px 0; }
</style>
