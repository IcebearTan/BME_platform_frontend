// Local preview API used by the reproducible UI and Playwright workflows.
import { createReadStream, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const port = 5002;
const assetDir = join(process.cwd(), 'apps', 'user', 'src', 'assets');
// 本地演示服务器：放行任意端口的本机来源（端口随启动方式浮动，写死会挡掉自定义端口的预览实例）
function isLocalOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

const mentorFixtures = [
  ['林泽宇', 'mentor1', ['软件开发', '人工智能', '算法与数据'], 4, 3, '代码是我表达想法的语言，也是改变世界的方式。', 'LuMengXuan.jpg'],
  ['周启航', 'mentor2', ['硬件创新', '产品实践'], 4, 3, '一起做真实项目，关注协作过程与产品落地。', 'ChenMinJie.jpg'],
  ['陈思涵', 'mentor3', ['人工智能', '算法与数据'], 3, 2, '让数据真正帮助人，也欢迎对算法和工程实现感兴趣的同学。', 'Jerry_Scintilla_avatar.jpg'],
  ['沈知行', 'mentor4', ['软件开发', '产品实践'], 3, 2, '先做起来，再把每一次迭代变成经验。', 'ice_bear_avatar.jpg'],
  ['王嘉仪', 'mentor5', ['人工智能', '产品实践'], 3, 2, '把复杂的问题拆小，把可靠的方案做实。', 'image.png'],
  ['唐予安', 'mentor6', ['硬件创新', '软件开发'], 3, 1, '从一个可验证的原型开始，再一起把它推向下一步。', '暑期训练营.png'],
  ['许一诺', 'mentor7', ['算法与数据', '人工智能'], 3, 1, '喜欢把好奇心变成可以被复现的结果。', 'ジエ_avatar.png'],
  ['程知远', 'mentor8', ['产品实践', '软件开发'], 3, 0, '沟通、复盘、交付，都是项目能力的一部分。', 'back_groud.jpg'],
].map(([username, handle, tags, capacity, matched, bio, photo], index) => ({
  user_id: 101 + index,
  username,
  handle,
  tags,
  capacity,
  matched,
  remaining: capacity - matched,
  full: matched >= capacity,
  bio,
  photo_url: `/camp/ms/photo/${photo}`,
}));

const studentNames = [
  '李沐阳', '赵语桐', '孙可欣', '钱思远', '周雨晴', '吴昊然', '郑书涵', '王星宇',
  '冯子轩', '陈梦琪', '褚嘉树', '卫欣怡', '蒋承宇', '沈佳宁', '韩子墨', '杨若琳',
  '朱逸凡', '秦思萌', '尤天乐', '许嘉言',
];
const studentFixtures = studentNames.map((username, index) => ({
  user_id: 201 + index,
  username,
  handle: `student${String(index + 1).padStart(2, '0')}`,
}));
const candidateFixtures = [
  { user_id: 301, username: '方子航', handle: 'candidate1', role: 'student' },
  { user_id: 302, username: '罗雨薇', handle: 'candidate2', role: 'student' },
  { user_id: 303, username: '邓嘉诚', handle: 'candidate3', role: 'student' },
];
const previewMembers = [];

const accounts = new Map([
  ['super.localdev@bme.sysu.edu.cn', { password: 'superadmin123', role: 'super_admin', name: '本地超级管理员', user_id: 1 }],
  ['teacher.localdev@bme.sysu.edu.cn', { password: 'teacher123', role: 'teacher', name: '本地教师', user_id: 2 }],
  ...mentorFixtures.map((mentor) => [`${mentor.handle}.localdev@bme.sysu.edu.cn`, {
    password: 'mentor123', role: 'mentor', name: mentor.username, user_id: mentor.user_id,
  }]),
  ...studentFixtures.map((student) => [`${student.handle}.localdev@bme.sysu.edu.cn`, {
    password: 'student123', role: 'student', name: student.username, user_id: student.user_id,
  }]),
  ...candidateFixtures.map((student) => [`${student.handle}.localdev@bme.sysu.edu.cn`, {
    password: 'student123', role: student.role, name: student.username, user_id: student.user_id,
  }]),
]);

const preferencesByStudent = new Map();
studentFixtures.slice(0, 16).forEach((student, studentIndex) => {
  preferencesByStudent.set(student.user_id, [0, 1, 2].map((offset) => ({
    mentor_id: mentorFixtures[(studentIndex + offset) % mentorFixtures.length].user_id,
    rank: offset + 1,
    note: offset === 0 ? '期待在项目里一起学习和实践。' : '',
  })));
});
let activeAccount = {
  email: 'super.localdev@bme.sysu.edu.cn',
  role: 'super_admin',
  name: '本地超级管理员',
  user_id: 1,
};

function deadlineAfter(hours) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const campSession = {
  id: 1,
  name: '本地导师双选测试营',
  camp_type: 'short_term',
  start_date: '2026-08-20',
  end_date: '2026-09-20',
  status: 'active',
  is_featured: true,
  member_count: mentorFixtures.length + studentFixtures.length,
  mentor_selection_enabled: true,
  ms_tags: ['软件开发', '人工智能', '算法与数据', '硬件创新', '产品实践'],
};

function activeMemberRole() {
  return activeAccount.role === 'mentor' || activeAccount.role === 'student'
    ? activeAccount.role
    : null;
}

function phasePayload() {
  const memberRole = activeMemberRole();
  const saved = (preferencesByStudent.get(activeAccount.user_id) || []).map((item) => ({
    ...item,
    mentor_name: mentorFixtures.find((mentor) => mentor.user_id === item.mentor_id)?.username || '',
  }));
  return {
    code: 200,
    phase: 'collecting',
    enabled: true,
    config_error: false,
    deadlines: {
      preference_start: deadlineAfter(-24),
      preference_deadline: deadlineAfter(53),
      round1_deadline: deadlineAfter(77),
      round2_deadline: deadlineAfter(101),
    },
    round2_enabled: true,
    ms_tags: campSession.ms_tags,
    stats: { submitted: preferencesByStudent.size, students: studentFixtures.length },
    me: {
      role: memberRole,
      round1: saved,
      round2: [],
      submittable_round: memberRole === 'student' ? 1 : null,
      unmatched: true,
      my_mentor: null,
    },
  };
}

function memberRows() {
  if (!previewMembers.length) {
    const assignedMentors = mentorFixtures.flatMap((mentor) =>
      Array.from({ length: mentor.matched }, () => mentor.user_id));
    previewMembers.push(
      ...mentorFixtures.map((mentor) => ({
      user_id: mentor.user_id, username: mentor.username, role: 'mentor', team_mentor_id: null,
      joined_at: '2026-08-20T09:00:00',
      })),
      ...studentFixtures.map((student, index) => ({
      user_id: student.user_id,
      username: student.username,
      role: 'student',
      team_mentor_id: assignedMentors[index] || null,
      joined_at: '2026-08-20T09:00:00',
      })),
    );
  }
  return previewMembers;
}

function userRows() {
  return [
    { User_Id: 1, User_Name: '本地超级管理员', User_Email: 'super.localdev@bme.sysu.edu.cn', role: 'super_admin' },
    { User_Id: 2, User_Name: '本地教师', User_Email: 'teacher.localdev@bme.sysu.edu.cn', role: 'teacher' },
    ...mentorFixtures.map((mentor) => ({
      User_Id: mentor.user_id, User_Name: mentor.username,
      User_Email: `${mentor.handle}.localdev@bme.sysu.edu.cn`, role: 'mentor',
    })),
    ...studentFixtures.map((student) => ({
      User_Id: student.user_id, User_Name: student.username,
      User_Email: `${student.handle}.localdev@bme.sysu.edu.cn`, role: 'student',
    })),
    ...candidateFixtures.map((student) => ({
      User_Id: student.user_id, User_Name: student.username,
      User_Email: `${student.handle}.localdev@bme.sysu.edu.cn`, role: student.role,
    })),
  ];
}

function msOverviewPayload() {
  const members = memberRows();
  const students = members.filter((member) => member.role === 'student');
  const mentors = mentorFixtures.map((mentor) => {
    const matched = students.filter((student) => student.team_mentor_id === mentor.user_id).length;
    const choseR1 = [...preferencesByStudent.values()].flat().filter((item) => item.mentor_id === mentor.user_id).length;
    return {
      user_id: mentor.user_id, username: mentor.username, has_profile: true,
      capacity: mentor.capacity, chose_r1: choseR1, chose_r2: 0,
      matched, remaining: Math.max(0, mentor.capacity - matched),
    };
  });
  return {
    code: 200,
    phase: 'collecting',
    config_error: false,
    deadlines: phasePayload().deadlines,
    mentors,
    students: students.map((student) => {
      const mentor = mentorFixtures.find((item) => item.user_id === student.team_mentor_id);
      return {
        user_id: student.user_id, username: student.username,
        matched: Boolean(mentor), mentor_name: mentor?.username || null,
        submitted_r1: preferencesByStudent.has(student.user_id), submitted_r2: false,
      };
    }),
    stats: {
      students: students.length,
      matched: students.filter((student) => student.team_mentor_id).length,
      unmatched: students.filter((student) => !student.team_mentor_id).length,
      r2_enabled: true,
    },
  };
}

function sendJson(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (isLocalOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if ((url.pathname === '/auth/login' || url.pathname === '/auth/admin_login') && req.method === 'POST') {
    const body = await readJson(req);
    const email = String(body.User_Email || '').toLowerCase();
    const account = accounts.get(email);
    const passwordHash = account
      ? createHash('md5').update(account.password).digest('hex')
      : '';
    const staffOnly = url.pathname === '/auth/admin_login';
    if (!account || body.User_Password !== passwordHash || (staffOnly && account.role === 'student')) {
      sendJson(res, { code: 400, message: '密码错误、邮箱不存在或账号无后台权限' }, 400);
      return;
    }
    activeAccount = { email, role: account.role, name: account.name, user_id: account.user_id };
    sendJson(res, {
      code: 200,
      token: 'preview-token',
      role: account.role,
      User_ID: account.user_id,
      User_Name: account.name,
      User_Email: email,
      permissions: [],
    });
    return;
  }
  if (url.pathname === '/user/user_index') {
    sendJson(res, {
      code: 200,
      role: activeAccount.role,
      name: activeAccount.name,
      User_ID: activeAccount.user_id,
      User_Name: activeAccount.name,
      User_Email: activeAccount.email,
      permissions: [],
    });
    return;
  }
  if (url.pathname === '/user/user_list') {
    sendJson(res, userRows());
    return;
  }
  if (url.pathname === '/camp/sessions') {
    sendJson(res, {
      code: 200,
      sessions: [{
        ...campSession,
        is_member: Boolean(activeMemberRole()),
      }],
    });
    return;
  }
  if (url.pathname === '/camp/sessions/1') {
    sendJson(res, { code: 200, session: campSession });
    return;
  }
  if (url.pathname === '/camp/sessions/1/members') {
    if (req.method === 'POST') {
      const body = await readJson(req);
      const user = userRows().find((candidate) => candidate.User_Id === Number(body.user_id));
      if (!user || !['mentor', 'student'].includes(user.role)) {
        sendJson(res, { code: 400, message: '仅学员或导生可加入营期' }, 400);
        return;
      }
      const members = memberRows();
      if (members.some((member) => member.user_id === user.User_Id)) {
        sendJson(res, { code: 409, message: '该用户已在营期中' }, 409);
        return;
      }
      members.push({
        user_id: user.User_Id, username: user.User_Name, role: user.role,
        team_mentor_id: user.role === 'student' ? (body.team_mentor_id || null) : null,
        joined_at: new Date().toISOString(),
      });
      campSession.member_count = members.length;
      sendJson(res, { code: 200, message: '已加入', member_id: user.User_Id });
      return;
    }
    sendJson(res, { code: 200, members: memberRows() });
    return;
  }
  if (url.pathname === '/camp/sessions/1/courses') {
    sendJson(res, { code: 200, courses: [] });
    return;
  }
  if (url.pathname === '/camp/sessions/1/seats') {
    sendJson(res, { code: 200, seats: [] });
    return;
  }
  if (url.pathname === '/camp/sessions/1/leave') {
    sendJson(res, { code: 200, leaves: [] });
    return;
  }
  if (url.pathname === '/camp/sessions/1/join-requests') {
    sendJson(res, { code: 200, requests: [], mentors: mentorFixtures });
    return;
  }
  if (/^\/camp\/sessions\/1\/members\/\d+$/.test(url.pathname) && req.method === 'PUT') {
    const memberId = Number(url.pathname.split('/').pop());
    const member = memberRows().find((item) => item.user_id === memberId);
    const body = await readJson(req);
    const mentorId = body.team_mentor_id ? Number(body.team_mentor_id) : null;
    if (!member || member.role !== 'student' || (mentorId && !mentorFixtures.some((item) => item.user_id === mentorId))) {
      sendJson(res, { code: 400, message: '导生归属无效' }, 400);
      return;
    }
    member.team_mentor_id = mentorId;
    sendJson(res, { code: 200, message: '归属导生已更新' });
    return;
  }
  if (url.pathname === '/camp/ms/1/overview') {
    sendJson(res, msOverviewPayload());
    return;
  }
  if (url.pathname === '/camp/ms/1/phase') {
    sendJson(res, phasePayload());
    return;
  }
  if (url.pathname === '/camp/ms/1/mentors') {
    sendJson(res, { code: 200, phase: 'collecting', mentors: mentorFixtures });
    return;
  }
  if (url.pathname === '/camp/ms/1/preferences' && req.method === 'POST') {
    const body = await readJson(req);
    const preferences = Array.isArray(body.list) ? body.list : [];
    const valid = preferences.length === 3 && preferences.every((item) =>
      mentorFixtures.some((mentor) => mentor.user_id === Number(item.mentor_id)));
    if (activeMemberRole() !== 'student' || !valid) {
      sendJson(res, { code: 400, message: '请按顺序选择 3 位导生' }, 400);
      return;
    }
    preferencesByStudent.set(activeAccount.user_id, preferences.map((item) => ({
      mentor_id: Number(item.mentor_id),
      rank: Number(item.rank) || preferences.indexOf(item) + 1,
      note: String(item.note || '').slice(0, 200),
    })));
    sendJson(res, { code: 200, message: '志愿已提交（本地预览数据）', round: 1, preferences });
    return;
  }
  if (url.pathname.startsWith('/camp/ms/photo/')) {
    const filename = decodeURIComponent(url.pathname.split('/').pop());
    const file = join(assetDir, filename);
    if (existsSync(file)) {
      const type = extname(file).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      createReadStream(file).pipe(res);
      return;
    }
  }
  if (url.pathname === '/notification/list') {
    sendJson(res, { code: 200, notifications: [], total: 0 });
    return;
  }
  if (url.pathname === '/user/user_avatars') {
    sendJson(res, { code: 200, avatars: {} });
    return;
  }
  if (url.pathname === '/course/list') {
    sendJson(res, []);
    return;
  }
  if (url.pathname === '/camp/medals') {
    sendJson(res, { code: 200, medals: [] });
    return;
  }
  if (url.pathname === '/seat/rooms/106/seats') {
    sendJson(res, { code: 200, seats: [] });
    return;
  }
  sendJson(res, {
    code: 404,
    message: `Preview API route not implemented: ${req.method} ${url.pathname}`,
  }, 404);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Mentor market preview API listening on http://127.0.0.1:${port}`);
});
