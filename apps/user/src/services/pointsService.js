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

// 未开放与未完成分开；没有完成信息时不推断用户尚未完成。
export function pointsTaskState(task) {
  if (!task.enabled || task.status === 'unconfigured') return 'unavailable'
  if (typeof task.done_today === 'boolean') return task.done_today ? 'completed' : 'incomplete'
  if (task.completed === true || task.completion_status === 'completed' || task.status === 'completed') return 'completed'
  if (task.completed === false || task.completion_status === 'incomplete' || task.status === 'incomplete') return 'incomplete'
  return 'unknown'
}
