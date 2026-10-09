<script setup>
import { ref } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { EDUCATION_EMAIL_DOMAINS } from '../../services/accountEmail'

const detailsOpen = ref(false)
</script>

<template>
  <el-popover v-model:visible="detailsOpen" trigger="click" placement="bottom" :width="300" :show-arrow="false" popper-class="sso-account-popover">
    <template #reference>
      <button type="button" class="sso-account-help" aria-label="了解 SSO 与积分商城" @keyup.enter.stop @keyup.space.stop @keydown.esc.stop="detailsOpen = false">
        <el-icon aria-hidden="true"><QuestionFilled /></el-icon>
      </button>
    </template>
    <div class="sso-account-details" role="region" aria-label="SSO 与积分商城说明" @keydown.esc="detailsOpen = false">
      <h3>SSO 与积分商城</h3>
      <p>使用以下中大教育邮箱完成注册后，账号会自动显示 SSO 标识：</p>
      <ul aria-label="支持的教育邮箱后缀"><li v-for="domain in EDUCATION_EMAIL_DOMAINS" :key="domain">@{{ domain }}</li></ul>
      <p><strong>如何进入商城？</strong><br>从「服务台 → 积分商城」进入，无需重复输入商城密码。首次进入时，系统自动创建或关联积分中心账号。</p>
      <p><strong>普通邮箱可以使用吗？</strong><br>普通邮箱可正常使用训练营，暂不支持通过 SSO 进入积分商城。</p>
      <p class="sso-account-note">SSO 标识表示邮箱后缀符合要求，进入商城时仍需校验账号状态与关联关系。如遇账号关联冲突或账号停用，请联系管理员处理。</p>
    </div>
  </el-popover>
</template>

<style scoped>
.sso-account-help { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--dew-text-muted); font-size: 15px; cursor: pointer; }
.sso-account-help:hover { color: var(--dew-text-heading); }
.sso-account-help:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.sso-account-details { color: var(--dew-text); font-size: 12px; line-height: 1.7; }
.sso-account-details h3 { margin: 0; color: var(--dew-text-heading); font-size: 13px; }
.sso-account-details p { margin: 10px 0 0; }
.sso-account-details ul { margin: 10px 0 0; padding: 0; list-style: none; }
.sso-account-details .sso-account-note { padding-top: 10px; border-top: 1px solid var(--dew-card-divider); }
:global(.sso-account-popover.el-popper) { max-width: calc(100vw - 32px); background: var(--dew-card-bg); border: 1px solid var(--dew-card-border); border-radius: var(--radius-lg); box-shadow: var(--dew-card-shadow); color: var(--dew-text); -webkit-backdrop-filter: blur(40px) saturate(180%); backdrop-filter: blur(40px) saturate(180%); }
</style>
