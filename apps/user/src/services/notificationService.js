// 通知服务层 — 唯一对接后端的入口
// 现阶段全部走 mock，后端就绪后只需替换内部实现
import api from '../api'
import { mockNotificationApiResponses } from '../mock/notificationData'
import { shouldUseMock, mockApiRequest } from '../mock/config'

export const notificationService = {
  /** 查询通知列表 */
  async fetchList(params = {}) {
    return mockApiRequest(
      () => api.get('/notification/list', { params }).then(r => r.data),
      () => mockNotificationApiResponses.getAllNotifications(params),
    )
  },

  /** 获取未读数量（铃铛轮询用） */
  async fetchUnreadCount() {
    return mockApiRequest(
      () => api.get('/notification/unread_count').then(r => r.data),
      () => mockNotificationApiResponses.getUnreadCount(),
    )
  },

  /** 标记单条已读 */
  async markRead(id) {
    return mockApiRequest(
      () => api.post('/notification/mark_read', { id }).then(r => r.data),
      () => mockNotificationApiResponses.markAsRead(id),
    )
  },

  /** 全部标记已读 */
  async markAllRead(category = null) {
    return mockApiRequest(
      () => api.post('/notification/mark_all_read', { category }).then(r => r.data),
      () => mockNotificationApiResponses.markAllAsRead(),
    )
  },

  /** 删除已读通知 */
  async deleteNotifications(ids) {
    return mockApiRequest(
      () => api.delete('/notification/delete', { data: { ids } }).then(r => r.data),
      () => mockNotificationApiResponses.deleteNotifications(ids),
    )
  },
}
