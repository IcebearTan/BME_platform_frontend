// 通知 Composable — 铃铛和列表共享的响应式状态
import { ref, computed } from 'vue'
import { notificationService } from '../services/notificationService'

// ── 模块级单例状态（所有 useNotifications() 实例共享同一份数据） ──
const notificationList = ref([])
const loading = ref(false)
let pollingTimer = null

// ── 公共工具 ──

/** 相对时间格式化 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  return d > 0 ? `${d}天前` : h > 0 ? `${h}小时前` : m > 0 ? `${m}分钟前` : '刚刚'
}

// ── Composable ──

export function useNotifications() {
  const unreadCount = computed(() => notificationList.value.filter(n => !n.is_read).length)
  const totalCount = computed(() => notificationList.value.length)

  /** 获取通知列表 */
  async function fetchNotifications(params = {}) {
    loading.value = true
    try {
      const r = await notificationService.fetchList(params)
      if (r.code === 200) {
        notificationList.value = r.data.notifications
      }
    } catch (e) {
      console.error('[useNotifications] fetchNotifications 失败:', e)
    } finally {
      loading.value = false
    }
  }

  /** 标记单条已读（乐观更新） */
  async function markAsRead(id) {
    const target = notificationList.value.find(n => n.id === id)
    if (target) target.is_read = true
    try {
      await notificationService.markRead(id)
    } catch (e) {
      // 回滚
      if (target) target.is_read = false
      console.error('[useNotifications] markAsRead 失败:', e)
    }
  }

  /** 全部标记已读（乐观更新） */
  async function markAllAsRead(category = null) {
    const targets = notificationList.value.filter(n => !n.is_read)
    targets.forEach(n => { n.is_read = true })
    try {
      await notificationService.markAllRead(category)
    } catch (e) {
      // 回滚
      targets.forEach(n => { n.is_read = false })
      console.error('[useNotifications] markAllAsRead 失败:', e)
    }
  }

  /** 删除已读通知 */
  async function deleteNotifications(ids) {
    const backup = [...notificationList.value]
    notificationList.value = notificationList.value.filter(
      n => !ids.includes(n.id)
    )
    try {
      await notificationService.deleteNotifications(ids)
    } catch (e) {
      notificationList.value = backup
      console.error('[useNotifications] deleteNotifications 失败:', e)
    }
  }

  /** 开启轮询（铃铛用） */
  function startPolling(interval = 30000) {
    stopPolling()
    fetchNotifications()
    pollingTimer = setInterval(() => fetchNotifications(), interval)
  }

  /** 停止轮询 */
  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  return {
    // 状态
    notificationList,
    unreadCount,
    totalCount,
    loading,
    // 方法
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    startPolling,
    stopPolling,
    // 工具
    formatRelativeTime,
  }
}
