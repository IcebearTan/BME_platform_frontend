<script setup>
import { computed } from 'vue'
import { Connection } from '@element-plus/icons-vue'
import { DewTag } from '@bme/dew-ui'

const props = defineProps({
  showAccount: { type: Boolean, default: false },
  currentEmail: { type: String, default: '' },
})

const email = computed(() => props.currentEmail.trim())
const isEducationEmail = computed(() => /^[A-Za-z0-9._+-]+@mail(?:2)?\.sysu\.edu\.cn$/i.test(email.value))
const platforms = ['训练营', 'BME_notebook', '积分商城']
</script>

<template>
  <section class="sso-guide" aria-label="统一账号（SSO）说明">
    <div class="sso-guide__heading">
      <el-icon aria-hidden="true"><Connection /></el-icon>
      <h3>统一账号（SSO）</h3>
    </div>

    <dl v-if="showAccount" class="sso-guide__account">
      <dt>当前登录邮箱</dt>
      <dd>
        <span class="sso-guide__email">{{ email || '暂未获取到邮箱' }}</span>
        <DewTag v-if="email" type="info" size="sm" round>
          {{ isEducationEmail ? '教育邮箱' : '普通邮箱' }}
        </DewTag>
      </dd>
    </dl>

    <p>使用同一个已认证的教育邮箱，可登录训练营及其他已接入统一账号体系的平台。</p>
    <ul class="sso-guide__platforms" aria-label="统一账号平台示例">
      <li v-for="platform in platforms" :key="platform"><DewTag type="info" size="sm" round>{{ platform }}</DewTag></li>
    </ul>

    <p v-if="showAccount && email && !isEducationEmail">
      当前登录邮箱为普通邮箱，统一账号请使用已认证的中大教育邮箱。
      如需核对多个账号，请联系平台管理员。
    </p>
    <p v-else>请在各平台使用相同的中大教育邮箱。进入积分商城时，可通过 SSO 免重复登录。</p>

    <ul class="sso-guide__domains" aria-label="支持的教育邮箱后缀">
      <li>@mail2.sysu.edu.cn</li>
      <li>@mail.sysu.edu.cn</li>
    </ul>
    <p class="sso-guide__note">登录训练营时，请填写本平台密码。各平台的访问权限由对应平台决定。</p>
  </section>
</template>

<style scoped>
.sso-guide {
  padding: 16px;
  border: 1px solid var(--dew-btn-border);
  border-radius: var(--radius-lg);
  color: var(--dew-text-muted);
  font-size: 12px;
  line-height: 1.7;
}

.sso-guide__heading {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--dew-text-heading);
}

.sso-guide__heading h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.sso-guide p {
  margin: 10px 0 0;
}

.sso-guide__account {
  margin: 12px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dew-card-divider);
}

.sso-guide__account dd {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 0;
  color: var(--dew-text-heading);
}

.sso-guide__email {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 600;
}

.sso-guide__platforms,
.sso-guide__domains {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.sso-guide__domains {
  color: var(--dew-text);
}

.sso-guide .sso-guide__note {
  padding-top: 10px;
  border-top: 1px solid var(--dew-card-divider);
}

.sso-guide a {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
