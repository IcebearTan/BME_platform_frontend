// 通知 Composable — 铃铛和列表共享的响应式状态
import { ref, computed } from 'vue'
import { notificationService } from '../services/notificationService'

// ── 模块级单例状态（所有 useNotifications() 实例共享同一份数据） ──
const notificationList = ref([])      // 收件箱完整列表（收件箱页拉取/筛选/分页用）
const previewList = ref([])           // 铃铛私有预览（最近几条摘要，展开时懒加载，不与收件箱互踩）
const unreadCount = ref(0)            // 服务端未读数（铃铛与 tab 徽标唯一真相，不再由本地列表推算）
const unreadByCategory = ref({})      // 分类未读明细（system/camp/community/message…）
const loading = ref(true)
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
  // 本地未读兜底：服务端数值未就绪（首帧 0）前，若列表已带数据可用列表口径，避免徽标闪没
  const localUnread = computed(() => notificationList.value.filter(n => !n.is_read).length)
  const totalCount = computed(() => notificationList.value.length)

  /** 刷新服务端未读数（轻量接口：total + by_category） */
  async function refreshUnreadCount() {
    try {
      const r = await notificationService.fetchUnreadCount()
      if (r.code === 200) {
        unreadCount.value = r.data?.unread_count ?? 0
        unreadByCategory.value = r.data?.by_category || {}
      }
    } catch (e) {
      console.error('[useNotifications] refreshUnreadCount 失败:', e)
    }
  }

  /** 获取通知列表（收件箱页用；默认拉 100 条：客户端筛选/分页场景不截断历史，
   *  需要服务端分页时自行传 page/per_page 覆盖） */
  async function fetchNotifications(params = {}) {
    loading.value = true
    try {
      const r = await notificationService.fetchList({ per_page: 100, ...params })
      if (r.code === 200) {
        // 后端形状异常时保底空数组：直接赋 undefined 会让本地未读的 filter 白屏整站
        notificationList.value = r.data?.notifications || []
        refreshUnreadCount()
      }
    } catch (e) {
      console.error('[useNotifications] fetchNotifications 失败:', e)
    } finally {
      loading.value = false
    }
  }

  /** 铃铛预览（最近几条摘要；展开时调用，与收件箱列表互不影响） */
  async function fetchPreview(limit = 8) {
    try {
      const r = await notificationService.fetchList({ per_page: limit })
      if (r.code === 200) previewList.value = r.data?.notifications || []
    } catch (e) {
      console.error('[useNotifications] fetchPreview 失败:', e)
    }
  }

  /** 把某条通知在本地两个列表里同步置为已读/未读（乐观更新的统一落点） */
  function flipRead(id, read) {
    for (const list of [notificationList, previewList]) {
      const row = list.value.find(n => n.id === id)
      if (row) row.is_read = read
    }
  }

  /** 标记单条已读（乐观更新 + 服务端未读数回真） */
  async function markAsRead(id) {
    flipRead(id, true)
    try {
      await notificationService.markRead(id)
      refreshUnreadCount()
    } catch (e) {
      flipRead(id, false)
      console.error('[useNotifications] markAsRead 失败:', e)
    }
  }

  /** 全部标记已读（乐观更新只动匹配分类的行——后端只更新所选分类，
   *  原实现会把其它分类也一并标掉，切 tab 后发现已读状态错乱） */
  async function markAllAsRead(category = null) {
    const targets = notificationList.value.filter(
      n => !n.is_read && (!category || n.category === category))
    targets.forEach(n => { n.is_read = true })
    try {
      await notificationService.markAllRead(category)
      refreshUnreadCount()
    } catch (e) {
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

  /** 开启轮询（铃铛用）：30s 只拉轻量未读数，不再全量拉 100 条通知；
   *  最近摘要改为展开铃铛时懒加载（fetchPreview） */
  function startPolling(interval = 30000) {
    stopPolling()
    refreshUnreadCount()
    pollingTimer = setInterval(() => refreshUnreadCount(), interval)
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
    previewList,
    unreadCount,
    unreadByCategory,
    localUnread,
    totalCount,
    loading,
    // 方法
    fetchNotifications,
    fetchPreview,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    startPolling,
    stopPolling,
    // 工具
    formatRelativeTime,
  }
}
