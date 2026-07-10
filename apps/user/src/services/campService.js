// 营期服务层 —— 学员端，直连后端（后端 Phase C/D + E3 已就绪，不走 mock）
import api from '../api'

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
  issueReward: (sid, userId, medalId, description) =>
    api.post('/camp/reward', { camp_session_id: sid, user_id: userId, medal_id: medalId, description }).then(r => r.data),
  fetchMembers: (sid) =>
    api.get(`/camp/sessions/${sid}/members`).then(r => r.data),
  fetchCampMedals: () =>
    api.get('/camp/medals').then(r => r.data),

  // ── 营期主页（后台指定的当前营期）+ 加入申请 ──
  fetchFeatured: () =>
    api.get('/camp/featured').then(r => r.data),
  requestJoin: (sid, reason) =>
    api.post(`/camp/sessions/${sid}/join-request`, { reason }).then(r => r.data),
}
