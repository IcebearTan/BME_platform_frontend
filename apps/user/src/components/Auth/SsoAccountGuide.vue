<script setup>
import { computed, ref, watch, onScopeDispose } from 'vue'
import { DewTag } from '@bme/dew-ui'
import api from '../../api'
import SsoAccountHelp from './SsoAccountHelp.vue'
const props = defineProps({ currentEmail: { type: String, default: '' } })
const email = computed(() => props.currentEmail.trim())
const eligibility = ref(null)
const checking = ref(false)
let requestVersion = 0
watch(email, async (value) => {
  const version = ++requestVersion
  eligibility.value = null
  checking.value = !!value
  if (!value) return
  try {
    const { data } = await api({ url: '/points-sso/eligibility', method: 'get' })
    if (version === requestVersion && data?.code === 200 && typeof data.eligible === 'boolean') {
      eligibility.value = data
    }
  } catch {
    // 旧后端或网络异常时保留未知态，不能用邮箱后缀冒充已确认资格。
  } finally {
    if (version === requestVersion) checking.value = false
  }
}, { immediate: true })
onScopeDispose(() => { requestVersion++ })
const badge = computed(() => checking.value ? 'SSO 查询中' : eligibility.value === null
  ? 'SSO 状态待确认' : eligibility.value.eligible ? 'SSO' : '未开通 SSO')
</script>

<template>
  <div class="account-email" role="group" aria-label="账号邮箱">
    <span class="account-email__value">{{ email || '暂未获取到邮箱' }}</span>
    <DewTag v-if="email" :type="eligibility?.eligible ? 'success' : 'neutral'" size="sm" round :title="eligibility?.message">{{ badge }}</DewTag>
    <SsoAccountHelp />
  </div>
</template>

<style scoped>
.account-email { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; min-width: 0; }
.account-email__value { color: var(--dew-text-heading); overflow-wrap: anywhere; min-width: 0; }
</style>
