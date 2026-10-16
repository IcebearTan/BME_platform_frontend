export const PROJECT_TABS = [
  { key: 'overview', label: '工作概览', icon: 'House' },
  { key: 'delivery', label: '节点与交付', icon: 'DocumentChecked' },
  { key: 'meetings', label: '组会与记录', icon: 'ChatDotRound' },
  { key: 'members', label: '项目成员', icon: 'User' },
  { key: 'outcomes', label: '成果与归档', icon: 'Collection' },
]
export const CAMP_TABS = [
  { key: 'overview', label: '工作概览', icon: 'House' },
  { key: 'projects', label: '项目总览', icon: 'Grid' },
  { key: 'meetings', label: '组会总览', icon: 'ChatDotRound' },
  { key: 'members', label: '人员与组队', icon: 'User' },
  { key: 'admissions', label: '报名审批', icon: 'DocumentChecked' },
  { key: 'announcements', label: '营期公告', icon: 'Bell' },
]
export function projectWorkspaceTabs({ teacher, scope, session, unitRole }) {
  const base = teacher && scope === 'camp' ? CAMP_TABS : PROJECT_TABS
  const tabs = session.status === 'archived' ? base.filter(t => teacher ? t.key !== 'admissions' : ['overview', 'delivery', 'members', 'outcomes'].includes(t.key)) : [...base]
  if (session.status === 'upcoming' && !teacher) tabs.push({ key: 'apply', label: '申报项目', icon: 'Edit' })
  if (session.status === 'selecting' && !teacher) tabs.push({ key: 'preferences', label: '项目意向', icon: 'Grid' })
  if (!teacher && scope === 'project' && session.status !== 'archived') {
    tabs.push({ key: 'activities', label: '活动考勤', icon: 'Calendar' })
    if (session.policy?.capabilities?.attendance && session.policy.attendance_mode === 'weekly' && unitRole === 'leader') tabs.push({ key: 'weekly', label: '周考勤', icon: 'DataLine' })
  }
  if (!teacher || session.my_permissions?.includes('reward.issue')) tabs.push({ key: 'points', label: teacher ? '积分奖励' : '营期积分', icon: 'Present', camp: true })
  if (teacher && session.policy?.capabilities?.attendance) tabs.push({ key: 'attendance', label: '全营考勤', icon: 'DataLine', camp: true })
  if (session.status !== 'archived' && session.policy?.capabilities?.leave) tabs.push({ key: 'leave', label: teacher ? '请假审批' : '我的请假', icon: 'Calendar', camp: true })
  if (!teacher) tabs.push({ key: 'announcements', label: '营期公告', icon: 'Bell', camp: true })
  return tabs
}
export function resolveProjectWorkspace(query, { teacher, projects, session }) {
  const scope = teacher && query.scope !== 'project' && !query.unit ? 'camp' : 'project'
  const unit = query.unit ? projects.find(p => String(p.unit_id) === String(query.unit)) || null : projects[0] || null
  const aliases = { projects: 'projects', join: 'overview', lead: 'overview', meetings: 'meetings', pform: 'members', pdeli: 'delivery', pref: 'preferences', leaves: 'leave' }
  const wanted = aliases[query.tab] || query.tab || 'overview'
  const tabs = projectWorkspaceTabs({ teacher, scope, session, unitRole: unit?.my_role })
  const tab = tabs.some(t => t.key === wanted) ? wanted : 'overview'
  return { scope, unit, tabs, tab, invalidUnit: Boolean(query.unit && !projects.some(p => String(p.unit_id) === String(query.unit))) }
}
