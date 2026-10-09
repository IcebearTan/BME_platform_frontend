<script setup>
import { computed } from 'vue'
import { DewTag } from '@bme/dew-ui'
import { isEducationEmail } from '../../services/accountEmail'
import SsoAccountHelp from './SsoAccountHelp.vue'
const props = defineProps({ currentEmail: { type: String, default: '' } })
const email = computed(() => props.currentEmail.trim())
</script>

<template>
  <div class="account-email" role="group" aria-label="账号邮箱">
    <span class="account-email__value">{{ email || '暂未获取到邮箱' }}</span>
    <DewTag v-if="email" :type="isEducationEmail(email) ? 'success' : 'neutral'" size="sm" round>{{ isEducationEmail(email) ? 'SSO' : '普通邮箱' }}</DewTag>
    <SsoAccountHelp />
  </div>
</template>

<style scoped>
.account-email { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; min-width: 0; }
.account-email__value { color: var(--dew-text-heading); overflow-wrap: anywhere; min-width: 0; }
</style>
