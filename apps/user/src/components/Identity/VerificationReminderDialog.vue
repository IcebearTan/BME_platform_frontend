<template>
  <el-dialog :model-value="modelValue" title="完成身份核验" width="420px"
    :show-close="false" :close-on-click-modal="false" :close-on-press-escape="false"
    align-center @update:model-value="v => emit('update:modelValue', v)">
    <div class="remind-body">
      <el-icon class="remind-icon"><User /></el-icon>
      <div class="remind-title">{{ statusTitle }}</div>
      <div class="remind-text">{{ statusText }}</div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="goVerify">{{ buttonText }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
// 未核验首页强提醒（R0 收紧批 2026-10-02，用户拍板「强弹不可关」）：
// 每次回到首页对未核验账号弹出，唯一按钮直达身份中心，核验完成自然消失。
// 通道感知：核验/认领通道关闭时不弹（不把用户引向死胡同）；超管/服务/测试号不弹
// （由父组件判定）。挂载即探 /identity/status 刷新核验态并回写 store。
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { User } from '@element-plus/icons-vue'
import api from '../../api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const store = useStore()

const status = computed(() => store.getters.verificationStatus)

const COPY = {
  unverified: {
    title: '完成身份核验',
    text: '平台正在逐步收紧账号管理：完成实名核验后，才能被任命职务、参与正式活动与认领早期账号。整个过程约两分钟。',
    button: '去核验',
  },
  pending: {
    title: '身份核验审核中',
    text: '你的核验申请正在审核，通过后本提醒会自动消失；如有补充材料可进「身份与账号」查看进度。',
    button: '查看审核进度',
  },
  disputed: {
    title: '核验状态待处理',
    text: '你的身份核验存在争议记录，请到「身份与账号」查看详情并按提示处理。',
    button: '查看核验状态',
  },
  revoked: {
    title: '核验已被撤销',
    text: '你的身份核验被撤销后需重新提交，请到「身份与账号」重新发起核验。',
    button: '重新核验',
  },
}
const copy = computed(() => COPY[status.value] || COPY.unverified)
const statusTitle = computed(() => copy.value.title)
const statusText = computed(() => copy.value.text)
const buttonText = computed(() => copy.value.button)

// 打开时探一次真实核验态与通道开关：仅在「显式已核验」或「显式通道关闭」时收弹，
// 回包缺字段/探测失败一律保持展示（提醒宁弹勿漏；门槛侧后端另有通道感知兜底）。
// 结果回写 store（核验通过后回首页自然停弹）。
async function probe() {
  try {
    const res = await api({ url: '/identity/status', method: 'get' })
    const data = res.data || {}
    if (data.code !== 200) return
    // 回包为平铺信封：person/verification_enabled/ui_enabled 与 code 同级（无 data 包装层）
    const live = data.person?.verification_status
    if (live && live !== status.value) {
      store.commit('patchIdentity', { verification_status: live })
    }
    if (live === 'verified'
        || data.verification_enabled === false || data.ui_enabled === false) {
      emit('update:modelValue', false)
    }
  } catch {
    // 探测失败不拦提醒（按 store 已知状态展示）
  }
}

function goVerify() {
  emit('update:modelValue', false)
  router.push('/user-center/identity')
}

probe()
</script>

<style scoped>
.remind-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 6px 4px;
  text-align: center;
}

.remind-icon {
  font-size: 34px;
  color: var(--primary-color, var(--el-color-primary));
}

.remind-title {
  font-size: 16px;
  font-weight: 600;
}

.remind-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}
</style>
