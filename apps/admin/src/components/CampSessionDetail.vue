<template>
  <div class="camp-session-detail">
    <div class="header">
      <el-button @click="goBack">返回列表</el-button>
      <span class="title">{{ session.name || '...' }}</span>
      <el-tag v-if="session.status" :type="statusType(session.status)" size="small">{{ statusLabel(session.status) }}</el-tag>
    </div>

    <el-tabs v-model="activeTab" v-loading="loading">
      <!-- ① 成员 -->
      <el-tab-pane label="成员" name="members">
        <div style="margin-bottom: 12px;">
          <el-button v-if="manageWritable" type="primary" size="small" @click="openAddMember">加成员</el-button>
        </div>
        <el-table :data="members" border size="small">
          <el-table-column label="用户" prop="username" min-width="120" />
          <el-table-column label="角色" width="80">
            <template #default="{ row }">{{ row.role === 'mentor' ? '导生' : '学员' }}</template>
          </el-table-column>
          <el-table-column label="归属导生" min-width="140">
            <template #default="{ row }">
              <el-select v-if="row.role === 'student' && manageWritable" :model-value="row.team_mentor_id"
                size="small" placeholder="未分配" clearable @change="(v) => updateMentor(row, v)">
                <el-option v-for="m in mentorMembers" :key="m.user_id" :label="m.username" :value="m.user_id" />
              </el-select>
              <span v-else-if="row.role === 'student'">{{ mentorName(row.team_mentor_id) }}</span>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="加入时间" width="120">
            <template #default="{ row }">{{ row.joined_at ? row.joined_at.slice(0, 10) : '' }}</template>
          </el-table-column>
          <el-table-column v-if="manageWritable" label="操作" width="90">
            <template #default="{ row }">
              <el-button size="small" type="danger" link @click="removeMember(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ② 课程目录 -->
      <el-tab-pane label="课程目录" name="courses">
        <div style="margin-bottom: 12px;">
          <el-button v-if="manageWritable" type="primary" size="small" @click="openAddCourse" :disabled="!availableCourses.length">加课程</el-button>
        </div>
        <el-table :data="courses" border size="small">
          <el-table-column label="课程" prop="title" min-width="200" />
          <el-table-column label="难度" prop="difficulty" width="100" />
          <el-table-column v-if="manageWritable" label="操作" width="80">
            <template #default="{ row }">
              <el-button size="small" type="danger" link @click="removeCourse(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ③ 出勤计划 -->
      <el-tab-pane label="出勤计划" name="plan">
        <el-alert type="info" :closable="false"
          :title="`本营 ${studentMembers.length} 名学员；承诺出勤日按营期范围内工作日（${session.weekdays_only ? '仅周一~周五' : '含周末'}）展开`" />
        <div style="margin-top: 12px;">
          <el-button v-if="manageWritable" type="primary" @click="regenPlan">重生成承诺出勤日</el-button>
          <span class="hint">加入新学员时自动生成；此处可手动重生成（幂等，自动清理范围外/范围内周末的旧承诺日）</span>
        </div>
      </el-tab-pane>

      <!-- ④ 座位 -->
      <el-tab-pane label="座位" name="seats">
        <div style="margin-bottom: 12px;">
          <el-button v-if="manageWritable" type="primary" size="small" @click="openAssignSeat">分配座位</el-button>
        </div>
        <el-table :data="seats" border size="small">
          <el-table-column label="座位" prop="label" width="120" />
          <el-table-column label="分配给">
            <template #default="{ row }">{{ row.username || '—' }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ⑤ 请假审批 -->
      <el-tab-pane label="请假审批" name="leave">
        <el-table :data="leaves" border size="small">
          <el-table-column label="学员" prop="username" width="100" />
          <el-table-column label="日期段" min-width="170">
            <template #default="{ row }">{{ row.start_date }} ~ {{ row.end_date }}</template>
          </el-table-column>
          <el-table-column label="事由" prop="reason" min-width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="leaveStatusType(row.status)" size="small">{{ leaveStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <template v-if="row.status === 'pending'">
                <el-button size="small" type="success" link @click="approveLeave(row, true)">批准</el-button>
                <el-button size="small" type="danger" link @click="approveLeave(row, false)">拒绝</el-button>
              </template>
              <el-button v-if="row.status === 'approved'" size="small" type="warning" link
                @click="revokeLeave(row)">撤回批准</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ⑥ 奖励 -->
      <el-tab-pane label="奖励" name="reward">
        <el-form :model="rewardForm" label-width="70px" style="max-width: 480px;">
          <el-form-item label="学员">
            <el-select v-model="rewardForm.user_id" placeholder="选择学员" style="width: 100%;">
              <el-option v-for="m in studentMembers" :key="m.user_id" :label="m.username" :value="m.user_id" />
            </el-select>
          </el-form-item>
          <el-form-item label="勋章">
            <el-select v-model="rewardForm.medal_id" placeholder="选择勋章" style="width: 100%;">
              <el-option v-for="md in medals" :key="md.id" :label="md.name" :value="md.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="rewardForm.description" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="rewardSubmitting" @click="issueReward">发放奖励</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ⑦ 加入申请（仅老师/超管；mentor 无审批权，隐藏入口） -->
      <el-tab-pane v-if="canManage" label="加入申请" name="join">
        <el-alert v-if="!joinRequests.length" type="info" :closable="false" title="暂无待审批的加入申请" />
        <el-table :data="joinRequests" border size="small" style="margin-top: 12px;">
          <el-table-column label="申请人" prop="username" width="110" />
          <el-table-column label="邮箱" prop="email" min-width="160" show-overflow-tooltip />
          <el-table-column label="身份" width="80">
            <template #default="{ row }">{{ row.role === 'mentor' ? '导生' : '学员' }}</template>
          </el-table-column>
          <el-table-column label="事由" prop="reason" min-width="140" show-overflow-tooltip />
          <el-table-column label="提交时间" width="110">
            <template #default="{ row }">{{ row.created_at ? row.created_at.slice(0, 10) : '' }}</template>
          </el-table-column>
          <el-table-column label="归属导生" width="140">
            <template #default="{ row }">
              <el-select v-if="row.role === 'student'" v-model="row._mentor" size="small" placeholder="选导生(可选)" style="width:100%">
                <el-option v-for="m in joinMentors" :key="m.user_id" :label="m.username" :value="m.user_id" />
              </el-select>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button size="small" type="success" link @click="approveJoin(row)">批准</el-button>
              <el-button size="small" type="danger" link @click="rejectJoin(row)">拒绝</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 加成员 -->
    <el-dialog v-model="memberDlg.visible" title="加成员" width="460px">
      <el-form :model="memberDlg.form" label-width="80px">
        <el-form-item label="用户" required>
          <el-select v-model="memberDlg.form.user_id" filterable placeholder="搜索选择用户" style="width: 100%;" @change="onUserPicked">
            <el-option v-for="u in selectableUsers" :key="u.User_Id" :label="`${u.User_Name}（${roleLabel(u.role)}）`" :value="u.User_Id" />
          </el-select>
          <el-checkbox v-model="showAllUsers" style="margin-top: 6px; font-size: 12px;">显示教师/超管（不可加入）</el-checkbox>
        </el-form-item>
        <el-form-item label="角色">
          <el-tag v-if="memberDlg.form.role" :type="memberDlg.form.role === 'mentor' ? 'warning' : 'success'" effect="light">
            {{ roleLabel(memberDlg.form.role) }}
          </el-tag>
          <span v-else style="color: #909399; font-size: 12px;">选择用户后按其身份自动确定</span>
        </el-form-item>
        <el-form-item v-if="memberDlg.form.role === 'student'" label="归属导生">
          <el-select v-model="memberDlg.form.team_mentor_id" clearable placeholder="选该学员的导生" style="width: 100%;">
            <el-option v-for="m in mentorMembers" :key="m.user_id" :label="m.username" :value="m.user_id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDlg.visible = false">取消</el-button>
        <el-button type="primary" @click="submitAddMember">加入</el-button>
      </template>
    </el-dialog>

    <!-- 加课程 -->
    <el-dialog v-model="courseDlg.visible" title="加课程" width="460px">
      <el-select v-model="courseDlg.course_id" filterable placeholder="选择课程" style="width: 100%;">
        <el-option v-for="c in availableCourses" :key="c.Course_Id" :label="c.Course_title" :value="c.Course_Id" />
      </el-select>
      <template #footer>
        <el-button @click="courseDlg.visible = false">取消</el-button>
        <el-button type="primary" @click="submitAddCourse">加入</el-button>
      </template>
    </el-dialog>

    <!-- 分配座位 -->
    <el-dialog v-model="seatDlg.visible" title="分配座位" width="460px">
      <el-form :model="seatDlg.form" label-width="70px">
        <el-form-item label="座位" required>
          <el-select v-model="seatDlg.form.seat_id" filterable placeholder="选择物理座位" style="width: 100%;">
            <el-option v-for="s in physicalSeats" :key="s.Seat_Id" :label="s.Seat_Label" :value="s.Seat_Id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分配给">
          <el-select v-model="seatDlg.form.user_id" clearable placeholder="留空 = 解绑" style="width: 100%;">
            <el-option v-for="m in members" :key="m.user_id" :label="m.username" :value="m.user_id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="seatDlg.visible = false">取消</el-button>
        <el-button type="primary" @click="submitAssignSeat">分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import api from '../api';
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';

const route = useRoute();
const router = useRouter();
const store = useStore();
const campId = route.params.id;

// 营期管理写操作 = 老师/超管 且 营期未归档（mentor 只读：请假审批/发奖励除外）
const canManage = computed(() => ['teacher', 'super_admin'].includes(store.getters.role));
const manageWritable = computed(() => canManage.value && session.value.status !== 'archived');

const loading = ref(false);
const activeTab = ref('members');
const session = ref({});
const members = ref([]);
const courses = ref([]);
const seats = ref([]);
const leaves = ref([]);

// 选项数据（权限不足时为空，不阻断页面）
const users = ref([]);
const allCourses = ref([]);
const medals = ref([]);
const physicalSeats = ref([]);

const memberDlg = reactive({ visible: false, form: { user_id: null, role: null, team_mentor_id: null } });
const courseDlg = reactive({ visible: false, course_id: null });
const seatDlg = reactive({ visible: false, form: { seat_id: null, user_id: null } });
const rewardForm = reactive({ user_id: null, medal_id: null, description: '' });
const rewardSubmitting = ref(false);
const joinRequests = ref([]);
const joinMentors = ref([]);

const mentorMembers = computed(() => members.value.filter((m) => m.role === 'mentor'));
// 加成员：用户按全局 role 过滤（默认仅学员/导生），营期角色由所选用户派生
const showAllUsers = ref(false);
const roleLabel = (r) => ({ student: '学员', mentor: '导生', teacher: '教师', super_admin: '超管' }[r] || r || '—');
const selectableUsers = computed(() =>
  showAllUsers.value ? users.value : users.value.filter((u) => u.role === 'student' || u.role === 'mentor')
);
function onUserPicked(uid) {
  const u = users.value.find((x) => x.User_Id === uid);
  memberDlg.form.role = u ? u.role : null;
  if (memberDlg.form.role !== 'student') memberDlg.form.team_mentor_id = null;
}
const studentMembers = computed(() => members.value.filter((m) => m.role === 'student'));
const availableCourses = computed(() => {
  // /camp/.../courses 返回 int id 而 /course/list 返回字符串 id，统一转 String 再比对
  const added = new Set(courses.value.map((c) => String(c.course_id)));
  return allCourses.value.filter((c) => !added.has(String(c.Course_Id)));
});
const mentorName = (id) => (id ? members.value.find((m) => m.user_id === id)?.username || '—' : '—');

const statusLabel = (s) => ({ draft: '草稿', active: '进行中', archived: '已归档' }[s] || s);
const statusType = (s) => ({ draft: 'info', active: 'success', archived: 'warning' }[s] || 'info');
const leaveStatusLabel = (s) => ({ pending: '待审批', approved: '已批准', rejected: '已拒绝' }[s] || s);
const leaveStatusType = (s) => ({ pending: 'warning', approved: 'success', rejected: 'info' }[s] || 'info');

const goBack = () => router.push('/camp/sessions');

async function fetchAll() {
  loading.value = true;
  try {
    const [s, m, c, st, lv] = await Promise.all([
      api.get(`/camp/sessions/${campId}`),
      api.get(`/camp/sessions/${campId}/members`),
      api.get(`/camp/sessions/${campId}/courses`),
      api.get(`/camp/sessions/${campId}/seats`),
      api.get(`/camp/sessions/${campId}/leave`),
    ]);
    session.value = s.data.session || {};
    members.value = m.data.members || [];
    courses.value = c.data.courses || [];
    seats.value = st.data.seats || [];
    leaves.value = lv.data.leaves || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载营期详情失败');
  } finally {
    loading.value = false;
  }
}

async function fetchOptions() {
  // 用户/课程/座位接口需对应权限；勋章走 /camp/medals（仅需营期角色，不依赖 medal_management，
  // 否则无该权限的 teacher 勋章下拉为空、发奖励整个不可用）。失败则选项为空。
  try {
    const [u, c, md, ps] = await Promise.all([
      api.get('/user/user_list').catch(() => null),
      api.get('/course/list').catch(() => null),
      api.get('/camp/medals').catch(() => null),
      api.get('/seat/rooms/106/seats').catch(() => null),
    ]);
    users.value = u?.data || [];
    allCourses.value = c?.data || [];
    medals.value = md?.data?.medals || [];
    physicalSeats.value = ps?.data?.seats || [];
  } catch { /* 忽略 */ }
}

// ── 成员 ──
function openAddMember() {
  memberDlg.form = { user_id: null, role: null, team_mentor_id: null };
  memberDlg.visible = true;
}
async function submitAddMember() {
  if (!memberDlg.form.user_id) { ElMessage.warning('请选择用户'); return; }
  if (!memberDlg.form.role) { ElMessage.warning('该用户不是学员/导生，不能加入营期'); return; }
  try {
    await api.post(`/camp/sessions/${campId}/members`, memberDlg.form);
    ElMessage.success('已加入');
    memberDlg.visible = false;
    fetchAll();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加入失败');
  }
}
function removeMember(row) {
  ElMessageBox.confirm(`确定移除「${row.username}」吗？（其承诺出勤日一并删除）`, '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(async () => {
    await api.delete(`/camp/sessions/${campId}/members/${row.user_id}`);
    ElMessage.success('已移除');
    fetchAll();
  }).catch((e) => {
    // 用户取消是 'cancel'/'close' 字符串；其余才是请求失败
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '移除失败');
  });
}

// ── 课程 ──
function openAddCourse() { courseDlg.course_id = null; courseDlg.visible = true; }
async function submitAddCourse() {
  if (!courseDlg.course_id) { ElMessage.warning('请选择课程'); return; }
  try {
    await api.post(`/camp/sessions/${campId}/courses`, { course_id: courseDlg.course_id });
    ElMessage.success('已加入');
    courseDlg.visible = false;
    fetchAll();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加入失败');
  }
}

function removeCourse(row) {
  ElMessageBox.confirm(`确定从本营移除课程「${row.title}」吗？（不影响学员已选课记录）`, '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(async () => {
    await api.delete(`/camp/sessions/${campId}/courses/${row.course_id}`);
    ElMessage.success('已移除');
    fetchAll();
  }).catch((e) => {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '移除失败');
  });
}

// ── 出勤计划 ──
async function regenPlan() {
  try {
    const res = await api.post(`/camp/attendance/plan/${campId}`);
    ElMessage.success(`已重生成，共 ${res.data.plan_count} 个承诺日`);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '重生成失败');
  }
}

// ── 座位 ──
function openAssignSeat() { seatDlg.form = { seat_id: null, user_id: null }; seatDlg.visible = true; }
async function submitAssignSeat() {
  if (!seatDlg.form.seat_id) { ElMessage.warning('请选择座位'); return; }
  try {
    await api.post('/camp/seat/assign', { camp_session_id: Number(campId), seat_id: seatDlg.form.seat_id, user_id: seatDlg.form.user_id });
    ElMessage.success('已分配');
    seatDlg.visible = false;
    fetchAll();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '分配失败');
  }
}

// ── 请假 ──
// 审批类操作防连击：共享一个 busy 标记（后端另有 pending 校验兜底）
const actionBusy = ref(false);
async function guarded(fn) {
  if (actionBusy.value) return;
  actionBusy.value = true;
  try { await fn(); } finally { actionBusy.value = false; }
}

function approveLeave(row, approve) {
  guarded(async () => {
    if (!approve) {
      // 拒绝影响较大，先确认
      try {
        await ElMessageBox.confirm(`确定拒绝「${row.username}」${row.start_date}~${row.end_date} 的请假吗？`, '拒绝请假',
          { confirmButtonText: '拒绝', cancelButtonText: '取消', type: 'warning' });
      } catch { return; }
    }
    try {
      await api.post(`/camp/leave/${row.id}/approve`, { approve });
      ElMessage.success(approve ? '已批准' : '已拒绝');
      fetchAll();
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '审批失败');
    }
  });
}

function revokeLeave(row) {
  guarded(async () => {
    try {
      await ElMessageBox.confirm(
        `确定撤回「${row.username}」${row.start_date}~${row.end_date} 已批准的请假吗？撤回后重新进入待审批，其考勤按缺勤回算。`,
        '撤回批准', { confirmButtonText: '撤回', cancelButtonText: '取消', type: 'warning' });
    } catch { return; }
    try {
      await api.post(`/camp/leave/${row.id}/revoke`);
      ElMessage.success('已撤回，该请假重新进入待审批');
      fetchAll();
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '撤回失败');
    }
  });
}

// ── 奖励 ──
async function issueReward() {
  if (!rewardForm.user_id || !rewardForm.medal_id) { ElMessage.warning('请选择学员和勋章'); return; }
  rewardSubmitting.value = true;
  try {
    await api.post('/camp/reward', {
      camp_session_id: Number(campId),
      user_id: rewardForm.user_id, medal_id: rewardForm.medal_id,
      description: rewardForm.description,
    });
    ElMessage.success('奖励已发放');
    rewardForm.description = '';
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发放失败');
  } finally {
    rewardSubmitting.value = false;
  }
}

// ── 加入申请 + 团队改派 ──
async function fetchJoinRequests() {
  try {
    const res = await api.get(`/camp/sessions/${campId}/join-requests`);
    joinRequests.value = (res.data.requests || []).map((r) => ({ ...r, _mentor: null }));
    joinMentors.value = res.data.mentors || [];
  } catch { /* 非管理角色或无权限，忽略 */ }
}
function approveJoin(row) {
  // 归属导生可选：不指定则学员以 team_mentor_id=null 入营，事后可在「成员」Tab 改派
  guarded(async () => {
    try {
      await api.post(`/camp/join-requests/${row.id}/approve`, { team_mentor_id: row._mentor });
      ElMessage.success('已批准并加入营期');
      fetchAll();
      fetchJoinRequests();
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '审批失败');
    }
  });
}
function rejectJoin(row) {
  guarded(async () => {
    // 拒绝原因可选，会拼进申请人的通知里
    let reason = '';
    try {
      const { value } = await ElMessageBox.prompt(
        `可填写拒绝原因（将通知「${row.username}」）`, '拒绝加入申请',
        { confirmButtonText: '拒绝', cancelButtonText: '取消', inputPlaceholder: '原因（可选）' });
      reason = value || '';
    } catch (e) {
      if (e === 'cancel' || e === 'close') return;   // 用户取消，不执行拒绝
      ElMessage.error('操作失败');
      return;
    }
    try {
      await api.post(`/camp/join-requests/${row.id}/reject`, { reason });
      ElMessage.success('已拒绝');
      fetchJoinRequests();
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '操作失败');
    }
  });
}
async function updateMentor(row, mentorId) {
  try {
    await api.put(`/camp/sessions/${campId}/members/${row.user_id}`, { team_mentor_id: mentorId });
    row.team_mentor_id = mentorId;
    ElMessage.success('归属导生已更新');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '更新失败');
  }
}

onMounted(() => { fetchAll(); fetchOptions(); if (canManage.value) fetchJoinRequests(); });
</script>

<style scoped>
.camp-session-detail { padding: 16px; }
.header { margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
.header .title { font-size: 18px; font-weight: 600; }
.hint { margin-left: 12px; color: #909399; font-size: 12px; }
</style>
