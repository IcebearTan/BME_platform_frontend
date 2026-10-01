<script setup>
// 身份核验向导（D4）：草稿 → 邮箱验证码 → 提交审核。验证码只存运行内存，
// 不写 localStorage/Vuex/URL（规格 12.1）。
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../../api'

const props = defineProps({
  schools: { type: Array, default: () => [] },
  applications: { type: Array, default: () => [] },
  enabled: { type: Boolean, default: false },
})
const emit = defineEmits(['refresh'])

const form = ref({ school_id: '', claimed_name: '', claimed_identifier: '', contact_email: '' })
const code = ref('')
const sending = ref(false)
const verifying = ref(false)
const submitting = ref(false)
const countdown = ref(0)
let timer = null

// 进行中的草稿（服务端同校唯一活跃申请：draft 阶段可改）
const activeDraft = computed(() =>
  props.applications.find(a => a.status === 'draft'))
const reviewPending = computed(() =>
  props.applications.find(a => ['submitted', 'reviewing'].includes(a.status)))

const STATUS_TEXT = {
  draft: '草稿', submitted: '待审核', reviewing: '审核中',
  approved: '已通过', rejected: '已驳回', withdrawn: '已撤回',
}
const STATUS_TAG = {
  draft: 'info', submitted: 'warning', reviewing: 'warning',
  approved: 'success', rejected: 'danger', withdrawn: 'info',
}

const startCountdown = () => {
  countdown.value = 60
  timer && clearInterval(timer)
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

const ensureDraft = async () => {
  const res = await api({
    url: '/identity/applications',
    method: 'post',
    data: form.value,
  })
  if (res.data.code !== 200) throw new Error(res.data.message || '保存失败')
  emit('refresh')
  return res.data.application
}

const errMsg = (error, fallback) => {
  const m = error?.response?.data?.message
  if (typeof m === 'string' && m) return m
  if (m && typeof m === 'object') return Object.values(m)[0]?.[0] || fallback
  return fallback
}

const sendCode = async () => {
  if (!form.value.school_id || !form.value.claimed_name
      || !form.value.claimed_identifier || !form.value.contact_email) {
    ElMessage.warning('请先完整填写学校、姓名、NetID 与个人邮箱')
    return
  }
  sending.value = true
  try {
    const app = await ensureDraft()
    const res = await api({
      url: `/identity/applications/${app.id}/challenge`,
      method: 'post',
    })
    if (res.data.code === 200) {
      ElMessage.success(`验证码已发送至 ${form.value.contact_email}`)
      startCountdown()
    } else {
      ElMessage.error(res.data.message || '发送失败')
    }
  } catch (error) {
    if (error.response?.headers?.['retry-after'] || error.response?.status === 429) {
      ElMessage.warning(errMsg(error, '发送过于频繁，请稍后再试'))
    } else {
      ElMessage.error(errMsg(error, '发送失败，请稍后重试'))
    }
  } finally {
    sending.value = false
  }
}

const verifyCode = async () => {
  if (!code.value) {
    ElMessage.warning('请输入邮箱收到的 6 位验证码')
    return
  }
  verifying.value = true
  try {
    const app = activeDraft.value
    if (!app) {
      ElMessage.warning('请先保存申请信息并发送验证码')
      return
    }
    const res = await api({
      url: `/identity/applications/${app.id}/verify`,
      method: 'post',
      data: { code: code.value },
    })
    if (res.data.code === 200) {
      ElMessage.success('邮箱验证通过，可以提交审核')
      code.value = ''
      emit('refresh')
    } else {
      ElMessage.error(res.data.message || '验证码错误或已失效')
    }
  } catch (error) {
    ElMessage.error(errMsg(error, '校验失败，请稍后重试'))
  } finally {
    verifying.value = false
  }
}

const submit = async () => {
  submitting.value = true
  try {
    const app = activeDraft.value
    const res = await api({
      url: `/identity/applications/${app.id}/submit`,
      method: 'post',
    })
    if (res.data.code === 200) {
      ElMessage.success('已提交，等待核验负责人审核')
      emit('refresh')
    } else {
      ElMessage.error(res.data.message || '提交失败')
    }
  } catch (error) {
    ElMessage.error(errMsg(error, '提交失败，请稍后重试'))
  } finally {
    submitting.value = false
  }
}

const withdraw = async (row) => {
  try {
    await ElMessageBox.confirm('撤回后本次申请结束，可重新发起新申请。确定撤回？',
                               '撤回申请', { type: 'warning' })
  } catch { return }
  try {
    const res = await api({
      url: `/identity/applications/${row.id}/withdraw`,
      method: 'post',
    })
    if (res.data.code === 200) {
      ElMessage.success('已撤回')
      emit('refresh')
    } else {
      ElMessage.error(res.data.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error(errMsg(error, '操作失败，请稍后重试'))
  }
}
</script>

<template>
  <div class="verify-wizard">
    <!-- 待审核中：只读进度 -->
    <div v-if="reviewPending" class="pending-block">
      <el-tag type="warning" effect="plain">待核验负责人审核</el-tag>
      <span class="pending-hint">提交于 {{ reviewPending.created_at }}，预计两个工作日内处理；
        超时可经「反馈记录」联系负责人。</span>
      <el-button link type="danger" @click="withdraw(reviewPending)">撤回申请</el-button>
    </div>

    <template v-else-if="enabled">
      <el-form class="verify-form" label-position="top" @submit.prevent>
        <div class="form-row">
          <el-form-item label="学校">
            <el-select v-model="form.school_id" placeholder="选择学校" class="w-full"
                       :disabled="!!activeDraft">
              <el-option v-for="s in schools" :key="s.school_id"
                         :label="s.name" :value="s.school_id" />
            </el-select>
          </el-form-item>
          <el-form-item label="待核验姓名">
            <el-input v-model="form.claimed_name" placeholder="与名册一致的姓名"
                      :disabled="!!activeDraft" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="NetID / 学号">
            <el-input v-model="form.claimed_identifier" placeholder="如 zhangsan01"
                      :disabled="!!activeDraft" />
          </el-form-item>
          <el-form-item label="个人学生邮箱">
            <el-input v-model="form.contact_email"
                      placeholder="NetID@mail2.sysu.edu.cn（须与 NetID 一致）"
                      :disabled="!!activeDraft" />
          </el-form-item>
        </div>
      </el-form>

      <div v-if="activeDraft && !activeDraft.challenge_verified" class="code-line">
        <el-button type="primary" :loading="sending"
                   :disabled="countdown > 0 || !!activeDraft === false"
                   @click="sendCode">
          {{ countdown > 0 ? `${countdown}s 后可重发` : '发送验证码' }}
        </el-button>
        <el-input v-model="code" placeholder="6 位验证码" maxlength="6"
                  class="code-input" @keyup.enter="verifyCode" />
        <el-button :loading="verifying" @click="verifyCode">验证</el-button>
        <el-button type="primary" plain @click="ensureDraft">保存修改</el-button>
      </div>

      <div class="submit-line">
        <el-button type="primary" size="large" :loading="submitting"
                   :disabled="!activeDraft || !activeDraft.challenge_verified"
                   @click="submit">
          提交审核
        </el-button>
        <span v-if="activeDraft && !activeDraft.challenge_verified"
              class="submit-hint">完成邮箱验证后可提交</span>
        <span v-else-if="activeDraft && activeDraft.challenge_verified"
              class="submit-hint ok">邮箱已验证</span>
      </div>
    </template>

    <div v-else class="closed-block">身份核验暂未开放，请留意公告。</div>

    <!-- 历史申请 -->
    <div v-if="applications.length" class="history">
      <div class="history-title">我的申请</div>
      <div v-for="row in applications" :key="row.id" class="history-row">
        <el-tag :type="STATUS_TAG[row.status] || 'info'" effect="plain" size="small">
          {{ STATUS_TEXT[row.status] || row.status }}
        </el-tag>
        <span class="history-main">{{ row.claimed_name }} · {{ row.claimed_identifier }}</span>
        <span class="history-time">{{ row.created_at }}</span>
        <span v-if="row.status === 'rejected'" class="history-reason">
          驳回原因：{{ row.reject_reason }}（可修正后重新申请）
        </span>
        <el-button v-if="!['approved', 'rejected', 'withdrawn'].includes(row.status)"
                   link type="danger" size="small" @click="withdraw(row)">撤回</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verify-form { margin-top: 4px; }
.form-row { display: flex; gap: 16px; }
.form-row .el-form-item { flex: 1; }
.code-line { display: flex; align-items: center; gap: 12px; margin: 4px 0 16px; }
.code-input { width: 140px; }
.submit-line { display: flex; align-items: center; gap: 12px; }
.submit-hint { color: var(--dew-text-muted, #94a3b8); font-size: 13px; }
.submit-hint.ok { color: var(--color-success, #10b981); }
.pending-block { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.pending-hint { color: var(--dew-text-muted, #94a3b8); font-size: 13px; }
.closed-block { color: var(--dew-text-muted, #94a3b8); padding: 12px 0; }
.history { margin-top: 20px; border-top: 1px solid var(--dew-card-divider, rgba(148,163,184,.18)); padding-top: 12px; }
.history-title { font-weight: 600; margin-bottom: 8px; }
.history-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; flex-wrap: wrap; }
.history-main { font-weight: 500; }
.history-time { color: var(--dew-text-muted, #94a3b8); }
.history-reason { color: var(--color-danger, #ef4444); }

@media (max-width: 768px) {
  .form-row { flex-direction: column; gap: 0; }
  .code-line { flex-wrap: wrap; }
}
</style>
