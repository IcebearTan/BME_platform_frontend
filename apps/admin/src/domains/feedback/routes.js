// 用户反馈工单（平台运营域）：列表 + 详情两个叶子（设计方案 §9.2）
const loadFeedbackTicketList = () => import('./pages/FeedbackTicketListPage.vue')
const loadFeedbackTicketDetail = () => import('./pages/FeedbackTicketDetailPage.vue')

export const feedbackRoutes = [
  {
    path: '/operations/feedback-tickets',
    name: 'operations.feedbackTickets',
    component: loadFeedbackTicketList,
    meta: {
      title: '用户反馈工单', domain: 'operations', navGroup: 'operations', navOrder: 60,
      showInMenu: true, icon: 'ChatLineRound',
    },
  },
  {
    path: '/operations/feedback-tickets/:ticketId',
    name: 'operations.feedbackTicketDetail',
    component: loadFeedbackTicketDetail,
    meta: {
      title: '工单详情', domain: 'operations', navGroup: 'operations',
      showInMenu: false, activeMenu: '/operations/feedback-tickets',
    },
  },
]
