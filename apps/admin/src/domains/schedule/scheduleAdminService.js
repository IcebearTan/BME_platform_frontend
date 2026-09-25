// 日程服务管理 API 封装（批次 A 只读六 GET）。
// 响应统一 {code, data}；列表 data 含 items/total/page/page_size。
import api from '../../api'

async function get(path, params) {
  const res = await api.get(path, { params })
  if (res.data.code !== 200) {
    throw new Error(res.data.message || '加载失败')
  }
  return res.data
}

export const scheduleAdminService = {
  fetchOverview() {
    return get('/admin/schedule/overview').then((d) => d.data)
  },
  fetchReminders(params) {
    return get('/admin/schedule/reminders', params).then((d) => ({ ...d.data, enums: d.enums }))
  },
  fetchReminder(id) {
    return get(`/admin/schedule/reminders/${id}`).then((d) => d.data)
  },
  fetchCaptures(params) {
    return get('/admin/schedule/captures', params).then((d) => ({ ...d.data, enums: d.enums }))
  },
  fetchCapture(id) {
    return get(`/admin/schedule/captures/${id}`).then((d) => d.data)
  },
  fetchSettings() {
    return get('/admin/schedule/settings').then((d) => d.data)
  },
  publishSettings(updates) {
    return api.patch('/admin/schedule/settings', { updates })
      .then((res) => {
        if (res.data.code !== 200) {
          const err = new Error(res.data.message || '发布失败')
          err.status = res.data.code
          throw err
        }
        return res.data.data
      })
  },
}

// 安全错误码 → 固定文案映射（服务端只出码不出自由文本，脱敏审查收敛于此）
export const ERROR_CODE_LABELS = {
  llm_timeout: '理解服务超时',
  llm_invalid: '无法理解输入',
  internal: '处理出错',
  stale_timeout: '处理超时（已恢复标记）',
  notification_write_failed: '通知写入失败',
  db_error: '数据库异常',
  timeout: '超时',
}

export const REMINDER_STATUS_META = {
  pending: { label: '待触发', tag: 'info' },
  delivered: { label: '已投递', tag: 'success' },
  cancelled: { label: '已取消', tag: 'info' },
  expired: { label: '已失效', tag: 'warning' },
  failed: { label: '投递失败', tag: 'danger' },
}

export const CAPTURE_STATUS_META = {
  pending: { label: '排队中', tag: 'info' },
  processing: { label: '处理中', tag: 'warning' },
  done: { label: '已完成', tag: 'success' },
  failed: { label: '失败', tag: 'danger' },
  clarify_needed: { label: '待补充', tag: 'warning' },
}

export const REASON_LABELS = {
  target_gone: '目标已删除',
  stale_version: '目标版本过期',
  target_inactive: '目标已失效',
  no_deadline: '无截止锚点',
  missed: '错过投递窗口',
}

export const SERVICE_STATE_META = {
  ok: { label: '正常', tag: 'success' },
  disabled: { label: '已关闭', tag: 'info' },
  unobserved: { label: '未观测', tag: 'warning' },
  abnormal: { label: '异常', tag: 'danger' },
  config_mismatch: { label: '配置不一致', tag: 'warning' },
}
