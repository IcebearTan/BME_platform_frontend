// 内部工作台资格探测 — 模块级单例状态（范式对齐 useNotificationTabs 的导生探测）。
// /work/me 是探测端点：无资格回 200 空形；探测失败静默（仅失去入口，不影响页面主流程）。
// 消费方：服务台入口卡 / 顶栏入口 / 组织架构页「进入工作区」按钮 / 通知中心「工作」tab。
import { ref } from 'vue'
import { workService } from '../services/workService'

// ── 模块级单例状态（所有 useWorkAccess() 实例共享） ──
const me = ref(null)
const hasAccess = ref(false)
const isGovernance = ref(false)
const detecting = ref(false)
const detectFailed = ref(false)
let probe = null      // 探测只发一次；失败置空允许下次重试（登出/换号后可 force）

export function useWorkAccess() {
  function detect(force = false) {
    if (!force && probe) return probe
    const token = localStorage.getItem('bme-user-token')
    if (!token) {                                 // 未登录：清空单例态，不发请求
      me.value = null
      hasAccess.value = false
      isGovernance.value = false
      detectFailed.value = false
      probe = null
      return Promise.resolve()
    }
    detecting.value = true
    detectFailed.value = false
    probe = workService.fetchMe()
      .then((res) => {
        const data = res?.data || {}
        me.value = data
        // 入口判据：有可进入的工作区，或持有治理身份（治理人员可能暂无组工作区）
        hasAccess.value = Boolean(data.workspaces?.length) || Boolean(data.is_governance)
        isGovernance.value = Boolean(data.is_governance)
      })
      .catch(() => { probe = null; detectFailed.value = true })
      .finally(() => { detecting.value = false })
    return probe
  }

  /** 组织架构页组卡片用：该组是否是我可进入的工作区（按 club_group_id 匹配，不发额外请求） */
  function workspaceForGroup(groupId) {
    return (me.value?.workspaces || []).find(w => w.club_group_id === groupId)
  }

  return { me, hasAccess, isGovernance, detecting, detectFailed, detect, workspaceForGroup }
}
