<script setup>
// 外校名册认领卡（D3c，规格 5.2）：持邮件邀请令牌进入身份中心时浮现。
// 流程：预览（学校/姓名/掩码邮箱）→ 发码到名册联系邮箱 → 验证 → 进负责人审核。
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api from '../../api'

const emit = defineEmits(['refresh'])
const route = useRoute()
const router = useRouter()

const token = ref('')
const visible = ref(false)
const preview = ref(null)
const code = ref('')
const busy = ref(false)
const done = ref(false)

onMounted(() => {
  const t = route.query.invite
  if (t && typeof t === 'string') {
    token.value = t
    visible.value = true
    loadPreview()
  }
})

const errMsg = (error, fallback) => {
  const m = error?.response?.data?.message
  return (typeof m === 'string' && m) || fallback
}

const loadPreview = async () => {
  busy.value = true
  try {
    // start 端点一步完成预览+发码（邮件令牌页面无草稿态）
    const res = await api({
      url: '/identity/roster/claim', method: 'post', data: { token: token.value },
    })
    if (res.data.code === 200) {
      preview.value = res.data.preview
      ElMessage.success('验证码已发送至名册联系邮箱')
    }
  } catch (error) {
    ElMessage.error(errMsg(error, '邀请无效或已使用，请联系负责人重新发送'))
    close()
  } finally {
    busy.value = false
  }
}

const verify = async () => {
  if (!code.value) {
    ElMessage.warning('请输入邮箱收到的 6 位验证码')
    return
  }
  busy.value = true
  try {
    const res = await api({
      url: '/identity/roster/claim/verify', method: 'post',
      data: { token: token.value, code: code.value },
    })
    if (res.data.code === 200) {
      done.value = true
      ElMessage.success('认领申请已提交，等待负责人审核')
      emit('refresh')
      setTimeout(close, 1600)
    } else {
      ElMessage.error(res.data.message || '验证码错误或已失效')
    }
  } catch (error) {
    ElMessage.error(errMsg(error, '验证失败，请稍后重试'))
  } finally {
    busy.value = false
  }
}

const close = () => {
  visible.value = false
  // 清掉 URL 里的令牌（一次性，防刷新重放提示）
  router.replace({ query: { ...route.query, invite: undefined } })
}
</script>

<template>
  <DewCard v-if="visible" class="claim-card">
    <template #header>
      <div class="claim-header">
        <span>外校身份认领邀请</span>
        <el-button link size="small" @click="close">关闭</el-button>
      </div>
    </template>
    <template v-if="!done && preview">
      <div class="claim-info">
        <div>学校：{{ preview.school }}</div>
        <div>姓名：{{ preview.name }}</div>
        <div>联系邮箱：{{ preview.contact_masked }}（验证码已发送）</div>
      </div>
      <div class="claim-line">
        <el-input v-model="code" placeholder="6 位验证码" maxlength="6"
                  class="code-input" @keyup.enter="verify" />
        <el-button type="primary" :loading="busy" @click="verify">验证并提交认领</el-button>
        <el-button :loading="busy" @click="loadPreview">重新发送</el-button>
      </div>
      <p class="claim-note">验证码发到名册登记的联系邮箱——只有邮箱本人能完成认领；
        提交后由负责人核对名册批准。</p>
    </template>
    <el-result v-else-if="done" icon="success" title="认领申请已提交"
               sub-title="等待负责人审核，结果将在通知中心告知。" />
  </DewCard>
</template>

<style scoped>
.claim-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
.claim-info { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; font-size: 14px; }
.claim-line { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.code-input { width: 140px; }
.claim-note { color: var(--dew-text-muted, #94a3b8); font-size: 12px; margin-top: 10px; }
</style>
