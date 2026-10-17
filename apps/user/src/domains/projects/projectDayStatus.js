export function projectToday(timezone = 'Asia/Shanghai', timestamp = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(timestamp))
}

export function projectDayLabel(day) {
  return Number.isInteger(day) && day >= 0 ? `D${day}` : ''
}

export function projectDayStatus(project, today, entries = [], binding = null) {
  const difference = project?.zero_date
    ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${project.zero_date}T00:00:00Z`)) / 86400000)
    : null
  const day = Number.isFinite(difference) ? difference : null
  const display = projectDayLabel(day)
  const items = entries.filter(entry => entry.status !== 'cancelled'
    && (entry.due_on === today || entry.actual_on === today)
    && (entry.source === 'milestone' || (entry.source === 'event' && entry.kind === 'event')
      || (entry.source === 'assessment' && binding?.status === 'active' && Number(entry.binding_id) === Number(binding.id))))
  const pendingAssessments = items.filter(entry => entry.source === 'assessment' && entry.status !== 'done')
  const pending = items.filter(entry => entry.status !== 'done')
  const title = rows => rows[0].title + (rows.length > 1 ? ` 等 ${rows.length} 个节点` : '')
  const caption = !display ? '' : day === 0 ? '正式启动' : `项目第 ${day} 天`
  const base = { day, display, caption, items, tone: 'default', label: '日常日程', title: ({ paused: '项目已暂停', completed: '项目已完成', terminated: '项目已终止', archived: '项目已归档' }[project?.status] || '项目进行中') }
  if (day === null) return { ...base, label: '启动日待确认', title: '先确定项目的第 0 天' }
  if (day < 0) return { ...base, items: [], label: '正式启动日', title: '项目尚未启动' }
  if (day === 0) return { ...base, tone: 'launch', label: '正式启动日', title: items.length ? title(items) : '今天，项目正式启动' }
  if (pendingAssessments.length) return { ...base, tone: 'assessment', label: '本期考核节点日', title: title(pendingAssessments) }
  if (pending.length) return { ...base, tone: 'milestone', label: '关键节点日', title: title(pending) }
  if (items.length) return { ...base, tone: 'complete', label: '今日节点已完成', title: title(items) }
  return base
}
