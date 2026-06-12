// 通知系统 Mock 数据 — 当前仅系统通知
import { mockConfig } from './config.js'

// ── Mock 通知数据 ──
export const mockNotifications = [
  {
    id: 1,
    title: '系统维护通知',
    content: '系统将于本周六凌晨 2:00–4:00 进行维护升级，期间可能无法正常访问，请提前保存工作。',
    category: 'system',
    source_type: 'admin',
    source_id: null,
    group_id: null,
    is_read: false,
    is_important: true,
    created_at: '2026-06-12T12:00:00Z',
  },
  {
    id: 2,
    title: '新功能上线：学习进度统计',
    content: '学习进度统计功能已上线，您可以在个人中心查看详细的学习数据分析报告。',
    category: 'system',
    source_type: 'admin',
    source_id: null,
    group_id: null,
    is_read: true,
    is_important: false,
    created_at: '2026-06-11T10:00:00Z',
  },
  {
    id: 3,
    title: '暑期课程报名通知',
    content: '2026 年暑期创新实践课程开始报名，截止日期为 7 月 15 日，请在"课程中心"查看详情并提交报名。',
    category: 'system',
    source_type: 'admin',
    source_id: null,
    group_id: null,
    is_read: false,
    is_important: true,
    created_at: '2026-06-10T09:30:00Z',
  },
  {
    id: 4,
    title: '安全提醒：请及时修改密码',
    content: '为保障账户安全，建议您定期更换密码。如发现异常登录，请立即联系管理员。',
    category: 'system',
    source_type: 'admin',
    source_id: null,
    group_id: null,
    is_read: false,
    is_important: false,
    created_at: '2026-06-09T16:00:00Z',
  },
  {
    id: 5,
    title: '平台使用规范更新',
    content: '平台使用规范已更新，新增了小组协作和讨论区的行为准则，请查阅最新版本。',
    category: 'system',
    source_type: 'admin',
    source_id: null,
    group_id: null,
    is_read: true,
    is_important: false,
    created_at: '2026-06-08T14:00:00Z',
  },
]

// 计算未读数量
export const calculateUnreadCount = (notifications) => {
  return notifications.filter(n => !n.is_read).length
}

// ── Mock API 响应生成器 ──
export const mockNotificationApiResponses = {
  getAllNotifications: (params = {}) => {
    let list = [...mockNotifications]

    // 按已读状态过滤
    if (params.is_read !== undefined) {
      const isRead = params.is_read === 'false' || params.is_read === false ? false : true
      list = list.filter(n => n.is_read === isRead)
    }

    // 按时间倒序
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const page = parseInt(params.page) || 1
    const perPage = parseInt(params.per_page) || 20
    const start = (page - 1) * perPage
    const paged = list.slice(start, start + perPage)

    return {
      code: 200,
      message: '获取通知列表成功',
      data: {
        notifications: paged,
        total: list.length,
        unread_count: calculateUnreadCount(list),
        page,
        per_page: perPage,
      },
    }
  },

  getUnreadCount: () => ({
    code: 200,
    data: {
      unread_count: calculateUnreadCount(mockNotifications),
    },
  }),

  markAsRead: (id) => {
    const notification = mockNotifications.find(n => n.id === id)
    if (notification) notification.is_read = true
    return { code: 200, message: '标记已读成功', data: { success: true } }
  },

  markAllAsRead: () => {
    mockNotifications.forEach(n => { n.is_read = true })
    return { code: 200, message: '全部标记已读成功', data: { success: true } }
  },

  deleteNotifications: (ids) => {
    ids.forEach(id => {
      const idx = mockNotifications.findIndex(n => n.id === id)
      if (idx !== -1) mockNotifications.splice(idx, 1)
    })
    return { code: 200, message: '删除成功', data: { deleted_count: ids.length } }
  },
}

export default mockNotifications
