import api from '../api'

export const pointsService = {
  summary: () => api.get('/points/me'),
  connect: () => api.post('/points/connect'),
  tasks: () => api.get('/points/tasks'),
  records: (params) => api.get('/points/records', { params }),
  campTasks: (sid) => api.get(`/points/camps/${sid}/tasks`),
  campRewards: (sid, params) => api.get(`/points/camps/${sid}/rewards`, { params }),
}
export const formatPoints = (value) => value == null ? '—' : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
export const pointsError = (error) => error?.response?.data?.message || '积分暂时不可用，请稍后重试'
