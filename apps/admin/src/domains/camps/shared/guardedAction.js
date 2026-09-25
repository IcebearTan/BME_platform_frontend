// 审批类操作防连击：每叶子一个实例（后端另有 pending 校验兜底）
import { ref } from 'vue'

export function createGuardedAction() {
  const actionBusy = ref(false)
  async function guarded(fn) {
    if (actionBusy.value) return
    actionBusy.value = true
    try { await fn() } finally { actionBusy.value = false }
  }
  return { actionBusy, guarded }
}
