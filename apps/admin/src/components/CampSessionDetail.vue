<template>
  <div class="camp-session-detail">
    <div class="header">
      <el-button @click="goBack">返回列表</el-button>
      <span class="title">{{ session.name || '...' }}</span>
      <el-tag v-if="session.status" :type="statusType(session.status)" size="small">{{ statusLabel(session.status) }}</el-tag>
    </div>

    <el-tabs v-model="activeTab" v-loading="loading">
      <!-- ⓪ 负责人（阶段 1，CampStaff）：owner/teacher 委任与转交——通知接收人责任链的地基 -->
      <el-tab-pane label="负责人" name="staff">
        <el-alert v-if="!activeOwner" type="warning" :closable="false" class="staff-alert"
          title="本营尚未指定主负责人：报名、请假等通知目前兜底发给全部管理员，请尽快委任" />
        <div class="member-toolbar">
          <span class="staff-hint">主负责人是营期第一责任人（通知优先接收人）；协同老师可审批报名、管理成员与处理请假</span>
          <div style="display: flex; gap: 8px;">
            <el-button type="primary" size="small" @click="openStaffAssign('teacher')">委任协同老师</el-button>
            <el-button size="small" @click="openStaffAssign('owner')">委任主负责人</el-button>
          </div>
        </div>
        <el-table :data="staffRows" border size="small" v-loading="staffLoading">
          <el-table-column label="用户" prop="username" min-width="110" />
          <el-table-column label="职责" width="100">
            <template #default="{ row }">
              <el-tag :type="row.role === 'owner' ? 'primary' : 'info'" size="small">
                {{ row.role === 'owner' ? '主负责人' : '协同老师' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                {{ row.status === 'active' ? '生效中' : '已结束' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="委任" min-width="150">
            <template #default="{ row }">
              {{ row.assigned_by_name || '—' }} · {{ row.assigned_at ? row.assigned_at.slice(0, 16).replace('T', ' ') : '' }}
            </template>
          </el-table-column>
          <el-table-column label="结束" min-width="150">
            <template #default="{ row }">
              <template v-if="row.status === 'ended'">
                {{ row.ended_by_name || '—' }} · {{ row.ended_at ? row.ended_at.slice(0, 16).replace('T', ' ') : '' }}
                <span v-if="row.end_reason">（{{ row.end_reason }}）</span>
              </template>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <template v-if="row.status === 'active'">
                <el-button v-if="row.role === 'teacher'" size="small" type="danger" link
                  @click="endStaff(row)">解除</el-button>
                <el-button v-if="row.role === 'teacher'" size="small" type="primary" link
                  @click="transferOwner(row)">转交为主负责人</el-button>
                <el-button v-if="row.role === 'owner'" size="small" type="warning" link
                  @click="endStaff(row)">解除（回到管理员兜底）</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
        <h4 class="staff-sec-title">职责变更记录</h4>
        <el-table :data="staffEvents" border size="small">
          <el-table-column label="时间" width="150">
            <template #default="{ row }">{{ (row.occurred_at || '').slice(0, 16).replace('T', ' ') }}</template>
          </el-table-column>
          <el-table-column label="用户" prop="username" width="110" />
          <el-table-column label="动作" width="110">
            <template #default="{ row }">
              {{ { assign: '委任', promote: '升级', demote: '降级', transfer: '转交', end: '结束' }[row.action] || row.action }}
              <span v-if="row.before_role || row.after_role">
                （{{ { owner: '主负责人', teacher: '老师' }[row.before_role] || '—' }} → {{ { owner: '主负责人', teacher: '老师' }[row.after_role] || '—' }}）
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作人" prop="operator_name" width="110" />
          <el-table-column label="原因" prop="reason" min-width="140" show-overflow-tooltip />
        </el-table>
      </el-tab-pane>

      <!-- ① 成员 -->
      <el-tab-pane label="成员" name="members">
        <div class="member-toolbar">
          <div class="member-filters">
            <el-input v-model="memberPage.keyword" clearable placeholder="搜索成员姓名"
              style="width: 200px;" @keyup.enter="applyMemberFilters" @clear="applyMemberFilters" />
            <el-select v-model="memberPage.role" clearable placeholder="全部身份"
              style="width: 130px;" @change="applyMemberFilters">
              <el-option label="学员" value="student" />
              <el-option label="导生" value="mentor" />
              <el-option label="成员" value="member" />
            </el-select>
            <el-button @click="applyMemberFilters">查询</el-button>
          </div>
          <el-button v-if="manageWritable" type="primary" size="small" @click="openAddMember">加成员</el-button>
        </div>
        <el-table :data="members" border size="small" v-loading="memberPage.loading">
          <el-table-column label="用户" prop="username" min-width="120" />
          <el-table-column label="角色" width="80">
            <template #default="{ row }">{{ { mentor: '导生', member: '成员' }[row.role] || '学员' }}</template>
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
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="memberPage.page" v-model:page-size="memberPage.pageSize"
            :total="memberPage.total" :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next" @current-change="fetchMembers" @size-change="changeMemberPageSize" />
        </div>
      </el-tab-pane>

      <!-- ② 课程目录（09-12 方向制砍双源：learning 营课程由分类方向定义，此 tab 仅项目营） -->
      <el-tab-pane v-if="session.category === 'project'" label="课程目录" name="courses">
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

      <!-- ③ 出勤（09-17 设置集中管理：模式/参数编辑迁「营期设置」tab，本 tab 只留数据运营；
           培训营且考勤开着才显示——off/项目营的开关都在「营期设置」） -->
      <el-tab-pane v-if="!isProjectCamp && capOn('attendance')" label="出勤" name="plan">
        <template v-if="attModeSaved === 'daily'">
          <el-alert type="info" :closable="false"
            :title="`本营 ${memberPage.counts.student} 名学员；承诺出勤日按营期范围内工作日（${session.weekdays_only ? '仅周一~周五' : '含周末'}）展开`" />
          <div style="margin-top: 12px;">
            <el-button v-if="manageWritable" type="primary" @click="regenPlan">重生成承诺出勤日</el-button>
            <span class="hint">加入新学员时自动生成；此处可手动重生成（幂等，自动清理范围外/范围内周末的旧承诺日）</span>
          </div>
        </template>
        <el-alert v-else type="info" :closable="false"
          title="按周累计模式：学员报名不收承诺日，出勤看板按周统计打卡次数与时长" />
      </el-tab-pane>

      <!-- ④ 座位 -->
      <el-tab-pane v-if="capOn('seat')" label="座位" name="seats">
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
      <el-tab-pane v-if="capOn('leave')" label="请假审批" name="leave">
        <el-table :data="leaves" border size="small">
          <el-table-column label="学员" prop="username" width="100" />
          <el-table-column label="日期段" min-width="170">
            <template #default="{ row }">{{ row.start_date }} ~ {{ row.end_date }}</template>
          </el-table-column>
          <el-table-column label="事由" prop="reason" min-width="140" show-overflow-tooltip />
          <el-table-column label="审批意见" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.decision_note">{{ row.decision_note }}</span>
              <span v-else style="color: var(--el-text-color-placeholder);">—</span>
            </template>
          </el-table-column>
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
            <el-select v-model="rewardForm.user_id" filterable remote reserve-keyword
              :remote-method="searchRewardMembers" :loading="rewardMemberLoading"
              placeholder="输入姓名搜索学员" style="width: 100%;" @visible-change="openRewardMembers">
              <el-option v-for="m in rewardMemberOptions" :key="m.user_id" :label="m.username" :value="m.user_id" />
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

      <!-- ⑦ 学员申请（仅老师/超管；09-12 重组：导生报名挪「选导生」tab，此处纯学员/成员申请；
           09-16 多选/一键通过——批量端点逐项回报，部分失败逐项列明） -->
      <el-tab-pane v-if="canManage" label="学员申请" name="join">
        <el-alert v-if="!studentJoinRequests.length" type="info" :closable="false" title="暂无待审批的学员申请" />
        <template v-else>
          <div style="margin-bottom: 12px; margin-top: 12px;">
            <el-button type="primary" size="small" :disabled="!stuJoinSel.length" :loading="batchApproving"
              @click="batchApproveJoin(stuJoinSel)">通过选中（{{ stuJoinSel.length }}）</el-button>
            <el-button size="small" :loading="batchApproving"
              @click="confirmApproveAll(studentJoinRequests)">一键通过</el-button>
          </div>
          <el-table :data="studentJoinRequests" border size="small"
            @selection-change="(rows) => (stuJoinSel = rows)">
            <el-table-column type="selection" width="40" />
            <el-table-column label="申请人" prop="username" width="110" />
            <el-table-column label="邮箱" prop="email" min-width="160" show-overflow-tooltip />
            <!-- 09-12 砍学员报名意向大组：组别随归属导生继承（导生组=名片 tags），申请列表不再展示 -->
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
        </template>
      </el-tab-pane>

      <!-- ⑧ 选导生（learning 营老师/超管恒显；09-12 重组：导生全生命周期一页——
           招募（待审导生报名+导入）→ 方向与配置 → 选导生流程运营；建营弹窗只收基本信息） -->
      <el-tab-pane v-if="canManage && session.category === 'learning'" label="选导生" name="ms">
        <!-- ── ① 导生招募：待审导生报名（自由报名走审核）+ 导入即导生（超管）；
             09-17 报名门槛开关迁「营期设置」tab，此处纯运营 ── -->
        <h4 class="ms-sec-title">导生招募</h4>
        <template v-if="mentorJoinRequests.length">
          <div style="margin-bottom: 12px;">
            <el-button type="primary" size="small" :disabled="!mentorJoinSel.length" :loading="batchApproving"
              @click="batchApproveJoin(mentorJoinSel)">通过选中（{{ mentorJoinSel.length }}）</el-button>
            <el-button size="small" :loading="batchApproving"
              @click="confirmApproveAll(mentorJoinRequests)">一键通过</el-button>
          </div>
          <el-table :data="mentorJoinRequests" border size="small"
            @selection-change="(rows) => (mentorJoinSel = rows)">
            <el-table-column type="selection" width="40" />
            <el-table-column label="报名导生" prop="username" width="110" />
            <el-table-column label="邮箱" prop="email" min-width="160" show-overflow-tooltip />
            <el-table-column label="事由" prop="reason" min-width="120" show-overflow-tooltip />
            <el-table-column label="提交时间" width="110">
              <template #default="{ row }">{{ row.created_at ? row.created_at.slice(0, 10) : '' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <el-button size="small" type="success" link @click="approveJoin(row)">批准</el-button>
                <el-button size="small" type="danger" link @click="rejectJoin(row)">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <el-alert v-else type="info" :closable="false"
          :title="gateOn('mentor_level_gate')
            ? '暂无待审的导生报名（LV≥2 学员可在报名窗口内自助报名）'
            : '暂无待审的导生报名（学员可在报名窗口内自助报名，本营未设等级门槛）'"
          style="margin-bottom: 10px;" />

        <template v-if="isSuperAdmin">
          <h4 class="ms-sec-title">导入导生（直接入营，不经报名审核）</h4>
          <el-select v-model="eligibility.pickedId" filterable remote clearable
            class="elig-search" size="small" placeholder="按姓名搜索添加（手头只有名字时用）"
            :remote-method="searchMentorCandidates" :loading="eligibility.searching"
            no-data-text="无匹配用户" @change="addPickedCandidate">
            <el-option v-for="u in eligibility.searchResults" :key="u.user_id"
              :value="u.user_id" :label="u.username" :disabled="u.already_member">
              <div class="elig-opt">
                <span class="elig-opt-name">{{ u.username }}</span>
                <span class="elig-opt-mail">{{ u.email }}</span>
                <span class="elig-opt-meta">
                  LV{{ u.level || 1 }}<template v-if="u.institute"> · {{ u.institute }}</template><template v-if="u.major"> · {{ u.major }}</template>
                </span>
                <el-tag v-if="u.already_member" type="info" size="small">已在营</el-tag>
              </div>
            </el-option>
          </el-select>
          <el-input v-model="eligibility.raw" type="textarea" :rows="3"
            placeholder="粘贴导生邮箱，换行或逗号分隔均可，自动去重（上方搜人后自动回填）" />
          <div class="elig-toolbar">
            <el-button size="small" :loading="eligibility.previewing" @click="previewEligibility">预览</el-button>
            <el-button size="small" type="primary" :loading="eligibility.confirming" @click="confirmEligibility">确认导入</el-button>
            <el-divider direction="vertical" />
            <el-select v-model="eligibility.minLevel" size="small" class="elig-level-select">
              <el-option v-for="n in [2, 3, 4]" :key="n" :label="`LV${n} 及以上`" :value="n" />
            </el-select>
            <el-button size="small" :loading="eligibility.generating" @click="generateByLevel">按等级填充</el-button>
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
                  <el-tag v-if="row.already_member" type="info" size="small">已在营</el-tag>
                  <el-tag v-else type="success" size="small">将导入</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </template>


        <!-- 选导生与方向配置卡已迁「营期设置」tab（09-17 集中管理）；此处从流程运营继续 -->

        <!-- 阶段状态 + 手动推进（复用 session_update 改 deadline = 提前截止） -->
        <el-alert v-if="session.mentor_selection_enabled"
          :type="msPhaseAlertType"
          :closable="false"
          :title="`当前阶段：${msPhaseLabel} · 志愿 ${msOverview?.deadlines?.preference_deadline || '—'} 截止`"
        />
        <el-alert v-if="msOverview?.config_error" type="error" :closable="false" title="配置不完整：启用但缺少时间点/方向课程，请在上方配置卡补齐" style="margin-top:8px" />
        <template v-if="session.mentor_selection_enabled">
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
          <el-table-column label="方向" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.direction" size="small" effect="plain">{{ row.direction }}</el-tag>
              <span v-else style="color:#c0c4cc">—</span>
            </template>
          </el-table-column>
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
        <div class="ms-student-toolbar">
          <el-input v-model="msPage.keyword" clearable placeholder="搜索学员姓名" style="width: 200px;"
            @keyup.enter="applyMsStudentFilter" @clear="applyMsStudentFilter" />
          <el-button @click="applyMsStudentFilter">查询</el-button>
        </div>
        <el-table :data="msOverview?.students || []" border size="small" v-loading="msPage.loading">
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
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="msPage.page" v-model:page-size="msPage.pageSize"
            :total="msPage.total" :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next" @current-change="fetchMsOverview"
            @size-change="changeMsStudentPageSize" />
        </div>
        </template>
      </el-tab-pane>

      <!-- ⑨ 学习进度（09-16：培训营各组营员学习进度看板——按导生组分桶的认证子矩阵；
           lazy=首次激活才挂载拉数（逐学员逐课聚合查询较重）；archived 营可读作结营复盘） -->
      <el-tab-pane v-if="session.category === 'learning'" label="学习进度" name="progress" lazy>
        <CampProgressBoard :sid="Number(campId)" />
      </el-tab-pane>

      <!-- 项目营：申报审核（v1.3 阶段3；申报窗口仅 upcoming；申报门槛开关迁「营期设置」tab） -->
      <el-tab-pane v-if="isProjectCamp && canManage" label="项目申报" name="papp">
        <el-alert :type="session.status === 'upcoming' ? 'success' : 'info'" :closable="false"
          :title="session.status === 'upcoming'
            ? '申报期开放中：负责人提交申报，审核通过即建项目、负责人自动入营'
            : '申报期已结束（项目申报仅在「待开放」阶段进行），此处可查看历史申报'" />
        <el-table :data="pApps" border size="small" style="margin-top: 12px;" v-loading="pAppsLoading">
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="papp-expand">
                <p><b>背景：</b>{{ row.background || '—' }}</p>
                <p><b>目标：</b>{{ row.goal || '—' }}</p>
                <p><b>所需能力：</b>{{ row.required_abilities || '—' }}</p>
                <p><b>招募说明：</b>{{ row.recruit_note || '—' }}</p>
                <!-- 09-13 申报即模板：节点序列替代「计划」栏（过审即实例化里程碑） -->
                <p v-if="row.template_nodes?.length">
                  <b>交付节点：</b>
                  <span v-for="(n, i) in row.template_nodes" :key="i" class="papp-node">
                    {{ i + 1 }}. {{ n.title }}（{{ n.submit_mode === 'member' ? '个人交付' : '整队交付' }}）
                  </span>
                </p>
                <p v-else-if="row.plan"><b>计划：</b>{{ row.plan }}<span class="hint">（存量申报，过审后由负责人自建模板）</span></p>
                <p v-if="row.reject_reason"><b>退回原因：</b>{{ row.reject_reason }}</p>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="项目名" prop="name" min-width="150" />
          <el-table-column label="负责人" prop="leader_name" width="110" />
          <el-table-column label="版本" prop="version" width="60" align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'"
                size="small" effect="plain">
                {{ { pending: '待审核', approved: '已通过', rejected: '已退回' }[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" prop="created_at" width="160" />
          <el-table-column v-if="manageWritable" label="操作" width="150" align="center">
            <template #default="{ row }">
              <template v-if="row.status === 'pending'">
                <el-button size="small" type="success" plain @click="reviewProjectApp(row, 'approve')">通过</el-button>
                <el-button size="small" type="danger" plain @click="reviewProjectApp(row, 'reject')">退回</el-button>
              </template>
              <span v-else class="hint">已处理</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 项目营：交付审核（v1.3 阶段4：待审材料队列 + 成果核验 + 结营档案） -->
      <el-tab-pane v-if="isProjectCamp && canManage" label="交付审核" name="pdeli">
        <h4 class="ms-sec-title">待审核材料（{{ pd.pending.length }}）</h4>
        <div v-if="!pd.pending.length" class="hint" style="padding: 8px 0 4px;">没有待你审核的材料</div>
        <el-table v-else :data="pd.pending" border size="small">
          <el-table-column label="项目" prop="unit_name" min-width="120" />
          <el-table-column label="节点" prop="milestone_title" min-width="110" />
          <el-table-column label="提交人" prop="submitted_by_name" width="100" />
          <el-table-column label="版本" prop="version" width="60" align="center" />
          <el-table-column label="内容" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">{{ row.content || '（仅附件）' }}</template>
          </el-table-column>
          <el-table-column label="附件" width="90" align="center">
            <template #default="{ row }">
              <span v-if="!row.attachments?.length" class="hint">—</span>
              <a v-for="a in row.attachments" :key="a.id" :href="`/api/camp/submissions/attachments/${a.id}`"
                 target="_blank" style="font-size: 12px; margin-right: 6px;">{{ a.filename }}</a>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130" align="center">
            <template #default="{ row }">
              <el-button size="small" type="success" plain @click="reviewDelivery(row, 'approve')">通过</el-button>
              <el-button size="small" type="danger" plain @click="reviewDelivery(row, 'return')">退回</el-button>
            </template>
          </el-table-column>
        </el-table>

        <h4 class="ms-sec-title" style="margin-top: 16px;">成果核验（{{ pd.outcomes.length }}）</h4>
        <div v-if="!pd.outcomes.length" class="hint" style="padding: 8px 0 4px;">尚无成果登记（负责人在项目工作台登记）</div>
        <el-table v-else :data="pd.outcomes" border size="small">
          <el-table-column label="项目" prop="unit_name" min-width="120" />
          <el-table-column label="成果" prop="title" min-width="150" />
          <el-table-column label="说明" prop="description" min-width="200" show-overflow-tooltip />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="{ verified: 'success', rejected: 'danger', submitted: 'warning' }[row.status]" size="small" effect="plain">
                {{ { verified: '已核验', rejected: '已驳回', submitted: '待核验' }[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="manageWritable" label="操作" width="130" align="center">
            <template #default="{ row }">
              <template v-if="row.status !== 'verified'">
                <el-button size="small" type="success" plain @click="verifyOutcome(row, 'verify')">核验</el-button>
                <el-button size="small" type="danger" plain @click="verifyOutcome(row, 'reject')">驳回</el-button>
              </template>
              <span v-else class="hint">已入档</span>
            </template>
          </el-table-column>
        </el-table>

        <h4 class="ms-sec-title" style="margin-top: 16px;">结营档案</h4>
        <div v-if="session.status !== 'archived'" class="hint" style="padding: 8px 0 4px;">
          结营（running → archived）时自动冻结档案快照（成员/项目/里程碑终态/已核验成果），冻结后全端点只读
        </div>
        <template v-else>
          <div v-if="!pd.archive" class="hint" style="padding: 8px 0 4px;">档案加载中或未冻结（历史结营营不补建）</div>
          <template v-else>
            <div class="hint" style="padding: 4px 0;">
              冻结于 {{ pd.archive.frozen_at }} · 版本 v{{ pd.archive.version }} · 修正 {{ pd.archive.revisions.length }} 次
              <el-button v-if="manageWritable" size="small" style="margin-left: 8px;" @click="reviseArchive">登记修正</el-button>
            </div>
            <el-collapse>
              <el-collapse-item title="档案快照（关键事实）">
                <pre class="archive-snap">{{ JSON.stringify(pd.archive.snapshot, null, 2) }}</pre>
              </el-collapse-item>
              <el-collapse-item v-if="pd.archive.revisions.length" :title="`修正记录（${pd.archive.revisions.length}）`">
                <div v-for="r in pd.archive.revisions" :key="r.version" class="hint" style="padding: 4px 0;">
                  v{{ r.version }} · {{ r.created_at }} · {{ r.reason }}
                </div>
              </el-collapse-item>
            </el-collapse>
          </template>
        </template>
      </el-tab-pane>

      <!-- 项目营：组队总览（回填/变更管理员通道） -->
      <el-tab-pane v-if="isProjectCamp && canManage" label="项目组队" name="pform">
        <div style="margin: 12px 0;">
          <el-button size="small" :loading="pExporting" @click="exportProjectCsv">导出项目志愿 CSV</el-button>
          <el-button size="small" type="primary" plain :disabled="session.status !== 'selecting'" @click="openProjectBatch">
            批量回填
          </el-button>
          <span class="hint">
            {{ session.status === 'selecting'
              ? '选择阶段：导出志愿线下协调后批量回填；负责人也可在工作台自行勾选'
              : '批量回填仅选择阶段可用；开营后成员变更走下方管理员操作（原因必填留痕）' }}
          </span>
        </div>

        <el-table :data="pOverview.projects || []" border size="small" v-loading="pOverviewLoading">
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="papp-expand">
                <p v-for="m in row.members" :key="m.user_id">
                  <el-tag :type="m.role === 'leader' ? 'warning' : 'info'" size="small" effect="plain" style="margin-right:8px">
                    {{ m.role === 'leader' ? '负责人' : '成员' }}
                  </el-tag>
                  {{ m.username }}
                  <span v-if="m.status === 'ended'" class="hint">（已退出）</span>
                  <el-button v-else-if="m.role !== 'leader' && manageWritable" size="small" type="danger" text
                    style="margin-left: 8px;" @click="endProjectMember(row, m)">移除</el-button>
                </p>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="项目" prop="name" min-width="150" />
          <el-table-column label="负责人" prop="leader_name" width="110" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="{ active: 'success', paused: 'warning', terminated: 'danger' }[row.status]" size="small" effect="plain">
                {{ { active: '进行中', paused: '已暂停', terminated: '已终止' }[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="成员数" width="70" align="center">
            <template #default="{ row }">{{ row.members?.filter((m) => m.status === 'active').length ?? 0 }}</template>
          </el-table-column>
          <el-table-column v-if="manageWritable" label="管理员操作" width="230" align="center">
            <template #default="{ row }">
              <el-button size="small" @click="changeProjectLeader(row)">换负责人</el-button>
              <el-button v-if="row.status === 'active'" size="small" type="warning" plain @click="setProjectStatus(row, 'paused')">暂停</el-button>
              <el-button v-else-if="row.status === 'paused'" size="small" type="success" plain @click="setProjectStatus(row, 'active')">恢复</el-button>
              <el-button v-if="row.status !== 'terminated'" size="small" type="danger" plain @click="setProjectStatus(row, 'terminated')">终止</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-collapse style="margin-top: 14px;">
          <el-collapse-item :title="`变更事件流（最近 ${pOverview.events?.length ?? 0} 条）`">
            <el-table :data="pOverview.events || []" border size="small">
              <el-table-column label="时间" prop="occurred_at" width="160" />
              <el-table-column label="项目" min-width="120">
                <template #default="{ row }">{{ pUnitName(row.unit_id) }}</template>
              </el-table-column>
              <el-table-column label="对象" prop="username" width="100" />
              <el-table-column label="动作" width="100" align="center">
                <template #default="{ row }">
                  <el-tag size="small" effect="plain">{{ pActionLabel(row.action) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="来源" width="100" align="center">
                <template #default="{ row }">
                  {{ { leader_pick: '负责人勾选', admin_adjust: '管理员', apply: '申报', approve: '过审' }[row.source] || row.source }}
                </template>
              </el-table-column>
              <el-table-column label="原因" prop="reason" min-width="140" show-overflow-tooltip />
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </el-tab-pane>

      <!-- ⑬ 营期设置（09-17 集中管理）：准入门槛/考勤模式/选导生流程收拢至此，各业务 tab 只留运营；
           lazy 首次激活才挂载（此时 session/allCourses 已就绪），保存成功 @saved → fetchAll 回读 -->
      <el-tab-pane v-if="canManage" label="营期设置" name="settings" lazy>
        <CampSettingsTab :session="session" :camp-id="campId"
          :manage-writable="manageWritable" :all-courses="allCourses" @saved="fetchAll" />
      </el-tab-pane>
    </el-tabs>

    <!-- 加成员（多选批量；v1.3 阶段3：口径对齐后端=仅拒超管，营内角色显式指定，
         提交走事务批量端点逐项回报） -->
    <el-dialog v-model="memberDlg.visible" title="加成员" width="520px">
      <el-form :model="memberDlg.form" label-width="80px">
        <el-form-item label="用户" required>
          <el-select v-model="memberDlg.form.user_ids" multiple collapse-tags collapse-tags-tooltip
            filterable remote reserve-keyword :remote-method="searchMemberCandidates"
            :loading="memberCandidateLoading" placeholder="输入姓名或邮箱搜索（可多选）"
            style="width: 100%;" @change="rememberMemberCandidates">
            <el-option v-for="u in memberCandidateOptions" :key="u.User_Id"
              :label="`${u.User_Name}（${u.User_Email}）`" :value="u.User_Id" />
          </el-select>
          <div style="width: 100%; color: #909399; font-size: 12px; line-height: 1.5;">
            每次最多返回 20 个候选，已在本营和管理员账号不会出现在结果中
          </div>
        </el-form-item>
        <el-form-item label="营内角色" required>
          <el-select v-model="memberDlg.form.role" style="width: 100%;">
            <template v-if="isProjectCamp">
              <el-option label="成员（项目营通用身份）" value="member" />
            </template>
            <template v-else>
              <el-option label="学员" value="student" />
              <el-option label="导生" value="mentor" />
            </template>
          </el-select>
          <div style="width: 100%; color: #909399; font-size: 12px; line-height: 1.5;">
            身份解耦后全局角色不再决定营内身份，加入时须显式指定
          </div>
        </el-form-item>
        <el-form-item v-if="!isProjectCamp && memberDlg.form.role === 'student'" label="归属导生">
          <el-select v-model="memberDlg.form.team_mentor_id" clearable placeholder="统一指定（可选）" style="width: 100%;">
            <el-option v-for="m in mentorMembers" :key="m.user_id" :label="m.username" :value="m.user_id" />
          </el-select>
          <div style="width: 100%; color: #909399; font-size: 12px; line-height: 1.5;">将应用到本次全部学员；加入后可在成员列表改派</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="memberDlg.submitting" @click="submitAddMember">
          加入{{ memberDlg.form.user_ids.length ? `（${memberDlg.form.user_ids.length}）` : '' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 委任营期负责人（阶段 1，CampStaff） -->
    <el-dialog v-model="staffDlg.visible" :title="staffDlg.role === 'owner' ? '委任主负责人' : '委任协同老师'" width="480px">
      <el-form label-width="80px">
        <el-form-item label="用户" required>
          <el-select v-model="staffDlg.userId" filterable remote reserve-keyword
            :remote-method="searchStaffCandidates" :loading="staffDlg.searching"
            placeholder="输入姓名搜索普通用户" style="width: 100%;">
            <el-option v-for="u in staffDlg.options" :key="u.id"
              :label="`${u.username}（LV${u.level || 1}${u.institute ? ' · ' + u.institute : ''}）`"
              :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="staffDlg.role === 'owner'" label="说明">
          <div style="color: #909399; font-size: 12px; line-height: 1.6;">
            主负责人是营期第一责任人（每营一个）；本营已有主负责人时将自动转交给新负责人并通知双方
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="staffDlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="staffDlg.submitting" @click="submitStaffAssign">委任</el-button>
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
          <el-select v-model="seatDlg.form.user_id" clearable filterable remote reserve-keyword
            :remote-method="searchSeatMembers" :loading="seatMemberLoading"
            placeholder="输入姓名搜索；留空 = 解绑" style="width: 100%;" @visible-change="openSeatMembers">
            <el-option v-for="m in seatMemberOptions" :key="m.user_id" :label="m.username" :value="m.user_id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="seatDlg.visible = false">取消</el-button>
        <el-button type="primary" @click="submitAssignSeat">分配</el-button>
      </template>
    </el-dialog>

    <!-- 批量指派导生（线下协调结果回填：导入 JSON/CSV 批量预填，或逐行手选） -->
    <el-dialog v-model="batchDlg.visible" title="批量指派导生" width="680px" v-loading="batchDlg.loading">
      <el-alert type="info" :closable="false" style="margin-bottom: 10px;"
        title="导入线下协调结果批量填充（也可逐行手选）；已分配、冲突、失败的行会就地标注结果" />
      <el-input v-model="batchDlg.raw" type="textarea" :rows="3"
        placeholder="粘贴协调结果：CSV 每行「学员,导生」（可含表头行），或 JSON [{&quot;student&quot;:&quot;姓名&quot;,&quot;mentor&quot;:&quot;姓名&quot;}] / {&quot;学员&quot;:&quot;导生&quot;}；姓名与用户ID均可匹配" />
      <div class="batch-import-bar">
        <el-button size="small" @click="importBatchText">解析填充</el-button>
        <el-button size="small" @click="batchFileRef?.click()">上传文件（.json / .csv / .txt）</el-button>
        <input ref="batchFileRef" type="file" accept=".json,.csv,.txt" style="display:none" @change="onBatchFile" />
        <span v-if="batchDlg.importNote" class="batch-import-note">{{ batchDlg.importNote }}</span>
      </div>
      <div v-if="!batchDlg.rows.length" class="hint" style="padding: 10px 0;">本营暂无未分配学员</div>
      <el-table v-else :data="batchDlg.rows" border size="small" max-height="360">
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

    <!-- 批量回填项目成员（线下协调结果；逐项回报） -->
    <el-dialog v-model="pBatchDlg.visible" title="批量回填项目成员" width="720px" v-loading="pBatchDlg.loading">
      <el-alert type="info" :closable="false" style="margin-bottom: 10px;"
        title="为成员逐行选择项目后提交；已在项目内、达 3 上限、失败的行会就地标注结果" />
      <div v-if="!pBatchDlg.rows.length" class="hint" style="padding: 10px 0;">本营暂无可回填成员</div>
      <el-table v-else :data="pBatchDlg.rows" border size="small" max-height="420">
        <el-table-column label="成员" prop="username" min-width="100" />
        <el-table-column label="已参与" width="80" align="center">
          <template #default="{ row }">{{ row._count }}</template>
        </el-table-column>
        <el-table-column label="加入项目" min-width="200">
          <template #default="{ row }">
            <el-select v-model="row._unit" size="small" placeholder="选择项目" style="width: 100%;" :disabled="!!row._result">
              <el-option v-for="p in pActiveProjects" :key="p.unit_id" :label="`${p.name}（${p.leader_name}）`" :value="p.unit_id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="结果" min-width="200">
          <template #default="{ row }">
            <template v-if="row._result">
              <el-tag :type="pBatchStatusMeta(row._result.status).tag" size="small" effect="plain">
                {{ pBatchStatusMeta(row._result.status).label }}
              </el-tag>
              <span class="batch-msg">{{ row._result.message }}</span>
            </template>
            <span v-else class="hint">—</span>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="pBatchDlg.visible = false">关闭</el-button>
          <el-button type="primary" :loading="pBatchDlg.submitting" @click="submitProjectBatch">提交回填</el-button>
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
import CampProgressBoard from './CampProgressBoard.vue';
import CampSettingsTab from './CampSettingsTab.vue';

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
// ── ?tab= 深链（09-17，照用户端 CampView 范式）：初始化读 query → visibleTabs 校正 → 切换 replace 写回 ──
const KNOWN_TABS = new Set(['staff', 'members', 'courses', 'plan', 'seats', 'leave', 'reward', 'join',
  'ms', 'progress', 'papp', 'pdeli', 'pform', 'settings']);
const activeTab = ref(KNOWN_TABS.has(route.query.tab) ? route.query.tab : 'members');
const session = ref({});
const members = ref([]);
const memberPage = reactive({
  page: 1, pageSize: 20, total: 0, keyword: '', role: '', loading: false,
  counts: { student: 0, mentor: 0, member: 0 },
});
const courses = ref([]);
const seats = ref([]);
const leaves = ref([]);

// 选项数据（权限不足时为空，不阻断页面）
const allCourses = ref([]);
const medals = ref([]);
const physicalSeats = ref([]);
const mentorMembers = ref([]);
const memberCandidates = ref([]);
const selectedMemberCandidates = ref([]);
const memberCandidateLoading = ref(false);
const rewardMemberOptions = ref([]);
const rewardMemberLoading = ref(false);
const seatMemberOptions = ref([]);
const seatMemberLoading = ref(false);

const memberDlg = reactive({ visible: false, form: { user_ids: [], team_mentor_id: null }, submitting: false });
const courseDlg = reactive({ visible: false, course_id: null });
const seatDlg = reactive({ visible: false, form: { seat_id: null, user_id: null } });
const rewardForm = reactive({ user_id: null, medal_id: null, description: '' });
const rewardSubmitting = ref(false);
const joinRequests = ref([]);
const joinMentors = ref([]);
// 09-12 重组：学员申请 tab 纯学员（导生报名挪「选导生」tab 招募区）
const studentJoinRequests = computed(() => joinRequests.value.filter((r) => r.apply_role !== 'mentor'));
const mentorJoinRequests = computed(() => joinRequests.value.filter((r) => r.apply_role === 'mentor'));

// 加成员：口径对齐后端（camp.py _assign_member）——仅拒 super_admin，营内角色显式指定，
// 不再从全局 user.role 派生（身份解耦残留 gate 修复，总账 §六.2 首单）
const isProjectCamp = computed(() => session.value.category === 'project');
// 能力开关（v1.3）：tab 渲染跟随营期 policy（learning 默认全开；旧 mock 无 policy 时回退开）
const capOn = (k) => session.value?.policy?.capabilities?.[k] ?? true;
// 可见 tab 名单：与模板各 el-tab-pane 的 v-if 逐条镜像（改 pane 显隐时同步此处，深链校正依赖它）
const visibleTabs = computed(() => {
  const t = ['members'];
  if (isProjectCamp.value) t.push('courses');
  if (!isProjectCamp.value && capOn('attendance')) t.push('plan');
  if (capOn('seat')) t.push('seats');
  if (capOn('leave')) t.push('leave');
  t.push('reward');
  if (canManage.value) t.push('join');
  if (canManage.value && session.value.category === 'learning') t.push('ms');
  if (session.value.category === 'learning') t.push('progress');
  if (isProjectCamp.value && canManage.value) t.push('papp', 'pdeli', 'pform');
  t.push('settings');
  return t;
});
const memberCandidateOptions = computed(() => {
  const byId = new Map();
  for (const user of [...selectedMemberCandidates.value, ...memberCandidates.value]) {
    byId.set(user.User_Id, user);
  }
  return [...byId.values()];
});
const availableCourses = computed(() => {
  // /camp/.../courses 返回 int id 而 /course/list 返回字符串 id，统一转 String 再比对
  const added = new Set(courses.value.map((c) => String(c.course_id)));
  return allCourses.value.filter((c) => !added.has(String(c.Course_Id)));
});
const mentorName = (id) => (id ? mentorMembers.value.find((m) => m.user_id === id)?.username || '—' : '—');

const statusLabel = (s) => ({ draft: '草稿', upcoming: '待开放', selecting: '选择阶段', running: '进行中', archived: '已结营' }[s] || s);
const statusType = (s) => ({ draft: 'info', upcoming: 'primary', selecting: 'warning', running: 'success', archived: 'info' }[s] || 'info');
const leaveStatusLabel = (s) => ({ pending: '待审批', approved: '已批准', rejected: '已拒绝' }[s] || s);
const leaveStatusType = (s) => ({ pending: 'warning', approved: 'success', rejected: 'info' }[s] || 'info');

const goBack = () => router.push('/camp/sessions');

// ── 考勤模式（09-17 设置集中管理）：编辑器迁 CampSettingsTab，此处仅留守出勤 tab
// 数据分支所需的保存态只读派生（attModeSaved 与子组件本地副本保持一致，e2e 锁行为）──
const attModeSaved = computed(() => {
  const caps = session.value.policy?.capabilities;
  if (caps && caps.attendance === false) return 'off';
  return session.value.policy?.attendance_mode || 'daily';
});

// 09-17 等级门槛开关已迁 CampSettingsTab；此纯函数供选导生 tab 招募空态文案使用
//（回退值与类型默认一致：mentor 默认开、leader 默认关）
const gateOn = (k) => {
  if (k === 'leader_level_gate') return session.value?.policy?.capabilities?.[k] ?? false;
  return session.value?.policy?.capabilities?.[k] ?? true;
};

async function fetchMembers() {
  memberPage.loading = true;
  try {
    const res = await api.get(`/camp/sessions/${campId}/members`, { params: {
      page: memberPage.page, page_size: memberPage.pageSize,
      keyword: memberPage.keyword.trim() || undefined,
      role: memberPage.role || undefined,
    } });
    const data = res.data || {};
    members.value = data.members || [];
    memberPage.total = data.total ?? members.value.length;
    memberPage.counts = { ...memberPage.counts, ...(data.counts || {}) };
    const lastPage = Math.max(1, Math.ceil(memberPage.total / memberPage.pageSize));
    if (memberPage.page > lastPage) {
      memberPage.page = lastPage;
      return fetchMembers();
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载成员名单失败');
  } finally {
    memberPage.loading = false;
  }
}

async function fetchMentors() {
  try {
    const res = await api.get(`/camp/sessions/${campId}/members`, {
      params: { page: 1, page_size: 100, role: 'mentor' },
    });
    mentorMembers.value = (res.data?.members || []).filter((m) => m.role === 'mentor');
  } catch { mentorMembers.value = []; }
}

function applyMemberFilters() {
  memberPage.page = 1;
  fetchMembers();
}

function changeMemberPageSize() {
  memberPage.page = 1;
  fetchMembers();
}

async function fetchAll() {
  loading.value = true;
  try {
    // 逐项容错：项目营的座位/请假被 capability 门禁 400（正常态），不能拖挂整页数据
    const [s, c, st, lv] = await Promise.all([
      api.get(`/camp/sessions/${campId}`).catch(() => null),
      api.get(`/camp/sessions/${campId}/courses`).catch(() => null),
      api.get(`/camp/sessions/${campId}/seats`).catch(() => null),
      api.get(`/camp/sessions/${campId}/leave`).catch(() => null),
      fetchMembers(),
      fetchMentors(),
      fetchStaff(),
    ]);
    session.value = s?.data?.session || {};
    courses.value = c?.data?.courses || [];
    seats.value = st?.data?.seats || [];
    leaves.value = lv?.data?.leaves || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载营期详情失败');
  } finally {
    loading.value = false;
  }
}

// ── 营期负责人（阶段 1，CampStaff）：委任/转交/解除 + 职责事件 ──
const staffRows = ref([]);
const staffEvents = ref([]);
const staffLoading = ref(false);
const staffDlg = reactive({
  visible: false, role: 'teacher', userId: null, options: [],
  searching: false, submitting: false,
});
const activeOwner = computed(() =>
  staffRows.value.find((r) => r.role === 'owner' && r.status === 'active'));

async function fetchStaff() {
  staffLoading.value = true;
  try {
    const res = await api.get(`/camp/sessions/${campId}/staff`);
    staffRows.value = res.data?.staff || [];
    staffEvents.value = res.data?.events || [];
  } catch { /* 静默：负责人 tab 数据失败不拖挂整页 */ }
  finally { staffLoading.value = false; }
}

let staffSearchTimer = null;
function searchStaffCandidates(keyword) {
  clearTimeout(staffSearchTimer);
  staffSearchTimer = setTimeout(async () => {
    const q = (keyword || '').trim();
    if (!q) { staffDlg.options = []; return; }
    staffDlg.searching = true;
    try {
      const res = await api.get('/user/search', { params: { keyword: q, page_size: 20 } });
      staffDlg.options = res.data?.users || [];
    } catch { staffDlg.options = []; }
    finally { staffDlg.searching = false; }
  }, 250);
}

function openStaffAssign(role) {
  staffDlg.role = role;
  staffDlg.userId = null;
  staffDlg.options = [];
  staffDlg.visible = true;
}

async function submitStaffAssign() {
  if (!staffDlg.userId) { ElMessage.warning('请先搜索并选择用户'); return; }
  staffDlg.submitting = true;
  try {
    if (staffDlg.role === 'owner') {
      // 已有主负责人 → 转交口径（结束旧 owner + 落新 owner，事务内完成并通知双方）
      if (activeOwner.value) {
        const name = staffDlg.options.find((o) => o.id === staffDlg.userId)?.username || '新负责人';
        try {
          await ElMessageBox.confirm(
            `本营主负责人为「${activeOwner.value.username}」，将转交给「${name}」并通知双方`, '转交主负责人',
            { confirmButtonText: '转交', cancelButtonText: '取消', type: 'warning' });
        } catch { staffDlg.submitting = false; return; }
        await api.post(`/camp/sessions/${campId}/staff/transfer-owner`, { user_id: staffDlg.userId });
        ElMessage.success('主负责人已转交');
      } else {
        await api.post(`/camp/sessions/${campId}/staff`, { user_id: staffDlg.userId, role: 'owner' });
        ElMessage.success('已委任主负责人');
      }
    } else {
      await api.post(`/camp/sessions/${campId}/staff`, { user_id: staffDlg.userId, role: 'teacher' });
      ElMessage.success('已委任协同老师');
    }
    staffDlg.visible = false;
    fetchStaff();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '委任失败');
  } finally {
    staffDlg.submitting = false;
  }
}

function endStaff(row) {
  guarded(async () => {
    let reason = '';
    try {
      const { value } = await ElMessageBox.prompt(
        `可填写解除原因（将通知「${row.username}」）`,
        row.role === 'owner' ? '解除主负责人（本营回到管理员兜底）' : '解除协同老师',
        { confirmButtonText: '解除', cancelButtonText: '取消', type: 'warning', inputPlaceholder: '原因（可选）' });
      reason = value || '';
    } catch { return; }
    try {
      await api.post(`/camp/sessions/${campId}/staff/${row.user_id}/end`, { reason });
      ElMessage.success('已解除');
      fetchStaff();
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '操作失败');
    }
  });
}

function transferOwner(row) {
  guarded(async () => {
    let reason = '';
    try {
      const { value } = await ElMessageBox.prompt(
        `将把主负责人从「${activeOwner.value?.username || '—'}」转交给「${row.username}」，双方都会收到通知`,
        '转交主负责人', { confirmButtonText: '转交', cancelButtonText: '取消', type: 'warning', inputPlaceholder: '原因（可选）' });
      reason = value || '';
    } catch { return; }
    try {
      await api.post(`/camp/sessions/${campId}/staff/transfer-owner`, { user_id: row.user_id, reason });
      ElMessage.success('主负责人已转交');
      fetchStaff();
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '操作失败');
    }
  });
}

async function fetchOptions() {
  // 用户候选改为打开弹窗后远程分页搜索，首屏不再拉全站用户。
  // 课程/座位接口需对应权限；勋章走 /camp/medals（仅需营期角色，不依赖 medal_management）。
  try {
    const [c, md, ps] = await Promise.all([
      api.get('/course/list').catch(() => null),
      api.get('/camp/medals').catch(() => null),
      api.get('/seat/rooms/106/seats').catch(() => null),
    ]);
    allCourses.value = c?.data || [];
    medals.value = md?.data?.medals || [];
    physicalSeats.value = ps?.data?.seats || [];
  } catch { /* 忽略 */ }
}

// ── 成员 ──
function openAddMember() {
  memberDlg.form = { user_ids: [], role: isProjectCamp.value ? 'member' : 'student', team_mentor_id: null };
  memberCandidates.value = [];
  selectedMemberCandidates.value = [];
  memberDlg.visible = true;
  loadMemberCandidates('');
}

let memberCandidateTimer = null;
let memberCandidateSeq = 0;
function searchMemberCandidates(keyword) {
  clearTimeout(memberCandidateTimer);
  memberCandidateTimer = setTimeout(() => loadMemberCandidates(keyword), 250);
}
async function loadMemberCandidates(keyword) {
  const seq = ++memberCandidateSeq;
  memberCandidateLoading.value = true;
  try {
    const res = await api.get(`/camp/sessions/${campId}/member-candidates`, {
      params: { keyword: (keyword || '').trim() || undefined, page: 1, page_size: 20 },
    });
    if (seq === memberCandidateSeq) memberCandidates.value = res.data?.users || [];
  } catch (e) {
    if (seq === memberCandidateSeq) memberCandidates.value = [];
    ElMessage.error(e.response?.data?.message || '搜索候选用户失败');
  } finally {
    if (seq === memberCandidateSeq) memberCandidateLoading.value = false;
  }
}
function rememberMemberCandidates(ids) {
  const selected = new Map(selectedMemberCandidates.value.map((u) => [u.User_Id, u]));
  for (const user of memberCandidates.value) {
    if (ids.includes(user.User_Id)) selected.set(user.User_Id, user);
  }
  selectedMemberCandidates.value = ids.map((id) => selected.get(id)).filter(Boolean);
}
// 事务批量端点（v1.3）：单请求逐项回报，部分成功不吞
async function submitAddMember() {
  const ids = memberDlg.form.user_ids || [];
  if (!ids.length) { ElMessage.warning('请选择用户'); return; }
  memberDlg.submitting = true;
  try {
    const res = await api.post(`/camp/sessions/${campId}/members/batch`, {
      items: ids.map((id) => ({
        user_id: id, role: memberDlg.form.role,
        team_mentor_id: (!isProjectCamp.value && memberDlg.form.role === 'student')
          ? memberDlg.form.team_mentor_id : null,
      })),
    });
    const { added, results } = res.data || {};
    const nameOf = (uid) => memberCandidateOptions.value.find((u) => u.User_Id === uid)?.User_Name || `#${uid}`;
    const fails = (results || []).filter((r) => r.status === 'failed');
    if (added) {
      ElMessage.success(`已加入 ${added} 人`);
      memberDlg.visible = false;
      fetchAll();
    }
    if (fails.length) {
      ElMessage.error(`加入失败 ${fails.length} 人 —— ${fails.map((f) => `${nameOf(f.user_id)}：${f.message}`).join('；')}`);
    } else if (!added) {
      ElMessage.warning('无人加入（见失败原因）');
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量加入失败');
  } finally {
    memberDlg.submitting = false;
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
function openAssignSeat() {
  seatDlg.form = { seat_id: null, user_id: null };
  seatDlg.visible = true;
  if (!seatMemberOptions.value.length) loadSeatMembers('');
}
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

async function fetchMemberOptions(keyword, role) {
  const res = await api.get(`/camp/sessions/${campId}/members`, { params: {
    page: 1, page_size: 30, keyword: (keyword || '').trim() || undefined,
    role: role || undefined,
  } });
  return res.data?.members || [];
}

let rewardMemberTimer = null;
function searchRewardMembers(keyword) {
  clearTimeout(rewardMemberTimer);
  rewardMemberTimer = setTimeout(() => loadRewardMembers(keyword), 250);
}
async function loadRewardMembers(keyword) {
  rewardMemberLoading.value = true;
  try {
    rewardMemberOptions.value = await fetchMemberOptions(keyword, 'student');
  } catch { rewardMemberOptions.value = []; }
  finally { rewardMemberLoading.value = false; }
}
function openRewardMembers(visible) {
  if (visible && !rewardMemberOptions.value.length) loadRewardMembers('');
}

let seatMemberTimer = null;
function searchSeatMembers(keyword) {
  clearTimeout(seatMemberTimer);
  seatMemberTimer = setTimeout(() => loadSeatMembers(keyword), 250);
}
async function loadSeatMembers(keyword) {
  seatMemberLoading.value = true;
  try {
    seatMemberOptions.value = await fetchMemberOptions(keyword);
  } catch { seatMemberOptions.value = []; }
  finally { seatMemberLoading.value = false; }
}
function openSeatMembers(visible) {
  if (visible && !seatMemberOptions.value.length) loadSeatMembers('');
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
    let note = '';
    if (!approve) {
      // 拒绝影响较大，先确认并收集原因（随审批入库 decision_note，进入学员通知）
      try {
        const { value } = await ElMessageBox.prompt(
          `可填写拒绝原因（将通知「${row.username}」）`, `拒绝 ${row.username} ${row.start_date}~${row.end_date} 的请假`,
          { confirmButtonText: '拒绝', cancelButtonText: '取消', type: 'warning', inputPlaceholder: '原因（可选）' });
        note = value || '';
      } catch { return; }
    }
    try {
      await api.post(`/camp/leave/${row.id}/approve`, { approve, note });
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
      const r = await api.post(`/camp/join-requests/${row.id}/approve`, { team_mentor_id: row._mentor });
      // 负责人资格申请（09-13）：后端返回「资格生效可申报」语义，与入营批准区分
      ElMessage.success(r.data?.message || '已批准并加入营期');
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

// ── 批量通过（09-16 多选/一键）：学员申请与导生报名通用，走 batch-approve 逐项回报端点 ──
const stuJoinSel = ref([]);
const mentorJoinSel = ref([]);
const batchApproving = ref(false);

function batchApproveJoin(rows) {
  guarded(() => submitBatchApprove(rows));
}
// 一键通过波及全部待审，先确认再执行（通过选中=显式选择即意图，直接执行）
function confirmApproveAll(rows) {
  guarded(async () => {
    try {
      await ElMessageBox.confirm(`将一次性通过全部 ${rows.length} 项待审批申请`, '一键通过',
        { type: 'warning', confirmButtonText: '全部通过', cancelButtonText: '取消' });
    } catch { return; }   // 用户取消
    await submitBatchApprove(rows);
  });
}
async function submitBatchApprove(rows) {
  if (!rows.length) return;
  batchApproving.value = true;
  try {
    // 学员行带 row._mentor（未启用选导生的营期生效；导生行恒 null）
    const items = rows.map((r) => ({ id: r.id, team_mentor_id: r._mentor ?? null }));
    const r = await api.post(`/camp/sessions/${campId}/join-requests/batch-approve`, { items });
    ElMessage.success(r.data?.message || '批量通过完成');
    // 契约红线（members/batch 同款）：部分成功必须逐项列明，不允许显示为全部成功
    const failed = (r.data?.results || []).filter((x) => x.status === 'failed');
    if (failed.length) {
      const detail = failed.map((f) => {
        const row = rows.find((rr) => rr.id === f.id);
        return `${row?.username || f.id}：${f.message}`;
      }).join('；');
      ElMessage.warning(`未通过 ${failed.length} 项——${detail}`);
    }
    fetchAll();
    fetchJoinRequests();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量通过失败');
  } finally {
    batchApproving.value = false;
  }
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

// ── 导入导生（2026-09-12 资格名单退役：导入即直接成为本营导生，绕过报名审核；
//    走 members/batch（role=mentor，逐项回报）；导生也可在报名窗口内 LV≥2 自助报名走审核）──
const eligibility = reactive({
  raw: '', emails: [],
  preview: null, previewing: false, confirming: false,
  minLevel: 2, generating: false,
  pickedId: null, searchResults: [], searching: false,
});

// 按姓名搜人（只读选人器）：300ms 防抖远程搜索，选中即把邮箱回填导入框
let mentorSearchTimer = null;
function searchMentorCandidates(keyword) {
  clearTimeout(mentorSearchTimer);
  const kw = (keyword || '').trim();
  if (!kw) { eligibility.searchResults = []; return; }
  mentorSearchTimer = setTimeout(async () => {
    eligibility.searching = true;
    try {
      const res = await api.get(`/camp/sessions/${campId}/mentor-import/search`, { params: { keyword: kw } });
      eligibility.searchResults = res.data.data?.users || [];
    } catch {
      eligibility.searchResults = [];
    } finally {
      eligibility.searching = false;
    }
  }, 300);
}

function addPickedCandidate(uid) {
  const u = eligibility.searchResults.find((r) => r.user_id === uid);
  eligibility.pickedId = null;          // 选完即清空：作为「搜一个加一个」的追加器
  if (!u) return;
  const emails = parseEmails();
  if (emails.includes((u.email || '').toLowerCase())) { ElMessage.info('该导生已在导入框中'); return; }
  eligibility.raw = eligibility.raw.trim() ? `${eligibility.raw.trim()}\n${u.email}` : u.email;
  eligibility.preview = null;           // 名单变了，旧预览作废
  ElMessage.success(`已添加 ${u.username}`);
}

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

async function previewEligibility() {
  const emails = parseEmails();
  if (!emails.length) { ElMessage.warning('请先粘贴邮箱'); return; }
  eligibility.emails = emails;
  eligibility.previewing = true;
  try {
    const res = await api.post(`/camp/sessions/${campId}/mentor-import/preview`, { emails });
    eligibility.preview = res.data.data || { matched: [], unmatched_emails: [] };
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '预览失败');
  } finally {
    eligibility.previewing = false;
  }
}

async function confirmEligibility() {
  // 先预览匹配拿 user_id（幂等口径同后端 dry-run），再走 members/batch 以导生身份直接入营
  const emails = parseEmails();
  if (!emails.length) { ElMessage.warning('请先粘贴邮箱'); return; }
  eligibility.confirming = true;
  try {
    const pre = await api.post(`/camp/sessions/${campId}/mentor-import/preview`, { emails });
    const matched = pre.data.data?.matched || [];
    const nameOf = Object.fromEntries(matched.map((u) => [u.user_id, u.username]));
    const items = matched.filter((u) => !u.already_member)
      .map((u) => ({ user_id: u.user_id, role: 'mentor' }));
    if (!items.length) { ElMessage.info('匹配到的账号均已在营，无需导入'); return; }
    const res = await api.post(`/camp/sessions/${campId}/members/batch`, { items });
    const { added, results } = res.data;
    const failed = (results || []).filter((r) => r.status === 'failed');
    if (failed.length) ElMessage.error(failed.map((r) => `${nameOf[r.user_id] || r.user_id}：${r.message}`).join('；'));
    if (added) {
      ElMessage.success(res.data.message || `已导入 ${added} 名导生`);
      eligibility.preview = null;
      eligibility.raw = '';
      eligibility.emails = [];
      fetchAll();
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '导入失败');
  } finally {
    eligibility.confirming = false;
  }
}

// 按等级填充（只读选人器）：LV≥min_level、排除管理员与在营成员的候选邮箱回填导入框
async function generateByLevel() {
  eligibility.generating = true;
  try {
    const res = await api.post(
      `/camp/sessions/${campId}/mentor-import/candidates-by-level`,
      { min_level: eligibility.minLevel },
    );
    const emails = res.data.data?.emails || [];
    eligibility.raw = emails.join('\n');
    eligibility.preview = null;
    ElMessage.success(emails.length
      ? `已填充 ${emails.length} 个候选邮箱（LV≥${eligibility.minLevel}，不含在营成员）`
      : '该等级区间没有可导入的候选');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '填充失败');
  } finally {
    eligibility.generating = false;
  }
}

watch(activeTab, (t) => {
  // URL 同步在前（learning 营也要写回；replace 不进历史栈）
  if (route.query.tab !== t) router.replace({ query: { ...route.query, tab: t } });
  if (t === 'ms' && canManage.value && !msOverview.value) fetchMsOverview();
  if (!isProjectCamp.value || !canManage.value) return;
  if (t === 'papp') fetchProjectApps();
  if (t === 'pform') fetchProjectOverview();
  if (t === 'pdeli') fetchDeliveryAdmin();
});
// session 异步到达后校正：深链指向此刻才能判定合法（ms 依赖 category）；当前 tab 消失时回落第一个
watch(visibleTabs, (items) => {
  const want = route.query.tab;
  if (want && items.includes(want) && activeTab.value !== want) activeTab.value = want;
  else if (!items.includes(activeTab.value)) activeTab.value = items[0] || 'members';
});
// 浏览器前进/后退兜底
watch(() => route.query.tab, (t) => {
  if (t && t !== activeTab.value && visibleTabs.value.includes(t)) activeTab.value = t;
});

// ── 选导生（overview / 提前截止 / 志愿导出 / 指派）──
const msOverview = ref(null);
const msPage = reactive({ page: 1, pageSize: 20, total: 0, keyword: '', loading: false });
const MS_PHASE_LABELS = {
  disabled: '未启用', upcoming: '即将开始', collecting: '志愿收集中', done: '志愿已截止',
};
const msPhaseLabel = computed(() => MS_PHASE_LABELS[msOverview.value?.phase] || '—');
const msPhaseAlertType = computed(() => ({
  collecting: 'info', upcoming: 'info', done: 'success',
}[msOverview.value?.phase] || 'info'));

async function fetchMsOverview() {
  msPage.loading = true;
  try {
    const res = await api.get(`/camp/ms/${campId}/overview`, { params: {
      student_page: msPage.page,
      student_page_size: msPage.pageSize,
      student_keyword: msPage.keyword.trim() || undefined,
    } });
    msOverview.value = res.data;
    msPage.total = res.data.student_total ?? res.data.students?.length ?? 0;
    const lastPage = Math.max(1, Math.ceil(msPage.total / msPage.pageSize));
    if (msPage.page > lastPage) {
      msPage.page = lastPage;
      return fetchMsOverview();
    }
  } catch { /* 非管理角色或未启用，忽略 */ }
  finally { msPage.loading = false; }
}

function applyMsStudentFilter() {
  msPage.page = 1;
  fetchMsOverview();
}

function changeMsStudentPageSize() {
  msPage.page = 1;
  fetchMsOverview();
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

// ── 批量指派（线下协调结果回填，逐行独立结果；支持 JSON/CSV 导入预填）──
const batchDlg = reactive({ visible: false, loading: false, submitting: false, rows: [], raw: '', importNote: null });
const BATCH_STATUS = {
  assigned: { label: '已指派', tag: 'success' },
  skipped: { label: '跳过', tag: 'info' },
  conflict: { label: '冲突', tag: 'warning' },
  error: { label: '失败', tag: 'danger' },
};
const batchStatusMeta = (status) => BATCH_STATUS[status] || { label: status, tag: 'info' };
const batchFileRef = ref(null);

async function fetchAllMsStudents() {
  const students = [];
  let page = 1;
  while (true) {
    const res = await api.get(`/camp/ms/${campId}/overview`, {
      params: { student_page: page, student_page_size: 100 },
    });
    const batch = res.data?.students || [];
    students.push(...batch);
    const total = res.data?.student_total ?? students.length;
    if (!batch.length || students.length >= total) return students;
    page += 1;
  }
}

async function openBatchAssign() {
  batchDlg.visible = true;
  batchDlg.loading = true;
  let students;
  try {
    students = await fetchAllMsStudents();
  } catch (e) {
    batchDlg.rows = [];
    ElMessage.error(e.response?.data?.message || '加载待指派学员失败');
    batchDlg.loading = false;
    return;
  }
  batchDlg.rows = students
    .filter((s) => !s.matched)
    .map((s) => ({ ...s, _mentor: null, _result: null }));
  batchDlg.raw = '';
  batchDlg.importNote = null;
  batchDlg.loading = false;
}

// 导入文本 → [{student, mentor}]（字符串姓名或用户ID；JSON 数组/对象、CSV 均可）
function parseBatchText(text) {
  const pairs = [];
  const t = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!t) return pairs;
  if (t.startsWith('{') || t.startsWith('[')) {
    const data = JSON.parse(t);   // 格式错抛给调用方提示
    if (Array.isArray(data)) {
      for (const it of data) {
        if (Array.isArray(it) && it.length >= 2) {
          pairs.push({ student: String(it[0]).trim(), mentor: String(it[1]).trim() });
        } else if (it && typeof it === 'object') {
          const s = it.student ?? it.学员;
          const m = it.mentor ?? it.导师 ?? it.导生;
          if (s != null && m != null) pairs.push({ student: String(s).trim(), mentor: String(m).trim() });
        }
      }
    } else if (typeof data === 'object') {
      for (const [s, m] of Object.entries(data)) {
        pairs.push({ student: String(s).trim(), mentor: String(m).trim() });
      }
    }
  } else {
    for (const line of t.split(/\r?\n/)) {
      const cells = line.split(/[,，;；\t]/).map((c) => c.trim()).filter(Boolean);
      if (cells.length < 2) continue;
      if (!pairs.length && /^(学员|学生|student|姓名)$/i.test(cells[0]) && /^(导生|导师|mentor)$/i.test(cells[1])) continue;
      pairs.push({ student: cells[0], mentor: cells[1] });
    }
  }
  return pairs;
}

// 匹配并预填各行下拉；未匹配名单就地提示（不在营/已分配的学员、不存在的导生）
function applyBatchImport(text) {
  let pairs;
  try {
    pairs = parseBatchText(text);
  } catch {
    ElMessage.error('JSON 解析失败，请检查格式');
    return;
  }
  if (!pairs.length) { ElMessage.warning('没有解析到「学员,导生」数据对'); return; }
  const mentors = msOverview.value?.mentors || [];
  const mByName = new Map(mentors.map((m) => [m.username, m]));
  const mById = new Map(mentors.map((m) => [String(m.user_id), m]));
  const sByName = new Map(batchDlg.rows.map((r) => [r.username, r]));
  const sById = new Map(batchDlg.rows.map((r) => [String(r.user_id), r]));
  let filled = 0;
  const missStudent = [], missMentor = [];
  for (const { student, mentor } of pairs) {
    const row = sByName.get(student) || sById.get(student);
    const m = mByName.get(mentor) || mById.get(mentor);
    if (!row) { missStudent.push(student); continue; }
    if (!m) { missMentor.push(mentor); continue; }
    if (!row._result) { row._mentor = m.user_id; filled += 1; }
  }
  const notes = [];
  if (missStudent.length) notes.push(`未匹配学员：${missStudent.join('、')}（不在本营或已分配）`);
  if (missMentor.length) notes.push(`未匹配导生：${missMentor.join('、')}`);
  batchDlg.importNote = notes.join('；') || null;
  ElMessage.success(`已填充 ${filled} 行`);
}

function importBatchText() { applyBatchImport(batchDlg.raw); }

function onBatchFile(ev) {
  const f = ev.target.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    batchDlg.raw = String(reader.result || '');
    applyBatchImport(batchDlg.raw);
  };
  reader.readAsText(f);
  ev.target.value = '';   // 允许重复选择同一文件
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
onMounted(() => {
  fetchAll();
  fetchOptions();
  if (canManage.value) {
    fetchJoinRequests();
    if (activeTab.value === 'ms') fetchMsOverview();
  }
});

// ── 项目营（v1.3 阶段3）：申报审核 / 组队总览 / 批量回填 / 变更管理员通道 ──
const pApps = ref([]);
const pAppsLoading = ref(false);
const pOverview = reactive({ projects: [], events: [] });
const pOverviewLoading = ref(false);
const pExporting = ref(false);
const pBatchDlg = reactive({ visible: false, rows: [], loading: false, submitting: false });

const pActiveProjects = computed(() => (pOverview.projects || []).filter((p) => p.status === 'active'));
const pUnitName = (unitId) => pOverview.projects?.find((p) => p.unit_id === unitId)?.name || `#${unitId}`;
const pActionLabel = (a) => ({
  select: '加入', deselect: '移出', exit: '退出', remove: '移除',
  adjust: '调剂', leader_change: '换负责人', unit_status: '状态变更',
}[a] || a);
const pBatchStatusMeta = (s) => ({
  assigned: { tag: 'success', label: '已加入' }, skipped: { tag: 'info', label: '跳过' },
  conflict: { tag: 'warning', label: '达上限' }, error: { tag: 'danger', label: '失败' },
}[s] || { tag: 'info', label: s });

async function fetchProjectApps() {
  pAppsLoading.value = true;
  try {
    const res = await api.get(`/camp/projects/${campId}/applications`);
    pApps.value = res.data.applications || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载申报列表失败');
  } finally { pAppsLoading.value = false; }
}

async function fetchProjectOverview() {
  pOverviewLoading.value = true;
  try {
    const res = await api.get(`/camp/projects/${campId}/overview`);
    pOverview.projects = res.data.projects || [];
    pOverview.events = res.data.events || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载组队总览失败');
  } finally { pOverviewLoading.value = false; }
}

async function reviewProjectApp(row, action) {
  try {
    let body = { action };
    if (action === 'reject') {
      const { value } = await ElMessageBox.prompt('退回原因（负责人重提时可见）', '退回申报', {
        confirmButtonText: '退回', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '原因必填',
      });
      body.reason = value.trim();
    } else {
      await ElMessageBox.confirm(
        `通过「${row.name}」？将创建项目、${row.leader_name} 自动入营成为负责人`, '审核通过', {
          confirmButtonText: '通过', cancelButtonText: '取消', type: 'info',
        });
    }
    const res = await api.post(`/camp/projects/${campId}/applications/${row.id}/review`, body);
    ElMessage.success(res.data.message || '已处理');
    fetchProjectApps();
    if (activeTab.value === 'pform') fetchProjectOverview();
    fetchAll();   // 过审自动入营会改变成员表
  } catch (e) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

async function exportProjectCsv() {
  pExporting.value = true;
  try {
    const res = await api.get(`/camp/projects/${campId}/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camp_${campId}_project_preferences.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    ElMessage.error('导出失败，请稍后重试');
  } finally { pExporting.value = false; }
}

async function fetchAllMemberRows(roles) {
  const rows = [];
  let page = 1;
  while (true) {
    const res = await api.get(`/camp/sessions/${campId}/members`, {
      params: { page, page_size: 100, role: roles },
    });
    const batch = res.data?.members || [];
    rows.push(...batch);
    const total = res.data?.total ?? rows.length;
    if (!batch.length || rows.length >= total) return rows;
    page += 1;
  }
}

async function openProjectBatch() {
  // 行=营期池内成员（member/student），显示已参与项目数；成员表来自成员 tab 的 members
  const countOf = (uid) => (pOverview.projects || []).filter(
    (p) => p.members?.some((m) => m.user_id === uid && m.status === 'active')).length;
  pBatchDlg.visible = true;
  pBatchDlg.loading = true;
  try {
    const rows = await fetchAllMemberRows('member,student');
    pBatchDlg.rows = rows.map((m) => ({
      user_id: m.user_id, username: m.username,
      _unit: null, _result: null, _count: countOf(m.user_id),
    }));
  } catch (e) {
    pBatchDlg.rows = [];
    ElMessage.error(e.response?.data?.message || '加载可回填成员失败');
  } finally {
    pBatchDlg.loading = false;
  }
}

async function submitProjectBatch() {
  const rows = pBatchDlg.rows.filter((r) => r._unit && !r._result);
  if (!rows.length) { ElMessage.warning('请先为至少一行选择项目'); return; }
  pBatchDlg.submitting = true;
  try {
    const res = await api.post(`/camp/projects/${campId}/assign/batch`, {
      items: rows.map((r) => ({ unit_id: r._unit, user_id: r.user_id })),
    });
    const results = res.data.results || [];
    const byKey = new Map(results.map((r) => [`${r.unit_id}:${r.user_id}`, r]));
    for (const r of rows) r._result = byKey.get(`${r._unit}:${r.user_id}`) || null;
    const ok = results.filter((r) => r.status === 'assigned').length;
    if (ok) ElMessage.success(`已加入 ${ok} 人`);
    const bad = results.filter((r) => r.status !== 'assigned');
    if (bad.length) ElMessage.warning(`${bad.length} 项未成功，结果已就地标注`);
    fetchProjectOverview();
    fetchAll();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '批量回填失败');
  } finally { pBatchDlg.submitting = false; }
}

// 变更管理员通道（H-005：开营前后通用，原因必填+事件留痕）
async function endProjectMember(unit, m) {
  try {
    const { value } = await ElMessageBox.prompt(
      `移除「${m.username}」出「${unit.name}」？（历史贡献保留、参与名额即时释放）\n填写原因：`,
      '移除项目成员', {
        confirmButtonText: '移除', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '原因必填',
      });
    await api.post(`/camp/units/${unit.unit_id}/members/${m.user_id}/end`,
      { reason: value.trim(), kind: 'remove' });
    ElMessage.success('已移除');
    fetchProjectOverview();
  } catch (e) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '移除失败');
  }
}

async function changeProjectLeader(unit) {
  try {
    const { value } = await ElMessageBox.prompt(
      `变更「${unit.name}」负责人（当前：${unit.leader_name}）。\n输入新负责人的用户 ID（可从成员列表查）：`,
      '变更负责人', {
        confirmButtonText: '变更', cancelButtonText: '取消',
        inputPattern: /^\d+$/, inputErrorMessage: '请输入用户 ID（数字）',
      });
    const uid = Number(value);
    const target = members.value.find((m) => m.user_id === uid);
    const { value: reason } = await ElMessageBox.prompt('变更原因：', '变更负责人', {
      confirmButtonText: '确定', cancelButtonText: '取消',
      inputValidator: (v) => !!(v && v.trim()) || '原因必填',
    });
    await api.post(`/camp/units/${unit.unit_id}/leader`,
      { new_leader_id: uid, reason: reason.trim() });
    ElMessage.success(`负责人已变更${target ? `（${target.username}）` : ''}`);
    fetchProjectOverview();
    fetchAll();
  } catch (e) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '变更失败');
  }
}

const P_STATUS_TEXT = { paused: '暂停', terminated: '终止', active: '恢复' };
async function setProjectStatus(unit, status) {
  try {
    const { value } = await ElMessageBox.prompt(
      status === 'terminated'
        ? `终止「${unit.name}」？全员退出（历史保留）、不可恢复。填写原因：`
        : `${P_STATUS_TEXT[status]}「${unit.name}」。填写原因：`,
      `${P_STATUS_TEXT[status]}项目`, {
        confirmButtonText: '确定', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '原因必填',
      });
    await api.post(`/camp/units/${unit.unit_id}/status`, { status, reason: value.trim() });
    ElMessage.success('已处理');
    fetchProjectOverview();
  } catch (e) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

// ── 项目营交付审核（v1.3 阶段4）：待审队列 + 成果核验 + 结营档案 ──
const pd = reactive({ pending: [], outcomes: [], archive: null });

async function fetchDeliveryAdmin() {
  try {
    const res = await api.get(`/camp/sessions/${campId}/delivery-admin`);
    pd.pending = res.data.pending_reviews || [];
    pd.outcomes = res.data.outcomes || [];
    if (session.value.status === 'archived') {
      pd.archive = (await api.get(`/camp/sessions/${campId}/archive`).catch(() => ({ data: {} }))).data.archive || null;
    } else {
      pd.archive = null;
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载交付审核数据失败');
  }
}

async function reviewDelivery(row, action) {
  try {
    let body = { action };
    if (action === 'return') {
      const { value } = await ElMessageBox.prompt('退回说明（提交人重提时可见）：', '退回材料', {
        confirmButtonText: '退回', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '说明必填',
      });
      body.note = value.trim();
    }
    await api.post(`/camp/submissions/${row.submission_id}/review`, body);
    ElMessage.success(action === 'approve' ? '已验收' : '已退回');
    fetchDeliveryAdmin();
  } catch (e) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

async function verifyOutcome(row, action) {
  try {
    let body = { action };
    if (action === 'reject') {
      const { value } = await ElMessageBox.prompt('驳回原因：', '驳回成果', {
        confirmButtonText: '驳回', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '原因必填',
      });
      body.reason = value.trim();
    }
    await api.post(`/camp/outcomes/${row.id}/verify`, body);
    ElMessage.success(action === 'verify' ? '已核验' : '已驳回');
    fetchDeliveryAdmin();
  } catch (e) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

async function reviseArchive() {
  if (!pd.archive) return;
  try {
    const { value } = await ElMessageBox.prompt(
      `登记档案修正（当前 v${pd.archive.version}，修正后版本递增；快照原文不可变，修正以记录留痕）：`, '档案修正', {
        confirmButtonText: '登记', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '修正原因必填',
      });
    const res = await api.post(`/camp/sessions/${campId}/archive/revisions`, {
      reason: value.trim(), expected_version: pd.archive.version,
    });
    ElMessage.success(res.data.message || '已登记');
    fetchDeliveryAdmin();
  } catch (e) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '登记失败');
  }
}
</script>

<style scoped>
.camp-session-detail { padding: 16px; }
.header { margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
.header .title { font-size: 18px; font-weight: 600; }
.member-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.member-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.member-filters :deep(.el-button + .el-button) { margin-left: 0; }
.ms-student-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.hint { margin-left: 12px; color: #909399; font-size: 12px; }
.ms-sec-title { margin: 16px 0 8px; font-size: 14px; font-weight: 600; }
.batch-msg { margin-left: 6px; font-size: 12px; color: #909399; }
/* 批量指派导入条 */
.batch-import-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 8px 0 12px; }
.batch-import-bar :deep(.el-button + .el-button) { margin-left: 0; }
.batch-import-note { font-size: 12px; color: #e6a23c; line-height: 1.5; }
/* 项目申报/组队 expand 行内容 */
.papp-expand { padding: 4px 12px; }
.papp-expand p { margin: 4px 0; font-size: 12.5px; line-height: 1.7; color: #606266; }
.papp-node {
  display: inline-block; margin: 2px 6px 2px 0; padding: 1px 8px; border-radius: 4px;
  font-size: 12px; background: var(--el-fill-color-light, #f5f7fa);
}
/* 交付审核：档案快照 */
.archive-snap {
  max-height: 320px; overflow: auto; margin: 0; padding: 10px;
  font-size: 12px; line-height: 1.6; border-radius: 6px;
  background: var(--fill-color-light, #f5f7fa); color: var(--text-regular, #606266);
}
/* 候选池工具栏：间距统一交给 flex gap（覆盖 el-button 相邻默认 margin） */
.elig-search { width: 100%; max-width: 420px; display: block; margin-bottom: 8px; }
.elig-opt { display: flex; align-items: center; gap: 8px; min-width: 0; }
.elig-opt-name { font-weight: 600; flex: none; }
.elig-opt-mail { color: var(--el-text-color-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.elig-opt-meta { margin-left: auto; color: var(--el-text-color-secondary); font-size: 12px; flex: none; }
.elig-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 10px 0 4px; }
.elig-toolbar :deep(.el-button + .el-button) { margin-left: 0; }
.elig-toolbar :deep(.el-divider--vertical) { margin: 0; }
.elig-toolbar .hint { margin-left: 4px; }
.elig-level-select { width: 88px; }

/* 负责人 tab（阶段 1，CampStaff） */
.staff-alert { margin-bottom: 10px; }
.staff-hint { color: var(--el-text-color-secondary); font-size: 12px; }
.staff-sec-title { margin: 16px 0 8px; font-size: 14px; font-weight: 600; }

</style>
