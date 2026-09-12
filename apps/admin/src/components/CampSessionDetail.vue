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
      <el-tab-pane v-if="capOn('attendance')" label="出勤计划" name="plan">
        <el-alert type="info" :closable="false"
          :title="`本营 ${studentMembers.length} 名学员；承诺出勤日按营期范围内工作日（${session.weekdays_only ? '仅周一~周五' : '含周末'}）展开`" />
        <div style="margin-top: 12px;">
          <el-button v-if="manageWritable" type="primary" @click="regenPlan">重生成承诺出勤日</el-button>
          <span class="hint">加入新学员时自动生成；此处可手动重生成（幂等，自动清理范围外/范围内周末的旧承诺日）</span>
        </div>
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

      <!-- 项目营：申报审核（v1.3 阶段3；申报窗口仅 upcoming） -->
      <el-tab-pane v-if="isProjectCamp && canManage" label="项目申报" name="papp">
        <el-alert :type="session.status === 'upcoming' ? 'success' : 'info'" :closable="false"
          :title="session.status === 'upcoming'
            ? '申报期开放中：负责人提交申报，审核通过即建项目、负责人自动入池'
            : '申报期已结束（项目申报仅在「待开放」阶段进行），此处可查看历史申报'" />
        <el-table :data="pApps" border size="small" style="margin-top: 12px;" v-loading="pAppsLoading">
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="papp-expand">
                <p><b>背景：</b>{{ row.background || '—' }}</p>
                <p><b>目标：</b>{{ row.goal || '—' }}</p>
                <p><b>所需能力：</b>{{ row.required_abilities || '—' }}</p>
                <p><b>招募说明：</b>{{ row.recruit_note || '—' }}</p>
                <p><b>计划：</b>{{ row.plan || '—' }}</p>
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
    </el-tabs>

    <!-- 加成员（多选批量；v1.3 阶段3：口径对齐后端=仅拒超管，营内角色显式指定，
         提交走事务批量端点逐项回报） -->
    <el-dialog v-model="memberDlg.visible" title="加成员" width="520px">
      <el-form :model="memberDlg.form" label-width="80px">
        <el-form-item label="用户" required>
          <el-select v-model="memberDlg.form.user_ids" multiple collapse-tags collapse-tags-tooltip filterable
            placeholder="搜索选择用户（可多选）" style="width: 100%;">
            <el-option v-for="u in selectableUsers" :key="u.User_Id" :label="`${u.User_Name}（${roleLabel(u.role)}）`" :value="u.User_Id"
              :disabled="u.role === 'super_admin'" />
          </el-select>
          <el-checkbox v-model="showAllUsers" style="margin-top: 6px; font-size: 12px;">显示教师/超管（不可加入）</el-checkbox>
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

    <!-- 批量回填项目成员（线下协调结果；逐项回报） -->
    <el-dialog v-model="pBatchDlg.visible" title="批量回填项目成员" width="720px">
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
// 加成员：口径对齐后端（camp.py _assign_member）——仅拒 super_admin，营内角色显式指定，
// 不再从全局 user.role 派生（身份解耦残留 gate 修复，总账 §六.2 首单）
const showAllUsers = ref(false);
const roleLabel = (r) => ({ student: '学员', mentor: '导生', user: '用户', teacher: '教师', super_admin: '超管' }[r] || r || '—');
const isProjectCamp = computed(() => session.value.category === 'project');
// 能力开关（v1.3）：tab 渲染跟随营期 policy（learning 默认全开；旧 mock 无 policy 时回退开）
const capOn = (k) => session.value?.policy?.capabilities?.[k] ?? true;
const selectableUsers = computed(() => {
  const memberIds = new Set(members.value.map((member) => member.user_id));
  const candidates = showAllUsers.value
    ? users.value
    : users.value.filter((user) => user.role !== 'super_admin');
  return candidates.filter((user) => !memberIds.has(user.User_Id));
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
    // 逐项容错：项目营的座位/请假被 capability 门禁 400（正常态），不能拖挂整页数据
    const [s, m, c, st, lv] = await Promise.all([
      api.get(`/camp/sessions/${campId}`).catch(() => null),
      api.get(`/camp/sessions/${campId}/members`).catch(() => null),
      api.get(`/camp/sessions/${campId}/courses`).catch(() => null),
      api.get(`/camp/sessions/${campId}/seats`).catch(() => null),
      api.get(`/camp/sessions/${campId}/leave`).catch(() => null),
    ]);
    session.value = s?.data?.session || {};
    members.value = m?.data?.members || [];
    courses.value = c?.data?.courses || [];
    seats.value = st?.data?.seats || [];
    leaves.value = lv?.data?.leaves || [];
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
  memberDlg.form = { user_ids: [], role: isProjectCamp.value ? 'member' : 'student', team_mentor_id: null };
  memberDlg.visible = true;
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
    const nameOf = (uid) => users.value.find((u) => u.User_Id === uid)?.User_Name || `#${uid}`;
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
watch(activeTab, (t) => {
  if (!isProjectCamp.value || !canManage.value) return;
  if (t === 'papp') fetchProjectApps();
  if (t === 'pform') fetchProjectOverview();
  if (t === 'pdeli') fetchDeliveryAdmin();
});

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

// ── 项目营（v1.3 阶段3）：申报审核 / 组队总览 / 批量回填 / 变更管理员通道 ──
const pApps = ref([]);
const pAppsLoading = ref(false);
const pOverview = reactive({ projects: [], events: [] });
const pOverviewLoading = ref(false);
const pExporting = ref(false);
const pBatchDlg = reactive({ visible: false, rows: [], submitting: false });

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
        `通过「${row.name}」？将创建项目、${row.leader_name} 自动入池成为负责人`, '审核通过', {
          confirmButtonText: '通过', cancelButtonText: '取消', type: 'info',
        });
    }
    const res = await api.post(`/camp/projects/${campId}/applications/${row.id}/review`, body);
    ElMessage.success(res.data.message || '已处理');
    fetchProjectApps();
    if (activeTab.value === 'pform') fetchProjectOverview();
    fetchAll();   // 过审自动入池会改变成员表
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

function openProjectBatch() {
  // 行=营期池内成员（member/student），显示已参与项目数；成员表来自成员 tab 的 members
  const countOf = (uid) => (pOverview.projects || []).filter(
    (p) => p.members?.some((m) => m.user_id === uid && m.status === 'active')).length;
  pBatchDlg.rows = members.value
    .filter((m) => m.role === 'member' || m.role === 'student')
    .map((m) => ({ user_id: m.user_id, username: m.username, _unit: null, _result: null, _count: countOf(m.user_id) }));
  pBatchDlg.visible = true;
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
.hint { margin-left: 12px; color: #909399; font-size: 12px; }
.ms-sec-title { margin: 16px 0 8px; font-size: 14px; font-weight: 600; }
.batch-msg { margin-left: 6px; font-size: 12px; color: #909399; }
/* 项目申报/组队 expand 行内容 */
.papp-expand { padding: 4px 12px; }
.papp-expand p { margin: 4px 0; font-size: 12.5px; line-height: 1.7; color: #606266; }
/* 交付审核：档案快照 */
.archive-snap {
  max-height: 320px; overflow: auto; margin: 0; padding: 10px;
  font-size: 12px; line-height: 1.6; border-radius: 6px;
  background: var(--fill-color-light, #f5f7fa); color: var(--text-regular, #606266);
}
/* 候选池工具栏：间距统一交给 flex gap（覆盖 el-button 相邻默认 margin） */
.elig-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 10px 0 4px; }
.elig-toolbar :deep(.el-button + .el-button) { margin-left: 0; }
.elig-toolbar :deep(.el-divider--vertical) { margin: 0; }
.elig-toolbar .hint { margin-left: 4px; }
.elig-level-select { width: 88px; }
</style>
