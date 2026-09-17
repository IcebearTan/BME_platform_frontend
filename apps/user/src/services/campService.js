// 营期服务层 —— 学员端，直连后端（后端 Phase C/D + E3 已就绪，不走 mock）
import api, { API_URL } from '../api'
import { createAssetUrl } from '@bme/api'

// 资源 URL 前缀拼接：后端返回相对路径（/media/...、/camp/ms/photo/...、过渡期 /data/avatars/...），
// dev 下前端 8081 与后端 5001 跨域，必须拼 API_URL（别像社区页裸用相对路径）。
// 实现已提升到 @bme/api 的 createAssetUrl（两 app 共享），此处 re-export 保持既有导入不破。
export const assetUrl = createAssetUrl({ baseURL: API_URL })

// 选导生阶段中文标签（单轮制三态：未开始 → 收集志愿 → 已截止出结果）
export const MS_PHASE_LABEL = {
  disabled: '未启用',
  upcoming: '未开始',
  collecting: '收集志愿',
  done: '已截止出结果',
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

  // 营期课程目录（learning=方向派生 / project=CampCourse）
  fetchCourses: (sid) => api.get(`/camp/sessions/${sid}/courses`).then(r => r.data),

  // 我的学习方向（09-12 方向制：随归属导生继承，含章节认证进度）
  fetchMyDirection: (sid) => api.get(`/camp/sessions/${sid}/my-direction`).then(r => r.data),

  // 团队进度与按章认证（导生）
  fetchTeamProgress: (sid) => api.get(`/camp/sessions/${sid}/team/progress`).then(r => r.data),
  // 09-13 按章评分：score=0-100 可空（null 只认证不打分；已认证行带 score 重 POST=改分）
  certifyChapter: (sid, student_user_id, chapter_id, score = null) =>
    api.post(`/camp/sessions/${sid}/team/progress/certify`,
      { student_user_id, chapter_id, ...(score != null && { score }) }).then(r => r.data),
  revokeChapterCertification: (sid, student_user_id, chapter_id) =>
    api.delete(`/camp/sessions/${sid}/team/progress/certify`, { data: { student_user_id, chapter_id } }).then(r => r.data),

  // ── 章节材料（09-14：学员按章提交文字+附件，提交即可见，导生查看下载）──
  // 列表：student_user_id 缺省=本人；导生查本团队成员传显式 id；chapter_id 可选过滤
  fetchChapterMaterials: (sid, params = {}) =>
    api.get(`/camp/sessions/${sid}/materials`, { params }).then(r => r.data),
  submitChapterMaterial: (sid, chapterId, content, files = []) => {
    const fd = new FormData()
    fd.append('chapter_id', chapterId)
    if (content) fd.append('content', content)
    files.forEach((f) => fd.append('Files', f))
    return api.post(`/camp/sessions/${sid}/materials`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  deleteChapterMaterial: (mid) => api.delete(`/camp/materials/${mid}`).then(r => r.data),
  // 附件短签直连（2026-09-17 修旧链裸链 401：<a target=_blank> 带不了 Authorization 头，
  // 点击下载时先换签再开新窗；2h 多次有效，见后端 blueprints/media_sign.py）
  fetchMaterialAttachmentUrl: (aid) =>
    fetchSignedMediaUrl(`/camp/materials/attachments/${aid}/token`),

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
  fetchCampMedals: (sid) =>
    api.get('/camp/medals', { params: { sid } }).then(r => r.data),

  // ── 营期主页（后台指定的当前营期）+ 加入申请 ──
  fetchFeatured: () =>
    api.get('/camp/featured').then(r => r.data),
  // 学员报名入营（工作台报名页提交）：承诺出勤日必填（09-12 砍意向大组——组别随归属导生继承）
  requestJoin: (sid, selected_days, reason = '') =>
    api.post(`/camp/sessions/${sid}/join-request`, { selected_days, reason }).then(r => r.data),
  // 撤回本人待审批的申请（导生报名/学员入营通用；撤回后可重新提交）
  cancelJoin: (sid) =>
    api.post(`/camp/sessions/${sid}/join-request/cancel`).then(r => r.data),

  // 导生报名入营（自由报名，2026-09-12 起：LV≥2 在 upcoming/selecting 窗口自助提交，
  // 提交后待管理员审批；重复提交与首提都走 200 + message；403/400 的 message 可直接展示）
  registerMentor: (sid) =>
    api.post(`/camp/sessions/${sid}/mentor-registration`).then(r => r.data),

  // 我的加入申请（行含 apply_role/status；pending 的 mentor 行用于「报名待审核」态判定）
  fetchMyJoinRequests: () =>
    api.get('/camp/join-requests/mine').then(r => r.data),

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
  fetchMsFavorites: (sid) =>
    api.get(`/camp/ms/${sid}/favorites`).then(r => r.data),
  setMsFavorite: (sid, mentorId, favorited) =>
    (favorited ? api.put(`/camp/ms/${sid}/favorites/${mentorId}`)
      : api.delete(`/camp/ms/${sid}/favorites/${mentorId}`)).then(r => r.data),
  submitMsPreferences: (sid, list) =>
    api.post(`/camp/ms/${sid}/preferences`, { list }).then(r => r.data),

  // 导生端：谁报了我（收集期只读名单）/ 我的团队
  fetchMsSuitors: (sid) =>
    api.get(`/camp/ms/${sid}/suitors`).then(r => r.data),
  fetchMsMatched: (sid) =>
    api.get(`/camp/ms/${sid}/matched`).then(r => r.data),

  // 导生端：协调期（志愿截止后）自助勾选——人员确认名单 / 勾选 / 释放
  // （D-4：与老师批量指派共用写入路径，释放仅限自己勾选的学员）
  fetchMsPickRoster: (sid) =>
    api.get(`/camp/ms/${sid}/pick/roster`).then(r => r.data),
  msPickStudent: (sid, studentId) =>
    api.post(`/camp/ms/${sid}/pick`, { student_user_id: studentId }).then(r => r.data),
  msReleaseStudent: (sid, studentId) =>
    api.post(`/camp/ms/${sid}/pick`, { student_user_id: studentId, action: 'release' }).then(r => r.data),

  // 结果（done 后）
  fetchMsResults: (sid) =>
    api.get(`/camp/ms/${sid}/results`).then(r => r.data),

  // ── 项目营（阶段3；后端 blueprints/camp_project.py）──
  // 我的项目工作台汇总：申报（版本历史）/我负责的/我参与的/3 上限余量/可否申报
  // （只返回本人数据；非成员在申报期 upcoming 也可调用——申报入口卡数据源）
  fetchProjectMine: (sid) =>
    api.get(`/camp/projects/${sid}/mine`).then(r => r.data),
  // 负责人提交申报（仅 upcoming；退回重提=后端自动升版本）
  submitProjectApplication: (sid, form) =>
    api.post(`/camp/projects/${sid}/applications`, form).then(r => r.data),
  // 营内过审项目列表（组队浏览/工作区共用；带 my_role/my_pref_rank/member_count）
  fetchProjectList: (sid) =>
    api.get(`/camp/projects/${sid}/list`).then(r => r.data),
  // 组长活动考勤（09-13）：我参与的各项目活动 + 出席态；负责的项目带 is_leader
  fetchProjectActivities: (sid) =>
    api.get(`/camp/projects/${sid}/activities`).then(r => r.data),
  createProjectActivity: (unitId, body) =>
    api.post(`/camp/units/${unitId}/activities`, body).then(r => r.data),
  deleteProjectActivity: (activityId) =>
    api.delete(`/camp/units/activities/${activityId}`).then(r => r.data),
  markProjectActivity: (activityId, presentUserIds) =>
    api.put(`/camp/units/activities/${activityId}/attendance`,
      { present_user_ids: presentUserIds }).then(r => r.data),
  // 学员项目志愿（单轮 1-3 有序，整组替换；仅 selecting）
  fetchProjectPreferences: (sid) =>
    api.get(`/camp/projects/${sid}/preferences/mine`).then(r => r.data),
  submitProjectPreferences: (sid, preferences) =>
    api.post(`/camp/projects/${sid}/preferences`, { preferences }).then(r => r.data),
  // 统一 roster 勾选 API（负责人；expected_version 乐观锁 + 幂等键 + 逐项回报）
  fetchSelectionRoster: (unitId) =>
    api.get(`/camp/units/${unitId}/selection-roster`).then(r => r.data),
  putMemberSelection: (unitId, body) =>
    api.put(`/camp/units/${unitId}/member-selection`, body).then(r => r.data),

  // ── 项目营交付（阶段4；后端 blueprints/camp_delivery.py）──
  // 平台默认模板（负责人选起点可读 active 列表）
  fetchPlatformTemplates: () =>
    api.get('/camp/project-templates').then(r => r.data),
  // 项目模板：查（含 instantiated 标记）/ 三起点创建（blank|platform|clone，创建即实例化里程碑）/ 编辑
  fetchUnitTemplate: (unitId) =>
    api.get(`/camp/units/${unitId}/template`).then(r => r.data),
  fetchTemplateSources: (sid) =>
    api.get(`/camp/sessions/${sid}/template-sources`).then(r => r.data),
  createUnitTemplate: (unitId, body) =>
    api.post(`/camp/units/${unitId}/template`, body).then(r => r.data),
  updateUnitTemplate: (unitId, body) =>
    api.put(`/camp/units/${unitId}/template`, body).then(r => r.data),
  // 里程碑：列表（带请求者可见版本链/节点评价块与 my_role）/ 负责人增删改
  fetchMilestones: (unitId) =>
    api.get(`/camp/units/${unitId}/milestones`).then(r => r.data),
  addMilestone: (unitId, body) =>
    api.post(`/camp/units/${unitId}/milestones`, body).then(r => r.data),
  updateMilestone: (mid, body) =>
    api.put(`/camp/milestones/${mid}`, body).then(r => r.data),
  deleteMilestone: (mid) =>
    api.delete(`/camp/milestones/${mid}`).then(r => r.data),
  // 节点评价（09-13 评价制交付）：负责人对成员 upsert 分数 0-100 + 评语
  evaluateMilestoneNode: (mid, memberUid, body) =>
    api.put(`/camp/milestones/${mid}/evaluations/${memberUid}`, body).then(r => r.data),
  // 项目营·单元周考勤面板（负责人视角）
  fetchUnitWeeklyAttendance: (unitId) =>
    api.get(`/camp/units/${unitId}/attendance/weekly`).then(r => r.data),
  // 提交（multipart：content + Files[] 附件）/ 版本链 / 审核（approve|return）
  submitMilestone: (mid, content, files = []) => {
    const fd = new FormData()
    if (content) fd.append('content', content)
    files.forEach((f) => fd.append('Files', f))
    return api.post(`/camp/milestones/${mid}/submissions`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  reviewSubmission: (subId, body) =>
    api.post(`/camp/submissions/${subId}/review`, body).then(r => r.data),
  fetchSubmissionAttachmentUrl: (aid) =>
    fetchSignedMediaUrl(`/camp/submissions/attachments/${aid}/token`),
  // 成果：登记（负责人）/ 核验（admin）
  fetchOutcomes: (unitId) =>
    api.get(`/camp/units/${unitId}/outcomes`).then(r => r.data),
  registerOutcome: (unitId, body) =>
    api.post(`/camp/units/${unitId}/outcomes`, body).then(r => r.data),
  // 结营档案（成员可读；修正 admin）
  fetchArchive: (sid) =>
    api.get(`/camp/sessions/${sid}/archive`).then(r => r.data),

  // ── 组会留档（2026-09-17：培训组=导生组 / 项目组；组长与负责人提交，组员查看）──
  // 我的培训组组会（导生=本人组，学员=归属导生组；未编组返回 group=null 空态）
  fetchTeamMeetings: (sid) =>
    api.get(`/camp/sessions/${sid}/team-meetings`).then(r => r.data),
  fetchUnitMeetings: (unitId) =>
    api.get(`/camp/units/${unitId}/meetings`).then(r => r.data),
  createTeamMeeting: (sid, form) =>
    api.post(`/camp/sessions/${sid}/team-meetings`, meetingFormData(form),
      { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  createUnitMeeting: (unitId, form) =>
    api.post(`/camp/units/${unitId}/meetings`, meetingFormData(form),
      { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  updateMeeting: (mid, form) =>
    api.put(`/camp/meetings/${mid}`, meetingFormData(form),
      { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  deleteMeeting: (mid) =>
    api.delete(`/camp/meetings/${mid}`).then(r => r.data),
  deleteMeetingAttachment: (aid) =>
    api.delete(`/camp/meetings/attachments/${aid}`).then(r => r.data),
  // 媒体直连短签（<a>/<video> 带不了 Authorization 头；点击下载/播放时换取，2h 有效）
  fetchMeetingAttachmentUrl: (aid) =>
    fetchSignedMediaUrl(`/camp/meetings/attachments/${aid}/token`),
}

// 附件短签直连共用：换签后拼 API_URL 得完整 URL（相对 /camp/... 路径）
async function fetchSignedMediaUrl(tokenPath) {
  const r = await api.get(tokenPath)
  return assetUrl(r.data.url)
}

// 组会表单 → FormData（文字字段 + Files[] 多文件一步式，与章节材料同款）
function meetingFormData({ title, meeting_date, content, files = [] }) {
  const fd = new FormData()
  fd.append('title', title)
  fd.append('meeting_date', meeting_date)
  if (content) fd.append('content', content)
  files.forEach((f) => fd.append('Files', f))
  return fd
}
