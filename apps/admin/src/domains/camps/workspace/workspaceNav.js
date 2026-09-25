// 营期工作区局部导航（设计方案 §7.3 稳定外壳）：6 个稳定分组。
// applies(ctx) 是 visibleTabs 门禁的唯一下沉点——导航可见性、路由守卫、blocked 原因文案共用。
// manageOnly 项：!canManage 时可见带锁（403 态），不隐藏（方案 §10.5 权限反馈）。

export const WORKSPACE_GROUPS = [
  { key: 'overview', label: '概览', items: [
    { name: 'camp.overview', label: '概览', order: 10 },
  ] },
  { key: 'people', label: '人员与组织', items: [
    { name: 'camp.people.members', label: '成员名单', order: 10 },
    { name: 'camp.people.applications', label: '加入申请', order: 20, manageOnly: true },
    { name: 'camp.people.staff', label: '负责人与老师', order: 30, manageOnly: true },
  ] },
  { key: 'operations', label: '教学与运行', items: [
    { name: 'camp.ops.courses', label: '课程', order: 10, applies: (ctx) => ctx.isProject },
    { name: 'camp.ops.attendance', label: '考勤', order: 20, applies: (ctx) => !ctx.isProject && ctx.capOn('attendance') },
    { name: 'camp.ops.leaves', label: '请假', order: 30, applies: (ctx) => ctx.capOn('leave') },
    { name: 'camp.ops.seats', label: '座位分配', order: 40, applies: (ctx) => ctx.capOn('seat') },
    { name: 'camp.ops.rewards', label: '奖励', order: 50 },
  ] },
  { key: 'learning', label: '培训营工作区', items: [
    { name: 'camp.learning.mentorMatching', label: '导生招募与匹配', order: 10, applies: (ctx) => ctx.isLearning, manageOnly: true },
    { name: 'camp.learning.progress', label: '学习进度', order: 20, applies: (ctx) => ctx.isLearning },
  ] },
  { key: 'project', label: '项目营工作区', items: [
    { name: 'camp.project.applications', label: '项目申报', order: 10, applies: (ctx) => ctx.isProject, manageOnly: true },
    { name: 'camp.project.formation', label: '项目组队', order: 20, applies: (ctx) => ctx.isProject, manageOnly: true },
    { name: 'camp.project.deliveries', label: '交付审核', order: 30, applies: (ctx) => ctx.isProject, manageOnly: true },
    { name: 'camp.project.archive', label: '成果与归档', order: 40, applies: (ctx) => ctx.isProject, manageOnly: true },
  ] },
  { key: 'settings', label: '设置与生命周期', items: [
    { name: 'camp.settings', label: '营期设置', order: 10, manageOnly: true },
  ] },
]

export const WORKSPACE_ITEMS = WORKSPACE_GROUPS.flatMap((g) => g.items)

export function findNavItem(name) {
  return WORKSPACE_ITEMS.find((i) => i.name === name)
}

// 当前营期上下文下该叶子是否适用（session 未到时 policy 回退开——与旧 visibleTabs 口径一致）
export function isRouteApplicable(name, ctx) {
  const item = findNavItem(name)
  if (!item) return true
  return item.applies ? item.applies(ctx) : true
}

// 不适用原因（overview 页 ?blocked= 告警文案 + 守卫重定向 toast 共用）
export function blockedReason(name, ctx) {
  const item = findNavItem(name)
  if (!item) return '该页面在当前营期不可用'
  if (item.name.startsWith('camp.learning.')) return '该页面仅适用于培训营'
  if (item.name.startsWith('camp.project.')) return '该页面仅适用于项目营'
  if (item.name === 'camp.ops.courses') return '课程目录仅适用于项目营（培训营课程由方向定义）'
  if (item.name === 'camp.ops.attendance') return '本营未启用考勤能力，可在「营期设置」开启'
  if (item.name === 'camp.ops.leaves') return '本营未启用请假能力，可在「营期设置」开启'
  if (item.name === 'camp.ops.seats') return '本营未启用座位能力，可在「营期设置」开启'
  return '该页面在当前营期不可用'
}
