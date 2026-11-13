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

// 旧独立地址与营期地址使用同一组栏目，当前URL只表示当前位置。
export function canonicalProjectTab(tab, hasBinding = false) {
  const aliases = { assessment: 'delivery', 'camp-members': 'members', 'camp-meetings': 'meetings', 'camp-outcomes': 'outcomes' }
  if (tab === 'members' && !hasBinding) return 'team'
  return aliases[tab] || tab || 'overview'
}
export function nativeWorkspaceTabs({ project, binding, teacher, session }) {
  const tabs = [{ key: 'overview', label: '工作概览', icon: 'House' }]
  if (project) {
    tabs.push({ key: 'calendar', label: '项目日历', icon: 'Calendar', group: teacher ? '本期共享' : '长期项目' },
      { key: 'records', label: '记录与成果', icon: 'Files', group: teacher ? '本期共享' : '长期项目' })
    if (!teacher && project.my_role) tabs.push({ key: 'team', label: '长期团队', icon: 'User', group: '长期项目' }, { key: 'camps', label: '参加的营期', icon: 'Link', group: '长期项目' })
  }
  if (binding?.can_read_work) {
    tabs.push(...[
      { key: 'delivery', label: '本期考核', icon: 'DocumentChecked' },
      { key: 'meetings', label: '本期组会', icon: 'ChatDotRound' },
      { key: 'members', label: '本期参营人员', icon: 'User' },
      { key: 'outcomes', label: '本期成果', icon: 'Collection' },
    ].map(t => ({ ...t, group: binding.status === 'ended' ? '本期档案' : '本期工作' })))
    if (!teacher && binding.status === 'active' && session.status !== 'archived') {
      tabs.push({ key: 'activities', label: '活动考勤', icon: 'Calendar', group: '本期工作' })
      if (session.policy?.capabilities?.attendance && session.policy.attendance_mode === 'weekly' && binding.my_role === 'leader') tabs.push({ key: 'weekly', label: '周考勤', icon: 'DataLine', group: '本期工作' })
    }
    if (binding.status === 'active') tabs.push(...projectWorkspaceTabs({ teacher, scope: 'project', session, unitRole: binding.my_role }).filter(t => t.camp).map(t => ({ ...t, group: '营期事务' })))
  }
  if (!teacher && project?.can_manage) tabs.push(
    { key: 'settings', label: '项目设置', icon: 'Setting', group: '项目管理' },
    { key: 'history', label: '变更记录', icon: 'Clock', group: '项目管理' },
    { key: 'publish', label: '公开展示', icon: 'Promotion', group: '项目管理' },
  )
  return tabs
}
