// 营期服务层 —— 学员端，直连后端（后端 Phase C/D + E3 已就绪，不走 mock）
import api, { API_URL } from '../api'

// 资源 URL 前缀拼接：后端返回相对路径（/camp/ms/photo/...、/data/avatars/...），
// dev 下前端 8081 与后端 5001 跨域，必须拼 API_URL（别像社区页裸用相对路径）
export const assetUrl = (path) => (path ? API_URL + path : '')

// 选导生阶段中文标签
export const MS_PHASE_LABEL = {
  disabled: '未启用',
  upcoming: '即将开始',
  collecting: '志愿提交',
  round1: '导生挑选',
  round2: '二轮互选',
  done: '已结束',
}

// ── 考勤状态渲染归类（前端唯一真相源，各渲染面共用）──
// 后端 9 态细分保留（统计/鲁棒性），视觉层收敛：4 判定色（出勤/未达标/缺勤/请假）+ 2 中性态（待考勤/未承诺）；
// 「迟到」降级为角标不是颜色（达标率口径本就 present+late 都算出勤）。
// 管理端 BME_backend/CampAttendanceBoard.vue 有一份同步拷贝，改这里记得同步。
export const CAMP_STATUS_TEXT = {
  present: '出勤', late: '出勤·迟到',
  short_hours: '未达标', late_and_short: '未达标·迟到',
  absent: '缺勤', on_leave: '请假',
  pledged: '待考勤', in_progress: '进行中', unpledged: '未承诺',
}
// status → 视觉键：present / insufficient / absent / on_leave / pending / unpledged
// isToday：今天还没打卡时后端按无记录判 absent，前端不下结论 → 归为待考勤
export function campVisualKey(status, isToday = false) {
  if (status === 'absent' && isToday) return 'pending'
  switch (status) {
    case 'present': case 'late': return 'present'
    case 'short_hours': case 'late_and_short': return 'insufficient'
    case 'absent': return 'absent'
    case 'on_leave': return 'on_leave'
    case 'pledged': case 'in_progress': return 'pending'
    default: return 'unpledged'
  }
}

// 本地时区的今天 YYYY-MM-DD（toISOString 是 UTC，东八区凌晨 0~8 点会差一天）
export function todayLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const campService = {
  // 我加入的营期（后端按 user_id 自动过滤）
  fetchSessions: () => api.get('/camp/sessions').then(r => r.data),

  // 营期可选课程目录
  fetchCourses: (sid) => api.get(`/camp/sessions/${sid}/courses`).then(r => r.data),

  // 选课 / 我的选课
  pickCourse: (sid, course_id) =>
    api.post('/camp/selection', { camp_session_id: sid, course_id }).then(r => r.data),
  fetchMyCourses: (sid) =>
    api.get('/camp/selection/mine', { params: sid ? { camp_session_id: sid } : {} }).then(r => r.data),

  // 请假提交 / 我的请假历史
  submitLeave: (sid, start_date, end_date, reason) =>
    api.post('/camp/leave', { camp_session_id: sid, start_date, end_date, reason }).then(r => r.data),
  fetchMyLeaves: (sid) =>
    api.get('/camp/leave/mine', { params: sid ? { camp_session_id: sid } : {} }).then(r => r.data),

  // 我的考勤（某营）
  fetchMyAttendance: (sid) =>
    api.get('/camp/attendance/mine', { params: { camp_session_id: sid } }).then(r => r.data),

  // ── 导生团队事务（@camp_role 端点，对导生自动收敛本团队）──
  fetchDashboard: (sid, params = {}) =>
    api.get(`/camp/attendance/dashboard/${sid}`, { params }).then(r => r.data),
  fetchTeamLeaves: (sid) =>
    api.get(`/camp/sessions/${sid}/leave`).then(r => r.data),
  approveLeave: (id, approve) =>
    api.post(`/camp/leave/${id}/approve`, { approve }).then(r => r.data),
  revokeLeave: (id) =>
    api.post(`/camp/leave/${id}/revoke`).then(r => r.data),
  issueReward: (sid, userId, medalId, description) =>
    api.post('/camp/reward', { camp_session_id: sid, user_id: userId, medal_id: medalId, description }).then(r => r.data),
  fetchMembers: (sid) =>
    api.get(`/camp/sessions/${sid}/members`).then(r => r.data),
  fetchCampMedals: () =>
    api.get('/camp/medals').then(r => r.data),

  // ── 营期主页（后台指定的当前营期）+ 加入申请 ──
  fetchFeatured: () =>
    api.get('/camp/featured').then(r => r.data),
  requestJoin: (sid, selected_days, reason = '') =>
    api.post(`/camp/sessions/${sid}/join-request`, { selected_days, reason }).then(r => r.data),

  // ── 选导生（开营前置阶段；后端 blueprints/camp_ms.py）──
  // 阶段总览（含按身份视角数据；读端点顺带触发阶段过渡通知）
  fetchMsPhase: (sid) =>
    api.get(`/camp/ms/${sid}/phase`).then(r => r.data),

  // 导生名片：查/存/传照片（multipart，字段名 avatar 同头像接口）
  fetchMsProfile: (sid) =>
    api.get(`/camp/ms/${sid}/profile`).then(r => r.data),
  saveMsProfile: (sid, { bio, tags, capacity }) =>
    api.put(`/camp/ms/${sid}/profile`, { bio, tags, capacity }).then(r => r.data),
  uploadMsPhoto: (sid, file) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return api.post(`/camp/ms/${sid}/profile/photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  // 学员端：浏览导生卡片（可选 tag 过滤）/ 我的志愿 / 提交志愿（整组替换）
  fetchMsMentors: (sid, tag) =>
    api.get(`/camp/ms/${sid}/mentors`, { params: tag ? { tag } : {} }).then(r => r.data),
  fetchMsPreferences: (sid) =>
    api.get(`/camp/ms/${sid}/preferences/mine`).then(r => r.data),
  submitMsPreferences: (sid, list) =>
    api.post(`/camp/ms/${sid}/preferences`, { list }).then(r => r.data),

  // 导生端：意向单（选我的学员）/ 收下 / 我的团队
  fetchMsSuitors: (sid) =>
    api.get(`/camp/ms/${sid}/suitors`).then(r => r.data),
  msPickStudent: (sid, student_id) =>
    api.post(`/camp/ms/${sid}/pick`, { student_id }).then(r => r.data),
  fetchMsMatched: (sid) =>
    api.get(`/camp/ms/${sid}/matched`).then(r => r.data),

  // 结果（done 后）
  fetchMsResults: (sid) =>
    api.get(`/camp/ms/${sid}/results`).then(r => r.data),
}
