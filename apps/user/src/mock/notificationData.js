// 通知系统 Mock 数据 — 仅系统通知
import { mockConfig } from './config.js'

// 系统通知 Mock 数据
export const mockNotifications = [
  {
    id: 'system_001',
    title: '系统维护通知',
    content: '系统将于本周六凌晨 2:00–4:00 进行维护升级，期间可能无法正常访问，请提前保存工作。',
    source_type: '9',
    is_read: false,
    is_important: true,
    create_time: '2026-06-12T12:00:00Z',
  },
  {
    id: 'system_002',
    title: '新功能上线：学习进度统计',
    content: '学习进度统计功能已上线，您可以在个人中心查看详细的学习数据分析报告。',
    source_type: '9',
    is_read: true,
    is_important: false,
    create_time: '2026-06-11T10:00:00Z',
  },
  {
    id: 'system_003',
    title: '暑期课程报名通知',
    content: '2026 年暑期创新实践课程开始报名，截止日期为 7 月 15 日，请在"课程中心"查看详情并提交报名。',
    source_type: '9',
    is_read: false,
    is_important: true,
    create_time: '2026-06-10T09:30:00Z',
  },
  {
    id: 'system_004',
    title: '安全提醒：请及时修改密码',
    content: '为保障账户安全，建议您定期更换密码。如发现异常登录，请立即联系管理员。',
    source_type: '9',
    is_read: false,
    is_important: false,
    create_time: '2026-06-09T16:00:00Z',
  },
  {
    id: 'system_005',
    title: '平台使用规范更新',
    content: '平台使用规范已更新，新增了小组协作和讨论区的行为准则，请查阅最新版本。',
    source_type: '9',
    is_read: true,
    is_important: false,
    create_time: '2026-06-08T14:00:00Z',
  },
]

// 计算未读数量
export const calculateUnreadCount = (notifications) => {
  return notifications.filter(n => !n.is_read).length
}

// Mock API 响应
export const mockNotificationApiResponses = {
  getAllNotifications: () => ({
    code: 200,
    message: '获取通知列表成功',
    data: {
      notifications: [...mockNotifications],
      total_unread: calculateUnreadCount(mockNotifications),
    },
  }),

  markAsRead: (messageId) => {
    const notification = mockNotifications.find(n => n.id === messageId)
    if (notification) notification.is_read = true
    return { code: 200, message: '标记已读成功', data: { success: true } }
  },

  markAllAsRead: () => {
    mockNotifications.forEach(n => { n.is_read = true })
    return { code: 200, message: '全部标记已读成功', data: { success: true } }
  },
}

export default mockNotifications
