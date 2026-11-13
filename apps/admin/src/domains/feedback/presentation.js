export const STATUS_META = {
  new: { label: '新提交', tag: 'danger', hint: '确认问题类型、优先级和处理人后，点击受理。' },
  reopened: { label: '重新打开', tag: 'danger', hint: '问题仍然存在，请核对最新补充后继续处理。' },
  triaged: { label: '已受理', tag: 'warning', hint: '已进入处理队列，准备就绪后开始处理。' },
  in_progress: { label: '处理中', tag: 'primary', hint: '排查并回复用户；需要补充时写清要求，完成后记录处理结果。' },
  waiting_user: { label: '待用户补充', tag: 'warning', hint: '用户回复后会自动回到处理中，也可以手动继续处理。' },
  resolved: { label: '已解决', tag: 'success', hint: '已记录处理结果，可关闭归档；问题仍存在时可重新打开。' },
  closed: { label: '已关闭', tag: 'info', hint: '此工单已归档，继续跟进前请重新打开。' },
  rejected: { label: '未予受理', tag: 'info', hint: '已说明不受理原因，需要重新跟进时可重新打开。' },
}
export const CATEGORY_LABELS = { bug: '问题故障', feature_request: '功能建议', content_issue: '内容问题', account_issue: '账号问题', other: '其他' }
export const PRIORITY_LABELS = { low: '低', medium: '中', high: '高', urgent: '紧急' }
export const PRIORITY_TYPES = { low: 'info', medium: 'primary', high: 'warning', urgent: 'danger' }
export const SEVERITY_LABELS = { low: '轻微', normal: '一般', high: '较严重', critical: '严重' }
export const RESOLUTION_LABELS = { fixed: '已修复', wont_fix: '不予修复', duplicate: '重复工单', need_more_info: '信息不足', not_reproducible: '无法复现', by_design: '按设计运作', withdrawn: '提交人撤回', rejected: '未予受理' }
export const ACTIONS = { in_progress: '开始处理', waiting_user: '要求用户补充', resolved: '标记解决', closed: '关闭工单', reopened: '重新打开', rejected: '不予受理' }
export const TRANSITIONS = { new: ['rejected'], triaged: ['in_progress', 'rejected'], in_progress: ['waiting_user', 'resolved', 'rejected'], waiting_user: ['in_progress', 'resolved'], resolved: ['closed', 'reopened'], closed: ['reopened'], reopened: ['in_progress', 'rejected'], rejected: ['reopened'] }
export const QUEUES = [{ value: '', label: '全部', statuses: Object.keys(STATUS_META) }, { value: 'inbox', label: '待受理', statuses: ['new', 'reopened'] }, { value: 'active', label: '处理中', statuses: ['triaged', 'in_progress'] }, { value: 'waiting', label: '待用户', statuses: ['waiting_user'] }, { value: 'done', label: '已完成', statuses: ['resolved', 'closed', 'rejected'] }]
export const formatTime = value => value ? value.slice(0, 16).replace('T', ' ') : '—'

export function ticketTimeline(ticket) {
  const eventLabels = { created: '提交工单', triaged: '受理 / 调整安排', assigned: '调整处理人', status_changed: '更新处理进度', withdrawn: '提交人撤回', reopened: '重新打开' }
  const messages = (ticket.messages || []).map(item => ({ ...item, key: 'message-' + item.id, title: item.visibility === 'internal' ? '内部备注' : '公开回复', kind: 'message' }))
  const events = (ticket.events || []).filter(item => !['public_replied', 'internal_noted'].includes(item.event_type)).map(item => {
    let meta = item.metadata || {}
    if (typeof meta === 'string') { try { meta = JSON.parse(meta) } catch { meta = {} } }
    const parts = []
    if (item.to_status) parts.push((STATUS_META[item.from_status]?.label || '创建') + ' → ' + (STATUS_META[item.to_status]?.label || item.to_status))
    if (meta.priority) parts.push('优先级：' + (PRIORITY_LABELS[meta.priority] || meta.priority))
    if (meta.category) parts.push('类型：' + (CATEGORY_LABELS[meta.category] || meta.category))
    if ('assignee_user_id' in meta) parts.push(meta.assignee_user_id ? '处理人 #' + meta.assignee_user_id : '取消分派')
    if (item.event_type === 'assigned') parts.push(meta.to ? '分派给 #' + meta.to : '取消分派')
    if (meta.reason || meta.resolution_summary) parts.push(meta.reason || meta.resolution_summary)
    return { ...item, key: 'event-' + item.id, kind: 'event', title: eventLabels[item.event_type] || item.event_type, body: parts.join('；'), author_name: item.actor_name }
  })
  return [...messages, ...events].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') || (a.event_type === 'created' ? -1 : b.event_type === 'created' ? 1 : a.id - b.id))
}
