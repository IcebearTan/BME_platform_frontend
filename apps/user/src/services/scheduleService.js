// 个人日程服务（2026-09-24 Phase 1）：任务/固定日程/执行块 + 聚合视图 + 偏好。
// 范式对齐 courseShelfService：code===200 判定、失败 throw（message 透传，409
// 版本冲突也走 throw 由调用方捕获后提示+重拉）、成功返回已解析 data。
import api from '../api'

async function request(config, fallbackMessage) {
  const res = await api(config)
  if (res.data.code !== 200) {
    throw new Error(res.data.message || fallbackMessage)
  }
  return res.data.data
}

export const scheduleService = {
  // ── 聚合视图（今日/周历共用） ──
  fetchAgenda(from, to) {
    return request({ url: '/schedule/agenda', method: 'get', params: { from, to } }, '日程加载失败')
  },

  // ── 任务 ──
  fetchTasks({ page = 1, perPage = 20, bucket = 'all', q = '' } = {}) {
    return request({
      url: '/schedule/tasks', method: 'get',
      params: { page, per_page: perPage, bucket, q: q || undefined }
    }, '任务列表加载失败')
  },
  fetchTask(id) {
    return request({ url: `/schedule/tasks/${id}`, method: 'get' }, '任务详情加载失败')
  },
  createTask(payload) {
    return request({ url: '/schedule/tasks', method: 'post', data: payload }, '任务创建失败')
  },
  updateTask(id, payload) {
    return request({ url: `/schedule/tasks/${id}`, method: 'patch', data: payload }, '任务保存失败')
  },
  taskAction(id, action, extra = {}) {
    return request({ url: `/schedule/tasks/${id}/actions`, method: 'post', data: { action, ...extra } }, '操作失败')
  },

  // ── 固定日程 ──
  createEvent(payload) {
    return request({ url: '/schedule/events', method: 'post', data: payload }, '日程创建失败')
  },
  updateEvent(id, payload) {
    return request({ url: `/schedule/events/${id}`, method: 'patch', data: payload }, '日程保存失败')
  },
  deleteEvent(id) {
    return request({ url: `/schedule/events/${id}`, method: 'delete' }, '日程删除失败')
  },

  // ── 执行块 ──
  createBlock(payload) {
    return request({ url: '/schedule/blocks', method: 'post', data: payload }, '时间块创建失败')
  },
  updateBlock(id, payload) {
    return request({ url: `/schedule/blocks/${id}`, method: 'patch', data: payload }, '时间块保存失败')
  },
  deleteBlock(id) {
    return request({ url: `/schedule/blocks/${id}`, method: 'delete' }, '时间块删除失败')
  },

  // ── 偏好 ──
  fetchPreferences() {
    return request({ url: '/schedule/preferences', method: 'get' }, '偏好加载失败')
  },
  updatePreferences(payload) {
    return request({ url: '/schedule/preferences', method: 'patch', data: payload }, '偏好保存失败')
  },

  // ── 意图录入（Phase 2：说一句，帮我安排） ──
  createCapture(text, requestId) {
    return request({
      url: '/schedule/captures', method: 'post',
      data: { text, request_id: requestId }
    }, '提交失败，请稍后重试')
  },
  getCapture(id) {
    return request({ url: `/schedule/captures/${id}`, method: 'get' }, '结果加载失败')
  },
  resolveCapture(id, answers) {
    return request({
      url: `/schedule/captures/${id}/resolve`, method: 'post',
      data: { answers }
    }, '补充失败，请重试')
  },

  // ── 排程方案（Phase 2） ──
  applyPlan(id) {
    return request({ url: `/schedule/plans/${id}/apply`, method: 'post' }, '应用方案失败')
  },
  revertPlan(id) {
    return request({ url: `/schedule/plans/${id}/revert`, method: 'post' }, '撤销失败')
  },
  fetchPlans(limit = 10) {
    return request({ url: '/schedule/plans', method: 'get', params: { limit } }, '方案加载失败')
  }
}
