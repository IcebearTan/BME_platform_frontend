// 「说一句，帮我安排」录入状态机（模块级单例，范式对齐 useNotifications）：
// submit（request_id=uuid，网络重试复用同一键）→ 1.5s 起步轮询（5 次后退避 3s，
// 90s 停轮）→ done / clarify_needed / failed 分支；resolve 补答；revert 整次撤销。
import { ref } from 'vue'
import { scheduleService } from '../services/scheduleService'

// ── 模块级单例状态 ──
const capture = ref(null)     // GET /captures/:id 形状（含 result 解析后的 items）
const phase = ref('idle')     // idle|submitting|processing|done|clarify_needed|failed|timeout|reverted
const phaseDetail = ref('')   // 失败原因 / 撤销 skipped 摘要
const settleTick = ref(0)     // 每次「有结果的落定」（settle/撤销完）+1，驱动全局刷新
let pollTimer = null
let pollCount = 0
let currentRequestId = null

function uuid() {
  return (crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    .replace(/-/g, '').slice(0, 32)
}

function stopPolling() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
  pollCount = 0
}

function settle(row) {
  capture.value = row
  phase.value = row.status
  settleTick.value += 1
  stopPolling()
}

function pollOnce(id) {
  pollCount += 1
  pollTimer = setTimeout(async () => {
    try {
      const row = await scheduleService.getCapture(id)
      if (row.status === 'pending' || row.status === 'processing') {
        if (pollCount >= 60) {              // ~90s（1.5s×5 + 3s×55 上限）停止轮询
          phase.value = 'timeout'
          stopPolling()
          return
        }
        pollOnce(id)
      } else {
        settle(row)
      }
    } catch {
      phase.value = 'failed'
      phaseDetail.value = '结果查询失败，可稍后在日程中查看'
      stopPolling()
    }
  }, pollCount <= 5 ? 1500 : 3000)
}

export function useScheduleCapture() {
  /** 提交一句话；request_id 幂等（同一实例重试复用，重新输入换新 id） */
  async function submit(text, { reuseRequestId = false } = {}) {
    if (!text || !text.trim()) return
    if (!reuseRequestId || !currentRequestId) currentRequestId = uuid()
    stopPolling()
    phase.value = 'submitting'
    phaseDetail.value = ''
    try {
      const data = await scheduleService.createCapture(text.trim(), currentRequestId)
      capture.value = data.capture
      if (data.capture.status === 'pending' || data.capture.status === 'processing') {
        phase.value = 'processing'
        pollOnce(data.capture.id)
      } else {
        settle(data.capture)
      }
    } catch (err) {
      phase.value = 'failed'
      phaseDetail.value = err.message || '提交失败'
    }
  }

  /** 歧义补答：answers = { "<item index>": { "<field>": "<value>" } } */
  async function resolve(answers) {
    if (!capture.value) return
    phase.value = 'processing'
    phaseDetail.value = ''
    try {
      const row = await scheduleService.resolveCapture(capture.value.id, answers)
      settle(row)
    } catch (err) {
      phaseDetail.value = err.message || '补充失败'
      phase.value = 'clarify_needed'        // 保留卡片与已填答案，可重试
      throw err
    }
  }

  /** 撤销本次录入：对全部 applied 方案依序补偿（跳过项如实报告） */
  async function revertCapture() {
    const planIds = capture.value?.result?.plan_ids || []
    if (!planIds.length) return
    phase.value = 'processing'
    const skipped = []
    for (const pid of planIds) {
      try {
        const out = await scheduleService.revertPlan(pid)
        if (out.skipped?.length) skipped.push(...out.skipped)
      } catch { /* 已过期/已撤销的方案跳过 */ }
    }
    phase.value = 'reverted'
    phaseDetail.value = skipped.length
      ? `已撤销，${skipped.length} 项因已被修改跳过`
      : '已撤销本次录入'
    settleTick.value += 1
  }

  /** 手动模式：应用一个 proposed 方案 */
  async function applyProposal(planId) {
    return scheduleService.applyPlan(planId)
  }

  function dismiss() {
    stopPolling()
    capture.value = null
    phase.value = 'idle'
    phaseDetail.value = ''
  }

  return { capture, phase, phaseDetail, settleTick, submit, resolve, revertCapture, applyProposal, dismiss }
}
