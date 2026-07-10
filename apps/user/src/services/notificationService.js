// 通知服务层 — 唯一对接后端的入口
import api from '../api'

export const notificationService = {
  /** 查询通知列表 */
  async fetchList(params = {}) {
    return api.get('/notification/list', { params }).then(r => r.data)
  },

  /** 获取未读数量（铃铛轮询用） */
  async fetchUnreadCount() {
    return api.get('/notification/unread_count').then(r => r.data)
  },

  /** 标记单条已读 */
  async markRead(id) {
    return api.post('/notification/mark_read', { id }).then(r => r.data)
  },

  /** 全部标记已读 */
  async markAllRead(category = null) {
    return api.post('/notification/mark_all_read', { category }).then(r => r.data)
  },

  /** 删除已读通知 */
  async deleteNotifications(ids) {
    return api.delete('/notification/delete', { data: { ids } }).then(r => r.data)
  },
}
