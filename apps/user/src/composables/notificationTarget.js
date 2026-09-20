// 通知深链映射 — 铃铛与收件箱共用的 action registry（方案 §8.3 首期：
// source_type → 路由目标；服务端后续切 action_type + payload 时只改这一个文件）
//
// 约定：/camp 页按 query 定位（sid=营期，tab=业务域），CampView 对非法 tab 自动回落。

/** 私信域（感谢信等）统一去收件箱私信 tab */
const MESSAGE_TARGET = { path: '/notifications', query: { tab: 'message' } }

/**
 * 解析一条通知的点击目标。
 * @param {Object} item 通知行（category / source_type / camp_session_id）
 * @returns {Object} vue-router 路由地址（router.push 入参）
 */
export function notificationTarget(item) {
  if (!item) return { path: '/notifications' }
  // 私信域提醒（新行 category=message，存量行 gratitude）直达私信 tab
  if (item.category === 'message' || item.category === 'gratitude') {
    return MESSAGE_TARGET
  }
  if (item.category !== 'camp') {
    return { path: '/notifications' }
  }
  const sid = item.camp_session_id
  const withSid = (query) => (sid ? { path: '/camp', query: { ...query, sid } } : { path: '/camp' })
  switch (item.source_type) {
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
    default:
      return { path: '/camp' }
  }
}
