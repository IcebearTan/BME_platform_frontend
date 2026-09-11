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
          <!-- 申请类型：导生报名（apply_role=mentor，审核通过以导生身份入营）/ 学员申请 -->
          <el-table-column label="类型" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.apply_role === 'mentor' ? 'warning' : 'success'" size="small">
                {{ row.apply_role === 'mentor' ? '导生' : '学员' }}
              </el-tag>
            </template>
          </el-table-column>
          <!-- 意向大组：学员报名时选（须在本营 ms_tags 内）；导生报名无 -->
          <el-table-column label="意向组" width="90" align="center">
            <template #default="{ row }">{{ row.preferred_tag || '—' }}</template>
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

      <!-- ⑧ 导生候选人（培训营 + 超管：营期外链的候选人池，手工导入/按等级生成策略可插拔，池内用户可自助报名） -->
      <el-tab-pane v-if="session.category === 'learning' && isSuperAdmin" label="导生候选人" name="eligibility">
        <h4 class="ms-sec-title">手工导入（邮箱）</h4>
        <el-input v-model="eligibility.raw" type="textarea" :rows="4"
          placeholder="粘贴导生邮箱，换行或逗号分隔均可，自动去重" />
        <div class="elig-toolbar">
          <el-button size="small" :loading="eligibility.previewing" @click="previewEligibility">预览</el-button>
          <el-button size="small" type="primary" :loading="eligibility.confirming" @click="confirmEligibility">确认导入</el-button>
          <el-divider direction="vertical" />
          <el-select v-model="eligibility.minLevel" size="small" class="elig-level-select">
            <el-option v-for="n in [2, 3, 4]" :key="n" :label="`LV${n} 及以上`" :value="n" />
          </el-select>
          <el-button size="small" :loading="eligibility.generating" @click="generateByLevel">按等级生成</el-button>
          <span class="hint">增删仅限草稿/待开放阶段；LV1 为普通学员默认等级，不入导生池</span>
        </div>

        <template v-if="eligibility.preview">
          <h4 class="ms-sec-title">预览结果（{{ eligibility.emails.length }} 个邮箱）</h4>
          <el-alert v-if="eligibility.preview.unmatched_emails?.length" type="warning" :closable="false"
            :title="`未匹配账号：${eligibility.preview.unmatched_emails.join('、')}`" style="margin-bottom: 8px;" />
          <el-table :data="eligibility.preview.matched" border size="small">
            <el-table-column label="姓名" prop="username" min-width="110" />
            <el-table-column label="邮箱" prop="email" min-width="180" show-overflow-tooltip />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.already_eligible" type="info" size="small">已在名单</el-tag>
                <el-tag v-else type="success" size="small">将新增</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </template>

        <h4 class="ms-sec-title">候选人列表（{{ eligibility.list.length }}）</h4>
        <el-table :data="eligibility.list" v-loading="eligibility.loading" border size="small">
          <el-table-column label="姓名" prop="username" min-width="110" />
          <el-table-column label="邮箱" prop="email" min-width="180" show-overflow-tooltip />
          <el-table-column label="来源" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.source === 'level' ? 'success' : 'info'" size="small">
                {{ row.source === 'level' ? '按等级' : '手工导入' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="报名状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.registered ? 'success' : 'info'" size="small">
                {{ row.registered ? '已报名' : '未报名' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ row }">
              <el-button size="small" type="danger" link @click="removeCandidate(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ⑨ 选导生（启用且老师/超管可见） -->
      <el-tab-pane v-if="canManage && session.mentor_selection_enabled" label="选导生" name="ms">
        <!-- 阶段状态 + 手动推进（复用 session_update 改 deadline = 提前截止） -->
        <el-alert
          :type="msPhaseAlertType"
          :closable="false"
          :title="`当前阶段：${msPhaseLabel} · 志愿 ${msOverview?.deadlines?.preference_deadline || '—'} 截止`"
        />
        <el-alert v-if="msOverview?.config_error" type="error" :closable="false" title="配置不完整：启用但缺少时间点，请到「营期列表 → 编辑」补齐" style="margin-top:8px" />
        <div v-if="manageWritable" style="margin: 12px 0;">
          <el-button v-if="msOverview?.phase === 'collecting'" size="small" @click="advanceMs">立即截止志愿</el-button>
          <el-button v-if="isSuperAdmin" size="small" :loading="exporting" @click="exportMsCsv">导出志愿 CSV</el-button>
          <el-button v-if="isSuperAdmin" size="small" type="primary" plain @click="openBatchAssign">批量指派</el-button>
          <span class="hint">截止后导出志愿 CSV 线下协调，再用「批量指派」回填结果</span>
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
          <el-table-column label="容量" width="70" align="center">
            <template #default="{ row }">{{ row.capacity === null ? '不限' : row.capacity }}</template>
          </el-table-column>
          <el-table-column label="志愿数" prop="chose_r1" width="80" align="center" />
          <el-table-column label="已分配" prop="matched" width="80" align="center" />
          <el-table-column label="剩余" width="70" align="center">
            <template #default="{ row }">
              <span v-if="row.remaining === null">不限</span>
              <span v-else :style="row.remaining === 0 ? 'color:#e6a23c' : ''">{{ row.remaining }}</span>
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
          <el-table-column label="志愿" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.submitted_r1 ? 'info' : 'danger'" size="small" effect="plain">
                {{ row.submitted_r1 ? '已交' : '未交' }}
              </el-tag>
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

    <!-- 批量指派导生（线下协调结果回填） -->
    <el-dialog v-model="batchDlg.visible" title="批量指派导生" width="680px">
      <el-alert type="info" :closable="false" style="margin-bottom: 10px;"
        title="为未分配学员逐行选择导师后提交；已分配、冲突、失败的行会就地标注结果" />
      <div v-if="!batchDlg.rows.length" class="hint" style="padding: 10px 0;">本营暂无未分配学员</div>
      <el-table v-else :data="batchDlg.rows" border size="small" max-height="420">
        <el-table-column label="学员" prop="username" min-width="100" />
        <el-table-column label="指派导师" min-width="190">
          <template #default="{ row }">
            <el-select v-model="row._mentor" size="small" placeholder="选择导师"
              style="width: 100%;" :disabled="!!row._result">
              <el-option v-for="m in msOverview?.mentors || []" :key="m.user_id"
                :label="`${m.username}（余 ${m.remaining}）`" :value="m.user_id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="结果" min-width="200">
          <template #default="{ row }">
            <template v-if="row._result">
              <el-tag :type="batchStatusMeta(row._result.status).tag" size="small" effect="plain">
                {{ batchStatusMeta(row._result.status).label }}
              </el-tag>
              <span class="batch-msg">{{ row._result.message }}</span>
            </template>
            <span v-else class="hint">—</span>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="batchDlg.visible = false">关闭</el-button>
          <el-button type="primary" :loading="batchDlg.submitting" @click="submitBatchAssign">提交指派</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import api from '../api';
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';

const route = useRoute();
const router = useRouter();
const store = useStore();
const campId = route.params.id;

// 营期管理写操作 = 老师/超管 且 营期未归档（mentor 只读：请假审批/发奖励除外）
const canManage = computed(() => store.getters.role === 'super_admin');
const manageWritable = computed(() => canManage.value && session.value.status !== 'archived');
// 名单导入 / 志愿导出 / 批量指派等新端点后端 @camp_role() 仅 super_admin
const isSuperAdmin = computed(() => store.getters.role === 'super_admin');

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
const selectableUsers = computed(() => {
  const memberIds = new Set(members.value.map((member) => member.user_id));
  const candidates = showAllUsers.value
    ? users.value
    : users.value.filter((user) => user.role === 'student' || user.role === 'mentor');
  return candidates.filter((user) => !memberIds.has(user.User_Id));
});
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

const statusLabel = (s) => ({ draft: '草稿', upcoming: '待开放', selecting: '选择阶段', running: '进行中', archived: '已结营' }[s] || s);
const statusType = (s) => ({ draft: 'info', upcoming: 'primary', selecting: 'warning', running: 'success', archived: 'info' }[s] || 'info');
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

// ── 导生候选人（营期外链的候选人池：手工邮箱导入 / 按等级生成，策略可插拔；池内用户可自助报名）──
const eligibility = reactive({
  raw: '', emails: [],
  preview: null, previewing: false, confirming: false,
  minLevel: 2, generating: false,
  list: [], loading: false,
});

// 粘贴文本 → 去重邮箱数组（换行/中英文逗号/分号/空白均可分隔）
function parseEmails() {
  const seen = new Set();
  const emails = [];
  for (const part of eligibility.raw.split(/[\s,，;；]+/)) {
    const e = part.trim().toLowerCase();
    if (e && !seen.has(e)) { seen.add(e); emails.push(e); }
  }
  return emails;
}

async function fetchEligibility() {
  eligibility.loading = true;
  try {
    const res = await api.get(`/camp/sessions/${campId}/mentor-eligibility`);
    eligibility.list = res.data.eligibility || [];
  } catch {
    eligibility.list = [];
  } finally {
    eligibility.loading = false;
  }
}

async function previewEligibility() {
  const emails = parseEmails();
  if (!emails.length) { ElMessage.warning('请先粘贴邮箱'); return; }
  eligibility.emails = emails;
  eligibility.previewing = true;
  try {
    const res = await api.post(`/camp/sessions/${campId}/mentor-eligibility/import-preview`, { emails });
    eligibility.preview = res.data.data || { matched: [], unmatched_emails: [] };
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '预览失败');
  } finally {
    eligibility.previewing = false;
  }
}

async function confirmEligibility() {
  // 按当前文本框内容导入（后端 dry-run 同款匹配逻辑，幂等跳过已在名单者）
  const emails = parseEmails();
  if (!emails.length) { ElMessage.warning('请先粘贴邮箱'); return; }
  eligibility.confirming = true;
  try {
    const res = await api.post(`/camp/sessions/${campId}/mentor-eligibility/import-confirm`, { emails });
    ElMessage.success(res.data.message || '已导入');
    eligibility.preview = null;
    eligibility.raw = '';
    eligibility.emails = [];
    fetchEligibility();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '导入失败');
  } finally {
    eligibility.confirming = false;
  }
}

// 策略 B：按等级生成（level >= min_level 的用户物化进池，幂等合并，可重复刷新）
async function generateByLevel() {
  eligibility.generating = true;
  try {
    const res = await api.post(
      `/camp/sessions/${campId}/mentor-candidates/generate-by-level`,
      { min_level: eligibility.minLevel },
    );
    ElMessage.success(res.data.message || '已生成');
    fetchEligibility();
  } catch (e) {
    // 非草稿/待开放等 400：直接透出后端提示
    ElMessage.error(e.response?.data?.message || '生成失败');
  } finally {
    eligibility.generating = false;
  }
}

function removeCandidate(row) {
  ElMessageBox.confirm(`确定将「${row.username}」从导生候选人池移除吗？`, '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(async () => {
    // 后端 message 可能带「已报名的导生身份不受影响」说明，原样透出
    const res = await api.delete(`/camp/sessions/${campId}/mentor-candidates/${row.user_id}`);
    ElMessage.success(res.data.message || '已移除');
    fetchEligibility();
  }).catch((e) => {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '移除失败');
  });
}

// 进入「导生候选人」tab 时拉取候选人列表
watch(activeTab, (t) => { if (t === 'eligibility') fetchEligibility(); });

// ── 选导生（overview / 提前截止 / 志愿导出 / 指派）──
const msOverview = ref(null);
const MS_PHASE_LABELS = {
  disabled: '未启用', upcoming: '即将开始', collecting: '志愿收集中', done: '志愿已截止',
};
const msPhaseLabel = computed(() => MS_PHASE_LABELS[msOverview.value?.phase] || '—');
const msPhaseAlertType = computed(() => ({
  collecting: 'info', upcoming: 'info', done: 'success',
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

async function advanceMs() {
  try {
    await ElMessageBox.confirm('立即截止志愿？截止时间将改为当前时刻，之后进入线下协调阶段。', '提前截止', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    });
  } catch { return; }
  try {
    await api.put(`/camp/sessions/${campId}`, { ms_preference_deadline: nowStr() });
    ElMessage.success('已截止志愿');
    fetchAll();
    fetchMsOverview();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

// 导出学员志愿 CSV（blob 下载；文件名沿用后端 Content-Disposition 约定）
const exporting = ref(false);
async function exportMsCsv() {
  exporting.value = true;
  try {
    const res = await api.get(`/camp/ms/${campId}/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camp_${campId}_preferences.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    // 失败响应也是 blob：尽量解析出后端 message，解析不出给通用文案
    let msg = '导出失败，请稍后重试';
    try {
      const text = await e.response?.data?.text();
      if (text) msg = JSON.parse(text).message || msg;
    } catch { /* 非 JSON 响应体，保持通用文案 */ }
    ElMessage.error(msg);
  } finally {
    exporting.value = false;
  }
}

// ── 批量指派（线下协调结果回填，逐行独立结果）──
const batchDlg = reactive({ visible: false, submitting: false, rows: [] });
const BATCH_STATUS = {
  assigned: { label: '已指派', tag: 'success' },
  skipped: { label: '跳过', tag: 'info' },
  conflict: { label: '冲突', tag: 'warning' },
  error: { label: '失败', tag: 'danger' },
};
const batchStatusMeta = (status) => BATCH_STATUS[status] || { label: status, tag: 'info' };

function openBatchAssign() {
  batchDlg.rows = (msOverview.value?.students || [])
    .filter((s) => !s.matched)
    .map((s) => ({ ...s, _mentor: null, _result: null }));
  batchDlg.visible = true;
}

async function submitBatchAssign() {
  const pairs = batchDlg.rows
    .filter((r) => r._mentor && !r._result)
    .map((r) => ({ student_user_id: r.user_id, mentor_user_id: r._mentor }));
  if (!pairs.length) { ElMessage.warning('请至少为一个学员选择导师'); return; }
  batchDlg.submitting = true;
  try {
    const res = await api.post(`/camp/ms/${campId}/assign/batch`, { pairs });
    const results = res.data.results || [];
    const byId = new Map(results.map((r) => [r.student_user_id, r]));
    for (const row of batchDlg.rows) {
      if (byId.has(row.user_id)) row._result = byId.get(row.user_id);
    }
    const count = (s) => results.filter((r) => r.status === s).length;
    ElMessage.success(`已提交：指派 ${count('assigned')} · 跳过 ${count('skipped')} · 冲突 ${count('conflict')} · 失败 ${count('error')}`);
    fetchMsOverview();
    fetchAll();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量指派失败');
  } finally {
    batchDlg.submitting = false;
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
.batch-msg { margin-left: 6px; font-size: 12px; color: #909399; }
/* 候选池工具栏：间距统一交给 flex gap（覆盖 el-button 相邻默认 margin） */
.elig-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 10px 0 4px; }
.elig-toolbar :deep(.el-button + .el-button) { margin-left: 0; }
.elig-toolbar :deep(.el-divider--vertical) { margin: 0; }
.elig-toolbar .hint { margin-left: 4px; }
.elig-level-select { width: 88px; }
</style>
