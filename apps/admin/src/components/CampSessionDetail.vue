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

      <!-- ⑧ 选导生（启用且老师/超管可见） -->
      <el-tab-pane v-if="canManage && session.mentor_selection_enabled" label="选导生" name="ms">
        <!-- 阶段状态 + 手动推进（复用 session_update 改 deadline = 提前截止） -->
        <el-alert
          :type="msPhaseAlertType"
          :closable="false"
          :title="`当前阶段：${msPhaseLabel} · 志愿 ${msOverview?.deadlines?.preference_deadline || '—'} 截止 / 一轮 ${msOverview?.deadlines?.round1_deadline || '—'} 截止${msOverview?.deadlines?.round2_deadline ? ' / 二轮 ' + msOverview.deadlines.round2_deadline + ' 截止' : '（无二轮）'}`"
        />
        <el-alert v-if="msOverview?.config_error" type="error" :closable="false" title="配置不完整：启用但缺少时间点，请到「营期列表 → 编辑」补齐" style="margin-top:8px" />
        <div v-if="manageWritable" style="margin: 12px 0;">
          <el-button v-if="msOverview?.phase === 'collecting'" size="small" @click="advanceMs('pd')">立即截止志愿（进入挑选）</el-button>
          <el-button v-if="msOverview?.phase === 'round1'" size="small" @click="advanceMs('r1')">立即截止一轮</el-button>
          <el-button v-if="msOverview?.phase === 'round1' || msOverview?.phase === 'round2'" size="small" @click="skipRound2">跳过二轮</el-button>
          <span class="hint">推进即把对应截止时间改为当前时刻；也可在「营期列表 → 编辑」调整时间线</span>
        </div>

        <!-- 导生概览 -->
        <h4 class="ms-sec-title">导生概览</h4>
        <el-table :data="msOverview?.mentors || []" border size="small">
          <el-table-column label="导生" prop="username" min-width="110" />
          <el-table-column label="名片" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.has_profile" type="success" size="small">已发布</el-tag>
              <el-tag v-else type="warning" size="small">无名片</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="容量" prop="capacity" width="70" align="center" />
          <el-table-column label="一轮志愿数" prop="chose_r1" width="100" align="center" />
          <el-table-column label="二轮志愿数" prop="chose_r2" width="100" align="center" />
          <el-table-column label="已收" prop="matched" width="70" align="center" />
          <el-table-column label="剩余" width="70" align="center">
            <template #default="{ row }">
              <span :style="row.remaining === 0 ? 'color:#e6a23c' : ''">{{ row.remaining }}</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 学员配对（含未匹配指派） -->
        <h4 class="ms-sec-title">学员配对（{{ msOverview?.stats?.matched ?? 0 }} / {{ msOverview?.stats?.students ?? 0 }}）</h4>
        <el-table :data="msOverview?.students || []" border size="small">
          <el-table-column label="学员" prop="username" min-width="110" />
          <el-table-column label="归属导生" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.matched" type="success" size="small">{{ row.mentor_name }}</el-tag>
              <span v-else style="color:#e6a23c">未匹配</span>
            </template>
          </el-table-column>
          <el-table-column label="一轮志愿" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.submitted_r1 ? 'info' : 'danger'" size="small" effect="plain">
                {{ row.submitted_r1 ? '已交' : '未交' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="二轮志愿" width="90" align="center">
            <template #default="{ row }">
              <el-tag v-if="msOverview?.stats?.r2_enabled" :type="row.submitted_r2 ? 'info' : 'danger'" size="small" effect="plain">
                {{ row.submitted_r2 ? '已交' : '未交' }}
              </el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column v-if="manageWritable" label="手动指派" min-width="200">
            <template #default="{ row }">
              <el-select v-if="!row.matched" :model-value="null" size="small" placeholder="指派给导生"
                style="width:150px" @change="(v) => assignStudent(row, v)">
                <el-option v-for="m in msOverview?.mentors || []" :key="m.user_id"
                  :label="`${m.username}（余 ${m.remaining}）`" :value="m.user_id" />
              </el-select>
              <span v-else class="hint">改派请到「成员」Tab</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 加成员（多选批量） -->
    <el-dialog v-model="memberDlg.visible" title="加成员" width="520px">
      <el-form :model="memberDlg.form" label-width="80px">
        <el-form-item label="用户" required>
          <el-select v-model="memberDlg.form.user_ids" multiple collapse-tags collapse-tags-tooltip filterable
            placeholder="搜索选择用户（可多选）" style="width: 100%;">
            <el-option v-for="u in selectableUsers" :key="u.User_Id" :label="`${u.User_Name}（${roleLabel(u.role)}）`" :value="u.User_Id" />
          </el-select>
          <el-checkbox v-model="showAllUsers" style="margin-top: 6px; font-size: 12px;">显示教师/超管（不可加入）</el-checkbox>
        </el-form-item>
        <el-form-item label="已选">
          <template v-if="selectedRoles.total">
            <el-tag type="warning" size="small">导生 × {{ selectedRoles.mentor }}</el-tag>
            <el-tag v-if="selectedRoles.student" type="success" size="small" style="margin-left: 6px;">学员 × {{ selectedRoles.student }}</el-tag>
          </template>
          <span v-else style="color: #909399; font-size: 12px;">选择后按各自身份自动确定角色</span>
        </el-form-item>
        <el-form-item v-if="selectedRoles.total && selectedRoles.mentor === 0" label="归属导生">
          <el-select v-model="memberDlg.form.team_mentor_id" clearable placeholder="统一指定（可选）" style="width: 100%;">
            <el-option v-for="m in mentorMembers" :key="m.user_id" :label="m.username" :value="m.user_id" />
          </el-select>
          <div style="width: 100%; color: #909399; font-size: 12px; line-height: 1.5;">将应用到本次全部学员；混选导生时不指定，加入后可在成员列表改派</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="memberDlg.submitting" @click="submitAddMember">
          加入{{ selectedRoles.total ? `（${selectedRoles.total}）` : '' }}
        </el-button>
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

const memberDlg = reactive({ visible: false, form: { user_ids: [], team_mentor_id: null }, submitting: false });
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
// 已选用户的身份汇总：驱动「已选」标签展示，及「全学员才可统一归属导生」
const selectedRoles = computed(() => {
  const c = { mentor: 0, student: 0, total: 0 };
  for (const id of memberDlg.form.user_ids || []) {
    const u = users.value.find((x) => x.User_Id === id);
    if (!u) continue;
    if (u.role === 'mentor') { c.mentor += 1; c.total += 1; }
    else if (u.role === 'student') { c.student += 1; c.total += 1; }
  }
  return c;
});
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
  memberDlg.form = { user_ids: [], team_mentor_id: null };
  memberDlg.visible = true;
}
async function submitAddMember() {
  const ids = memberDlg.form.user_ids || [];
  if (!ids.length) { ElMessage.warning('请选择用户'); return; }
  const picked = ids.map((id) => users.value.find((u) => u.User_Id === id)).filter(Boolean);
  const invalid = picked.filter((u) => u.role !== 'student' && u.role !== 'mentor');
  if (invalid.length) {
    ElMessage.warning(`「${invalid.map((u) => u.User_Name).join('、')}」不是学员/导生，不能加入营期`);
    return;
  }
  // 仅全部为学员时可统一归属导生；混选导生时学员不带归属（加入后在成员列表改派）
  const teamMentorId = picked.every((u) => u.role === 'student') ? memberDlg.form.team_mentor_id : null;
  memberDlg.submitting = true;
  const results = await Promise.allSettled(picked.map((u) =>
    api.post(`/camp/sessions/${campId}/members`, { user_id: u.User_Id, team_mentor_id: teamMentorId })));
  memberDlg.submitting = false;
  const fails = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') fails.push(`${picked[i].User_Name}：${r.reason?.response?.data?.message || '失败'}`);
  });
  const ok = results.length - fails.length;
  if (ok) {
    ElMessage.success(`已加入 ${ok} 人`);
    memberDlg.visible = false;
    fetchAll();
  }
  if (fails.length) ElMessage.error(`加入失败 ${fails.length} 人 —— ${fails.join('；')}`);
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

// ── 选导生（overview / 阶段推进 / 手动指派）──
const msOverview = ref(null);
const MS_PHASE_LABELS = {
  disabled: '未启用', upcoming: '即将开始', collecting: '志愿提交中',
  round1: '一轮挑选中', round2: '二轮互选中', done: '已结束',
};
const msPhaseLabel = computed(() => MS_PHASE_LABELS[msOverview.value?.phase] || '—');
const msPhaseAlertType = computed(() => ({
  collecting: 'info', upcoming: 'info', round1: 'warning', round2: 'warning', done: 'success',
}[msOverview.value?.phase] || 'info'));

async function fetchMsOverview() {
  try {
    const res = await api.get(`/camp/ms/${campId}/overview`);
    msOverview.value = res.data;
  } catch { /* 非管理角色或未启用，忽略 */ }
}

function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function advanceMs(which) {
  const field = which === 'pd' ? 'ms_preference_deadline' : 'ms_round1_deadline';
  const label = which === 'pd' ? '立即截止志愿' : '立即截止一轮';
  try {
    await ElMessageBox.confirm(`${label}？对应截止时间将改为当前时刻，进入下一阶段。`, '阶段推进', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    });
  } catch { return; }
  try {
    await api.put(`/camp/sessions/${campId}`, { [field]: nowStr() });
    ElMessage.success('已推进');
    fetchAll();
    fetchMsOverview();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '推进失败');
  }
}

async function skipRound2() {
  try {
    await ElMessageBox.confirm('跳过二轮？未匹配学员将只能由你手动指派。', '跳过二轮', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    });
  } catch { return; }
  try {
    await api.put(`/camp/sessions/${campId}`, { ms_round2_deadline: null });
    ElMessage.success('已跳过二轮');
    fetchAll();
    fetchMsOverview();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

async function assignStudent(row, mentorId) {
  if (!mentorId) return;
  const doAssign = async (allowOver) => {
    try {
      await api.post(`/camp/ms/${campId}/assign`, {
        student_id: row.user_id, mentor_id: mentorId, allow_over: allowOver,
      });
      const mn = (msOverview.value?.mentors || []).find((m) => m.user_id === mentorId);
      ElMessage.success(`已指派给 ${mn?.username || '导生'}`);
      fetchMsOverview();
      fetchAll();
    } catch (e) {
      const msg = e.response?.data?.message || '指派失败';
      // 满员：询问是否越过容量
      if (e.response?.status === 409 && msg.includes('allow_over')) {
        try {
          await ElMessageBox.confirm(`${msg}。仍要指派吗？`, '名额已满', {
            confirmButtonText: '仍要指派', cancelButtonText: '取消', type: 'warning',
          });
          doAssign(true);
        } catch { /* 取消 */ }
        return;
      }
      ElMessage.error(msg);
    }
  };
  doAssign(false);
}

// overview 不依赖 session 先加载：未启用时后端 400 被 catch 吞掉，无副作用
onMounted(() => { fetchAll(); fetchOptions(); if (canManage.value) { fetchJoinRequests(); fetchMsOverview(); } });
</script>

<style scoped>
.camp-session-detail { padding: 16px; }
.header { margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
.header .title { font-size: 18px; font-weight: 600; }
.hint { margin-left: 12px; color: #909399; font-size: 12px; }
.ms-sec-title { margin: 16px 0 8px; font-size: 14px; font-weight: 600; }
</style>
