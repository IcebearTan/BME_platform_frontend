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
}
