export const calendarKindText = {
  milestone: '研发里程碑', event: '关键事件', meeting: '项目组会', record: '研发记录',
  outcome: '项目成果', assessment: '本期考核', project_start: '项目启动',
}

export const calendarStatusText = { planned: '计划中', done: '已完成', cancelled: '已取消' }

export const editableCalendarKinds = Object.entries(calendarKindText)
  .filter(([kind]) => !['assessment', 'project_start'].includes(kind))
  .map(([value, label]) => ({ value, label }))

export function calendarEntryStatus(entry) {
  return entry.status_label || calendarStatusText[entry.status] || '已记录'
}

export function calendarEntriesOnDate(entries, date) {
  return entries.filter(entry => entry.due_on === date || entry.actual_on === date)
}
