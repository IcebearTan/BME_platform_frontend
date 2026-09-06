<!-- 偏好设置：通知等开关类偏好。与「个人资料」的表单编辑分离，
     这里的设置项均为切换即时生效，不依赖保存按钮 -->
<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DewCard, DewSwitch } from '@bme/dew-ui'
import api from '../../api';

// ── 邮件通知开关 ──
const emailNotify = ref(true)
const loading = ref(true)
const postingEmailPref = ref(false)

const fetchEmailPref = async () => {
  try {
    const res = await api({ url: '/notification/email_pref', method: 'get' })
    if (res.data.code === 200) {
      emailNotify.value = !!res.data.data.email_notify_enabled
    }
  } catch (e) {
    // 读取失败保持默认开启，切换时会再走保存接口兜底
  } finally {
    loading.value = false
  }
}
fetchEmailPref()

const onEmailPrefChange = async (val) => {
  if (postingEmailPref.value) {
    emailNotify.value = !val  // 上一请求未完成，先回弹避免状态漂移
    return
  }
  postingEmailPref.value = true
  try {
    const res = await api({
      url: '/notification/email_pref',
      method: 'post',
      data: { enabled: val },
    })
    if (res.data.code === 200) {
      ElMessage.success(val ? '已开启邮件通知' : '已关闭邮件通知')
    } else {
      emailNotify.value = !val
      ElMessage.error('邮件通知设置保存失败')
    }
  } catch (e) {
    emailNotify.value = !val
    ElMessage.error('邮件通知设置保存失败')
  } finally {
    postingEmailPref.value = false
  }
}
</script>

<template>
  <div class="uc-settings">
    <DewCard
      size="lg"
      divided
      class="settings-card"
      v-loading="loading"
      element-loading-background="transparent"
      :delay="0"
    >
      <template #header>通知</template>

      <div class="pref-row">
        <div class="pref-info">
          <div class="pref-title">接收邮件通知</div>
          <div class="pref-desc">包括每日出勤汇总、通知公告等系统邮件；登录验证码不受影响</div>
        </div>
        <DewSwitch v-model="emailNotify" @change="onEmailPrefChange" />
      </div>
    </DewCard>
  </div>
</template>

<style scoped>
.uc-settings {
  width: 100%;
}

.settings-card {
  width: 100%;
}

/* 单条偏好：左文案右开关；后续新增的偏好沿用 .pref-row 逐行排 */
.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0;
}

.pref-row + .pref-row {
  border-top: 1px solid var(--dew-card-divider);
}

.pref-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

.pref-desc {
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dew-text-faint);
}
</style>
