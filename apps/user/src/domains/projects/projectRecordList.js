export const recordKinds = { meeting: '项目组会', record: '研发记录', outcome: '项目成果' }
export const recordStates = { published: '已记录', pending: '待核验', verified: '已核验', rejected: '待补充', submitted: '待核验' }
export function recordDate(row) { return String(row.occurred_on || row.created_at || '').slice(0, 10) }
export function groupRecords(rows, mode = 'month') {
  const groups = new Map()
  for (const row of [...rows].sort((a, b) => recordDate(b).localeCompare(recordDate(a)) || Number(b.id) - Number(a.id))) {
    const date = recordDate(row), key = date ? date.slice(0, mode === 'day' ? 10 : 7) : 'undated'
    if (!groups.has(key)) groups.set(key, { key, label: date ? key.replace(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/, (_, y, m, d) => `${y}年${Number(m)}月${d ? Number(d) + '日' : ''}`) : '日期未记录', rows: [] })
    groups.get(key).rows.push(row)
  }
  return [...groups.values()]
}
export function filterOutcomes(rows, { q = '', from = '', to = '' } = {}) {
  const keyword = q.trim().toLocaleLowerCase()
  return rows.filter(row => {
    const date = recordDate(row)
    if ((from && (!date || date < from)) || (to && (!date || date > to))) return false
    return [row.title, row.description, row.reject_reason, ...(row.contributors || [])].join(' ').toLocaleLowerCase().includes(keyword)
  })
}
