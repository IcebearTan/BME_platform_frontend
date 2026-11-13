// 通知深链映射 — 铃铛与收件箱共用的 action registry（方案 §8.3 首期：
// source_type → 路由目标；服务端后续切 action_type + payload 时只改这一个文件）
//
// 约定：/camp 页按 query 定位（sid=营期，tab=业务域），CampView 对非法 tab 自动回落。

/** 私信域（感谢信等）统一去收件箱私信 tab */
const MESSAGE_TARGET = { path: '/notifications', query: { tab: 'message' } }

/** 版本公告识别：脚本扇出行带 source_type=platform_release；历史上经管理面板手发的
 *  版本公告（source_type=admin，如「BME 平台 v3.5 更新公告」）按标题归口——
 *  两者点击都直达更新日志页，避免同类更新通知一半去公告中心、一半落通知中心。 */
export function isReleaseAnnouncement(item) {
  if (!item) return false
  if (item.source_type === 'platform_release') return true
  const title = item.title || ''
  return item.category === 'system' && /v\d+(?:\.\d+)+/.test(title) && /更新|版本/.test(title)
}

/**
 * 解析一条通知的点击目标。
 * @param {Object} item 通知行（category / source_type / camp_session_id）
 * @returns {Object} vue-router 路由地址（router.push 入参）
 */
export function notificationTarget(item) {
  if (!item) return { path: '/notifications' }
  if(item.source_type==='project_core'&&item.source_id)return{path:`/project-activity/${item.source_id}`}
  // 私信域提醒（新行 category=message，存量行 gratitude）直达私信 tab
  if (item.category === 'message' || item.category === 'gratitude') {
    return MESSAGE_TARGET
  }
  // 内部工作台（feature/work-collab）：work_item 深链直达事项；撤权后事项 404
  // 由详情页统一渲染「内容不可访问」空态（§10.2 信息零泄露）
  if (item.category === 'work') {
    if (item.source_type === 'work_item' && item.source_id) {
      return { path: `/work/items/${item.source_id}` }
    }
    return { path: '/work' }
  }
  // 平台发版公告（脚本扇出 + 历史手发行，见 isReleaseAnnouncement）：直达更新日志页
  if (isReleaseAnnouncement(item)) {
    return { path: '/changelog' }
  }
  // 身份域（登录一次性核验提醒 / outbox 投递的归并结果通知）：直达身份中心
  if (item.source_type === 'identity_remind' || item.source_type === 'identity') {
    return { path: '/user-center/identity' }
  }
  // 社区互动（回复/点赞，L2-1）：source_id=帖子 id，直达帖子页
  if (item.source_type === 'discussion_reply' || item.source_type === 'discussion_like') {
    return item.source_id
      ? { path: `/community/thread/${item.source_id}` }
      : { path: '/community' }
  }
  if (item.category !== 'camp') {
    // 兜底去通知中心时带上 id：收件箱据此直接选中该条并在右栏展示详情，免去再点一次
    return { path: '/notifications', query: item.id ? { id: item.id } : {} }
  }
  const sid = item.camp_session_id
  const withSid = (query) => (sid ? { path: '/camp', query: { ...query, sid } } : { path: '/camp' })
  switch (item.source_type) {
    case 'project_node':
      return withSid({ scope: 'project', tab: 'delivery', node: item.source_id })
    case 'camp_project':
      return withSid({ tab: 'overview' })
    case 'leave':              // 请假提交（审批人）/审批结果（学员）→ 各自视角的请假页
      return withSid({ tab: 'leave' })
    case 'camp_meeting':       // 组会/任务 → 组会任务 tab（项目营自动回落 ProjectHub）
      return withSid({ tab: 'meetings' })
    case 'camp_course':        // 章节认证/课程完成 → 学习方向
      return withSid({ tab: 'study' })
    case 'mentor_selection':   // 选导生阶段/志愿（存量 source_type）
      return withSid({ tab: 'ms' })
    case 'reward':             // 勋章 → 我的勋章
      return { path: '/medal/user-medal' }
    case 'join_request':       // 报名结果 → 该营工作台（拒绝等无 sid 行回落营期中心）
      return withSid({})
    case 'camp_session':       // 开营/结营/成员变更/改派 → 营期概览
    case 'camp_admin':         // 管理侧待办（报名/导生报名）→ 营期（审批动作在管理端，文案已注明）
      return withSid({})
    case 'camp_staff':         // 负责人委任/解除 → 老师工作台
      return withSid({ perspective: 'teacher' })
    case 'camp_announcement':   // 公告发布扇出的通知 → 营工作台（公告在看板顶部）
      return withSid({})
    default:
      return { path: '/camp' }
  }
}
