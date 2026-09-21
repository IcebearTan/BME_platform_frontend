// 加入申请批量通过（学员申请叶与导生招募区共用）：batch-approve 逐项回报端点，
// 契约红线（members/batch 同款）——部分成功必须逐项列明，不允许显示为全部成功。
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../../../api'
import { createGuardedAction } from './guardedAction'

export function createJoinApproval(campIdRef, { onDone } = {}) {
  const { actionBusy, guarded } = createGuardedAction()
  const batchApproving = ref(false)

  function batchApproveJoin(rows) {
    guarded(() => submitBatchApprove(rows))
  }

  // 一键通过波及全部待审，先确认再执行（通过选中=显式选择即意图，直接执行）
  function confirmApproveAll(rows) {
    guarded(async () => {
      try {
        await ElMessageBox.confirm(`将一次性通过全部 ${rows.length} 项待审批申请`, '一键通过',
          { type: 'warning', confirmButtonText: '全部通过', cancelButtonText: '取消' })
      } catch { return }   // 用户取消
      await submitBatchApprove(rows)
    })
  }

  async function submitBatchApprove(rows) {
    if (!rows.length) return
    batchApproving.value = true
    try {
      // 学员行带 row._mentor（未启用选导生的营期生效；导生行恒 null）
      const items = rows.map((r) => ({ id: r.id, team_mentor_id: r._mentor ?? null }))
      const r = await api.post(`/camp/sessions/${campIdRef.value}/join-requests/batch-approve`, { items })
      ElMessage.success(r.data?.message || '批量通过完成')
      const failed = (r.data?.results || []).filter((x) => x.status === 'failed')
      if (failed.length) {
        const detail = failed.map((f) => {
          const row = rows.find((rr) => rr.id === f.id)
          return `${row?.username || f.id}：${f.message}`
        }).join('；')
        ElMessage.warning(`未通过 ${failed.length} 项——${detail}`)
      }
      onDone?.()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '批量通过失败')
    } finally {
      batchApproving.value = false
    }
  }

  return { actionBusy, guarded, batchApproving, batchApproveJoin, confirmApproveAll }
}
