import api from '../../api'

async function body(request) {
  const response = await request
  if (response.data?.code !== 200) throw new Error(response.data?.message || '工单请求失败')
  return response.data
}
export const feedbackService = {
  list: params => body(api.get('/admin/feedback-tickets', { params })),
  stats: () => body(api.get('/admin/feedback-tickets/stats')),
  staff: () => body(api.get('/admin/feedback-tickets/staff')),
  detail: id => body(api.get('/admin/feedback-tickets/' + id)),
  triage: (id, data) => body(api.patch('/admin/feedback-tickets/' + id + '/triage', data)),
  message: (id, data) => body(api.post('/admin/feedback-tickets/' + id + '/messages', data)),
  transition: (id, data) => body(api.post('/admin/feedback-tickets/' + id + '/transitions', data)),
}
export const feedbackError = error => error.response?.data?.message || error.message || '操作失败，请稍后重试'
