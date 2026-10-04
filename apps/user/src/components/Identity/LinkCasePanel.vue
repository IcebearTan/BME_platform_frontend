<script setup>
// 账号认领面板（D4）：建案例 → A 重新认证证明 → B 独立凭据证明 → 预览 → 确认。
// 敏感输入（密码/TOTP/收据）只存运行内存；归并确认响应的 fresh_access 交会话门面。
import { ref, computed } from 'vue'
import md5 from 'js-md5'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import api, { authSession } from '../../api'

const props = defineProps({
  cases: { type: Array, default: () => [] },
  enabled: { type: Boolean, default: false },
})
const emit = defineEmits(['refresh'])

const CASE_TEXT = {
  collecting: '证明收集中', proof_ready: '证明齐备', preview_ready: '待确认执行',
  awaiting_review: '人工审核中', approved_waiting_confirmation: '批准待确认',
  prepared: '执行中', applied: '已完成', cancelled: '已取消',
  expired: '已过期', failed: '已失败',
}
const CASE_TAG = {
  collecting: 'info', proof_ready: 'info', preview_ready: 'warning',
  awaiting_review: 'warning', approved_waiting_confirmation: 'warning',
  prepared: 'warning', applied: 'success', cancelled: 'info',
  expired: 'info', failed: 'danger',
}

// ── 向导状态（单案例线性流，收据/摘要只留内存）──────────────────
const wiz = ref({
  visible: false, caseId: '', step: 1,
  targetEmail: '', targetPassword: '', targetTotp: '',
  reauthVisible: false, reauthPassword: '', busy: false,
  preview: null, digest: '', receipt: '', done: false, resultNote: '',
})

const steps = [
  { n: 1, label: '发起端认证' },
  { n: 2, label: '另一账号验证' },
  { n: 3, label: '预览与确认' },
]

const openWizard = () => {
  wiz.value = { ...wiz.value, visible: true, step: 1, caseId: '', targetEmail: '',
                targetPassword: '', targetTotp: '', preview: null, digest: '',
                receipt: '', done: false, resultNote: '' }
}

const errMsg = (error, fallback) => {
  const data = error?.response?.data
  const m = data?.message
  if (typeof m === 'string' && m) return m
  if (m && typeof m === 'object') return Object.values(m)[0]?.[0] || fallback
  return fallback
}

const isReauthNeeded = (error) =>
  error?.response?.status === 403 && error?.response?.data?.machine === 'REAUTH_REQUIRED'

// 第 1 步：prove-initiator；超窗弹密码重认证（/identity/reauth）后重试
const proveInitiator = async () => {
  wiz.value.busy = true
  try {
    const res = await api({
      url: `/identity/link-cases/${wiz.value.caseId}/prove-initiator`,
      method: 'post',
    })
    if (res.data.code === 200) {
      wiz.value.step = 2
      ElMessage.success('发起端证明完成（5 分钟内有效）')
    }
  } catch (error) {
    if (isReauthNeeded(error)) {
      wiz.value.reauthVisible = true
    } else {
      ElMessage.error(errMsg(error, '证明失败，请稍后重试'))
    }
  } finally {
    wiz.value.busy = false
  }
}

const doReauth = async () => {
  if (!wiz.value.reauthPassword) return
  wiz.value.busy = true
  try {
    const res = await api({
      url: '/identity/reauth',
      method: 'post',
      data: { password: md5(wiz.value.reauthPassword) },
    })
    if (res.data.code === 200) {
      wiz.value.reauthVisible = false
      wiz.value.reauthPassword = ''
      await proveInitiator()
    }
  } catch (error) {
    ElMessage.error(errMsg(error, '密码验证失败'))
  } finally {
    wiz.value.busy = false
  }
}

const createCase = async () => {
  wiz.value.busy = true
  try {
    const res = await api({ url: '/identity/link-cases', method: 'post' })
    if (res.data.code === 200) {
      wiz.value.caseId = res.data.case.id
      emit('refresh')
      await proveInitiator()
    }
  } catch (error) {
    ElMessage.error(errMsg(error, '创建案例失败'))
  } finally {
    wiz.value.busy = false
  }
}

// 第 2 步：B 端独立凭据证明（422 统一话术，不掉当前登录态）
const proveTarget = async () => {
  if (!wiz.value.targetEmail || !wiz.value.targetPassword) {
    ElMessage.warning('请填写另一账号的邮箱与密码')
    return
  }
  wiz.value.busy = true
  try {
    const res = await api({
      url: `/identity/link-cases/${wiz.value.caseId}/prove-target`,
      method: 'post',
      data: {
        target_email: wiz.value.targetEmail,
        password: md5(wiz.value.targetPassword),
        totp: wiz.value.targetTotp || undefined,
      },
    })
    if (res.data.code === 200) {
      wiz.value.step = 3
      wiz.value.targetPassword = ''
      wiz.value.targetTotp = ''
      ElMessage.success('另一账号验证通过（5 分钟内有效）')
      await buildPreview()
    }
  } catch (error) {
    const machine = error?.response?.data?.machine
    if (machine === 'TARGET_PROOF_FAILED') {
      ElMessage.error('目标账号验证失败：请核对邮箱、密码与动态验证码')
    } else if (machine === 'MANUAL_REQUIRED') {
      ElMessage.warning('该账号情况需人工处理，案例已转人工审核')
      wiz.value.visible = false
      emit('refresh')
    } else if (machine === 'ACCOUNT_LOCKED') {
      ElMessage.warning('该账号已在另一个认领案例中')
      wiz.value.visible = false
      emit('refresh')
    } else {
      ElMessage.error(errMsg(error, '验证失败，请稍后重试'))
    }
  } finally {
    wiz.value.busy = false
  }
}

const buildPreview = async () => {
  wiz.value.busy = true
  try {
    const res = await api({
      url: `/identity/link-cases/${wiz.value.caseId}/preview`,
      method: 'post',
    })
    if (res.data.code === 200) {
      wiz.value.preview = res.data.plan
      wiz.value.digest = res.data.preview_digest
      wiz.value.receipt = res.data.receipt   // 仅内存：刷新即失，用于结果查询
      if (res.data.case_state === 'awaiting_review') {
        wiz.value.step = 3
        wiz.value.done = true
        wiz.value.resultNote = '该账号存在需人工核对的情况，已转审核队列；'
          + '两名审核人批准后可回到此处重新预览并确认。'
        ElMessage.warning('已转人工审核')
      }
    }
  } catch (error) {
    ElMessage.error(errMsg(error, '生成预览失败，请重新完成证明'))
  } finally {
    wiz.value.busy = false
  }
}

const confirm = async () => {
  try {
    await ElMessageBox.confirm(
      '确认执行账号关联？另一账号将转为「已合并」状态并入同一人员档案，'
      + '该账号的旧登录会话会全部失效。操作不可一键撤销。',
      '最终确认', { type: 'warning', confirmButtonText: '确认执行' })
  } catch { return }
  wiz.value.busy = true
  try {
    const res = await api({
      url: `/identity/link-cases/${wiz.value.caseId}/confirm`,
      method: 'post',
      data: { preview_digest: wiz.value.digest },
    })
    if (res.data.code === 200) {
      wiz.value.done = true
      wiz.value.resultNote = res.data.replay ? '归并此前已完成。' : '归并已完成。'
      if (res.data.fresh_access) authSession.updateAccess(res.data.fresh_access)
      ElMessage.success('账号关联完成')
      emit('refresh')
    }
  } catch (error) {
    const machine = error?.response?.data?.machine
    if (machine === 'STALE_PREVIEW') {
      ElMessage.warning('信息已发生变化，正在重新生成预览')
      await buildPreview()
    } else if (machine === 'REAUTH_REQUIRED') {
      wiz.value.reauthVisible = true
    } else {
      ElMessage.error(errMsg(error, '确认失败，请稍后重试'))
    }
  } finally {
    wiz.value.busy = false
  }
}

const withdrawCase = async (row) => {
  try {
    await ElMessageBox.confirm('撤回后本次认领结束，占位解除。确定撤回？',
                               '撤回认领', { type: 'warning' })
  } catch { return }
  try {
    const res = await api({
      url: `/identity/link-cases/${row.id}/withdraw`,
      method: 'post',
    })
    if (res.data.code === 200) {
      ElMessage.success('已撤回')
      emit('refresh')
    }
  } catch (error) {
    ElMessage.error(errMsg(error, '操作失败'))
  }
}

const activeCase = computed(() =>
  props.cases.find(c => !['applied', 'cancelled', 'expired', 'failed'].includes(c.state)))
const historyCases = computed(() =>
  props.cases.filter(c => ['applied', 'cancelled', 'expired', 'failed'].includes(c.state)))
</script>

<template>
  <div class="link-panel">
    <template v-if="enabled">
      <div v-if="!activeCase" class="start-line">
        <el-button type="primary" @click="openWizard">认领另一账号</el-button>
        <span class="start-hint">
          把自己的另一个账号（如早期用校园邮箱注册的空壳账号）合并到当前人员档案；
          需要双方账号的近期验证，全程约 10 分钟。
        </span>
      </div>

      <div v-for="c in cases" v-show="activeCase" :key="c.id" class="case-row">
        <el-tag :type="CASE_TAG[c.state] || 'info'" effect="plain">
          {{ CASE_TEXT[c.state] || c.state }}
        </el-tag>
        <span class="case-target">{{ c.target_email_masked || '待验证目标' }}</span>
        <span class="case-time">建于 {{ c.collection_expires_at }}</span>
        <el-button v-if="!['applied', 'cancelled', 'expired', 'failed', 'prepared'].includes(c.state)"
                   link type="danger" size="small" @click="withdrawCase(c)">撤回</el-button>
      </div>

      <div v-if="historyCases.length" class="history">
        <div class="history-title">历史案例</div>
        <div v-for="c in historyCases" :key="c.id" class="case-row muted">
          <el-tag :type="CASE_TAG[c.state]" effect="plain" size="small">
            {{ CASE_TEXT[c.state] || c.state }}
          </el-tag>
          <span>{{ c.target_email_masked }}</span>
        </div>
      </div>
    </template>
    <div v-else class="closed-block">账号认领暂未开放，请留意公告。</div>

    <!-- 认领向导 -->
    <el-dialog v-model="wiz.visible" title="账号认领" width="560px"
               :close-on-click-modal="false" append-to-body>
      <template v-if="!wiz.done">
        <el-steps :active="wiz.step - 1" finish-status="success" align-center class="wiz-steps">
          <el-step v-for="s in steps" :key="s.n" :title="s.label" />
        </el-steps>

        <div v-if="wiz.step === 1" class="step-body">
          <p class="step-note">
            第一步验证当前账号：创建案例后需要一次近期密码认证（不影响当前登录状态）。
          </p>
          <el-button type="primary" :loading="wiz.busy" @click="createCase">
            创建案例并验证当前账号
          </el-button>
        </div>

        <div v-else-if="wiz.step === 2" class="step-body">
          <p class="step-note">
            第二步验证你要认领的另一账号：输入该账号的邮箱与密码（启用动态口令的一并填写）。
            密码只用于本次验证，不会保存，也不会改变该账号的登录状态。
          </p>
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="另一账号邮箱">
              <el-input v-model="wiz.targetEmail" placeholder="another@example.com" />
            </el-form-item>
            <el-form-item label="该账号密码">
              <el-input v-model="wiz.targetPassword" type="password" show-password
                        placeholder="另一账号的密码" />
            </el-form-item>
            <el-form-item label="动态验证码（该账号未启用可留空）">
              <el-input v-model="wiz.targetTotp" placeholder="6 位动态验证码" maxlength="6" />
            </el-form-item>
          </el-form>
          <el-button type="primary" :loading="wiz.busy" @click="proveTarget">验证</el-button>
        </div>

        <div v-else-if="wiz.step === 3 && wiz.preview" class="step-body">
          <el-alert type="warning" :closable="false" class="preview-alert">
            <template #title>
              <span class="alert-title"><el-icon><Warning /></el-icon>请核对合并预览</span>
            </template>
            <div>存续档案：当前账号（保留邮箱与全部数据）</div>
            <div>并入账号：{{ wiz.preview.merged_user }}（转为「已合并」，保留记录不再登录参与业务）</div>
            <div v-if="wiz.preview.moving_keys && wiz.preview.moving_keys.length">
              迁移的学校身份：{{ wiz.preview.moving_keys.join('、') }}
            </div>
            <div v-if="!wiz.preview.shell" class="blocker-note">
              该账号存在业务数据（{{ (wiz.preview.blockers || []).join('、') }}），
              需人工审核后才能执行。
            </div>
          </el-alert>
          <div class="confirm-line">
            <el-button type="primary" size="large" :loading="wiz.busy"
                       :disabled="!wiz.preview.shell" @click="confirm">
              确认执行合并
            </el-button>
            <span class="confirm-hint">证明与预览 5 分钟内有效，过期需重新验证</span>
          </div>
        </div>
      </template>

      <div v-else class="step-body done">
        <el-result icon="success" title="处理完成"
                   :sub-title="wiz.resultNote" />
      </div>
    </el-dialog>

    <!-- 近期认证弹窗（prove 超窗时） -->
    <el-dialog v-model="wiz.reauthVisible" title="重新认证" width="380px"
               :close-on-click-modal="false" append-to-body>
      <p class="step-note">该操作需要近期认证。输入当前账号密码完成验证（5 分钟内有效）。</p>
      <el-input v-model="wiz.reauthPassword" type="password" show-password
                placeholder="当前账号密码" @keyup.enter="doReauth" />
      <template #footer>
        <el-button @click="wiz.reauthVisible = false">取消</el-button>
        <el-button type="primary" :loading="wiz.busy" @click="doReauth">验证</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.start-line { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.start-hint { color: var(--dew-text-muted, #94a3b8); font-size: 13px; flex: 1; min-width: 240px; }
.case-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; }
.case-row.muted { color: var(--dew-text-muted, #94a3b8); }
.case-target { font-weight: 500; }
.case-time { color: var(--dew-text-muted, #94a3b8); }
.closed-block { color: var(--dew-text-muted, #94a3b8); padding: 12px 0; }
.history { margin-top: 16px; border-top: 1px solid var(--dew-card-divider, rgba(148,163,184,.18)); padding-top: 10px; }
.history-title { font-weight: 600; margin-bottom: 4px; }
.wiz-steps { margin-bottom: 18px; }
.step-body { padding: 0 4px; }
.step-note { color: var(--dew-text-muted, #94a3b8); font-size: 13px; line-height: 1.7; margin-bottom: 14px; }
.preview-alert { margin-bottom: 16px; }
.alert-title { display: inline-flex; align-items: center; gap: 6px; }
.blocker-note { margin-top: 6px; font-weight: 600; }
.confirm-line { display: flex; align-items: center; gap: 12px; }
.confirm-hint { color: var(--dew-text-muted, #94a3b8); font-size: 13px; }
.step-body.done { text-align: center; }
</style>
