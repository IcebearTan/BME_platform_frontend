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

      <!-- ③ 出勤（09-12 三模式：模式设置 + daily 模式的承诺出勤日管理；
           项目营 09-13 独立口径：活动考勤恒开，仅控周打卡统计条。
           tab 存在性看保存态 attModeSaved——编辑态切换不再使 tab 消失（off 营可切回）） -->
      <el-tab-pane v-if="capOn('attendance') || attModeSaved === 'off'" label="出勤" name="plan">
        <!-- 项目营：考勤=活动考勤（负责人在项目看板发起活动+勾选出席），无培训营三模式 -->
        <template v-if="isProjectCamp">
          <div class="att-cfg-card">
            <h4 class="ms-sec-title" style="margin:0 0 10px;">项目营考勤</h4>
            <el-alert type="info" :closable="false" style="margin-bottom: 12px;"
              title="项目考勤以活动为单位：各项目负责人在项目看板发起活动并勾选成员出席，无需在此设置" />
            <el-form label-width="90px" size="small" style="max-width: 520px;">
              <el-form-item label="周打卡">
                <el-switch v-model="projectAtt.on" :disabled="!manageWritable" />
                <span class="hint" style="margin-left: 6px;">开=成员工作台顶部显示累计出勤统计条（个人打卡口径，与活动考勤独立）</span>
              </el-form-item>
            </el-form>
            <div style="margin-top: 10px;">
              <el-button v-if="manageWritable" type="primary" size="small" :loading="projectAtt.saving" @click="saveProjectAtt">保存</el-button>
            </div>
          </div>
        </template>

        <!-- 培训营（learning）：三模式设置卡 + A 模式考勤参数 -->
        <template v-else>
        <div class="att-cfg-card">
          <h4 class="ms-sec-title" style="margin:0 0 10px;">考勤模式</h4>
          <el-radio-group v-model="attCfg.mode" :disabled="!manageWritable" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <el-radio value="daily">假期营 · 每日承诺出勤——报名选到岗日，按日打卡评估出勤/迟到/时长</el-radio>
            <el-radio value="weekly">学期 · 校区培训 · 按周累计——不收承诺日，考察每周打卡次数与时长</el-radio>
            <el-radio value="off">学期 · 远程培训 · 不考勤</el-radio>
          </el-radio-group>

          <!-- A 模式考勤参数（09-12 从建营弹窗迁入：仅每日模式需要） -->
          <el-form v-if="attCfg.mode === 'daily' && manageWritable" label-width="90px" size="small" style="margin-top: 12px; max-width: 480px;">
            <el-form-item label="期望到岗">
              <el-time-picker v-model="attCfg.expectedCheckIn" value-format="HH:mm" format="HH:mm"
                placeholder="如 09:00（判迟到基准，不填不判）" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="最低时长">
              <el-input-number v-model="attCfg.minDailyHours" :min="0" :step="0.5" /> 小时/日
              <span class="hint" style="margin-left: 6px;">不填不判达标</span>
            </el-form-item>
            <el-form-item label="仅工作日">
              <el-switch v-model="attCfg.weekdaysOnly" />
              <span class="hint" style="margin-left: 6px;">承诺出勤日 = 营期范围内工作日</span>
            </el-form-item>
          </el-form>

          <div style="margin-top: 10px;">
            <el-button v-if="manageWritable" type="primary" size="small" :loading="attCfg.saving" @click="saveAttMode">保存</el-button>
            <span class="hint" style="margin-left:8px;">切换出「每日」会清空本营承诺出勤日；切回需手动重生成</span>
          </div>
        </div>

        <template v-if="attModeSaved === 'daily'">
          <el-alert type="info" :closable="false"
            :title="`本营 ${studentMembers.length} 名学员；承诺出勤日按营期范围内工作日（${session.weekdays_only ? '仅周一~周五' : '含周末'}）展开`" />
          <div style="margin-top: 12px;">
            <el-button v-if="manageWritable" type="primary" @click="regenPlan">重生成承诺出勤日</el-button>
            <span class="hint">加入新学员时自动生成；此处可手动重生成（幂等，自动清理范围外/范围内周末的旧承诺日）</span>
          </div>
        </template>
        <el-alert v-else type="info" :closable="false" style="margin-top: 12px;"
          :title="attModeSaved === 'weekly'
            ? '按周累计模式：学员报名不收承诺日，出勤看板按周统计打卡次数与时长'
            : '本营不考勤：报名/工作台均不出考勤入口，保存后考勤能力关闭'" />
        </template>
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
        <!-- ── ① 导生招募：待审导生报名（自由报名走审核）+ 导入即导生（超管） ── -->
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
        <el-alert v-else type="info" :closable="false" title="暂无待审的导生报名（LV≥2 学员可在报名窗口内自助报名）" style="margin-bottom: 10px;" />

        <template v-if="isSuperAdmin">
          <h4 class="ms-sec-title">导入导生（直接入营，不经报名审核）</h4>
          <el-input v-model="eligibility.raw" type="textarea" :rows="3"
            placeholder="粘贴导生邮箱，换行或逗号分隔均可，自动去重" />
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


        <!-- 方向制配置卡：draft/upcoming 可编辑（选导生开跑后锁定只读） -->
        <div class="ms-cfg-card">
          <div class="ms-cfg-head">
            <h4 class="ms-sec-title" style="margin:0;">选导生与方向配置</h4>
            <span v-if="!msCfgEditable" class="hint">选导生已开跑（{{ statusLabel(session.status) }}），配置锁定只读</span>
          </div>

          <template v-if="msCfgEditable">
            <el-form label-width="90px" size="small" style="margin-top:10px;">
              <el-form-item label="启用选导生">
                <el-switch v-model="msCfg.enabled" />
                <span class="hint" style="margin-left:8px;">导生发名片选方向，学员交 1-3 志愿，双方互选后开营</span>
              </el-form-item>
              <template v-if="msCfg.enabled">
                <el-form-item label="志愿起止" required>
                  <el-date-picker v-model="msCfg.start" type="datetime" value-format="YYYY-MM-DD HH:mm"
                    format="MM-DD HH:mm" placeholder="开始" style="width:46%" />
                  <span style="margin:0 4px;">至</span>
                  <el-date-picker v-model="msCfg.deadline" type="datetime" value-format="YYYY-MM-DD HH:mm"
                    format="MM-DD HH:mm" placeholder="截止（后进线下协调）" style="width:46%" />
                  <div class="hint" style="line-height:1.6;">
                    开放报名后学员即可浏览市集、收藏导生（只读浏览期）；到「开始」时间才能提交/修改志愿，到「截止」时间锁定待协调指派。浏览期长度 = 开放报名时刻至志愿开始时间
                  </div>
                </el-form-item>
                <el-form-item label="分类方向" required>
                  <div class="ms-cfg-dirs">
                    <div v-for="(d, i) in msCfg.directions" :key="i" class="ms-cfg-dir-row">
                      <el-input v-model="d.name" placeholder="方向名（如 硬件组）" style="flex:1" />
                      <el-select v-model="d.course_ids" multiple filterable collapse-tags collapse-tags-tooltip
                        placeholder="关联课程（至少一门）" style="flex:1.6">
                        <el-option v-for="c in allCourses" :key="c.Course_Id" :label="c.Course_title" :value="Number(c.Course_Id)" />
                      </el-select>
                      <el-button size="small" type="danger" link :disabled="msCfg.directions.length <= 1"
                        @click="msCfg.directions.splice(i, 1)">删除</el-button>
                    </div>
                    <el-button size="small" @click="msCfg.directions.push({ name: '', course_ids: [] })">+ 添加方向</el-button>
                    <div class="hint">每个方向至少绑定一门课程（可多门）；导生只选一个方向，学员随归属导生继承方向全部课程，导生逐课按章认证进度（0-100 评分）</div>
                  </div>
                </el-form-item>
              </template>
            </el-form>
            <div style="margin-top:6px;">
              <el-button type="primary" size="small" :loading="msCfg.saving" @click="saveMsConfig">保存配置</el-button>
            </div>
          </template>

          <!-- 只读态：方向 + 课程一览（含未启用时也不显示方向） -->
          <template v-else-if="session.mentor_selection_enabled">
            <div class="ms-cfg-readonly">
              <div v-for="d in sessionDirections" :key="d.name" class="ms-cfg-dir-view">
                <span class="dir-name">{{ d.name }}</span>
                <span class="dir-course">{{ (d.course_ids || []).map(courseTitle).filter(Boolean).join(' / ') || '未绑定课程' }}</span>
              </div>
              <div v-if="!sessionDirections.length" class="hint">尚未配置方向</div>
              <div class="hint" style="margin-top:6px;">
                志愿窗口：{{ session.ms_preference_start || '—' }} ~ {{ session.ms_preference_deadline || '—' }}（开始前学员仅可浏览收藏）
              </div>
            </div>
          </template>
          <div v-else class="hint" style="margin-top:8px;">未启用选导生（草稿/待开放阶段可开启并配置方向）</div>
        </div>

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
        </template>
      </el-tab-pane>

      <!-- ⑨ 学习进度（09-16：培训营各组营员学习进度看板——按导生组分桶的认证子矩阵；
           lazy=首次激活才挂载拉数（逐学员逐课聚合查询较重）；archived 营可读作结营复盘） -->
      <el-tab-pane v-if="session.category === 'learning'" label="学习进度" name="progress" lazy>
        <CampProgressBoard :sid="Number(campId)" />
      </el-tab-pane>

      <!-- 项目营：申报审核（v1.3 阶段3；申报窗口仅 upcoming） -->
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

    <!-- 批量指派导生（线下协调结果回填：导入 JSON/CSV 批量预填，或逐行手选） -->
    <el-dialog v-model="batchDlg.visible" title="批量指派导生" width="680px">
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
import CampProgressBoard from './CampProgressBoard.vue';

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
// 09-12 重组：学员申请 tab 纯学员（导生报名挪「选导生」tab 招募区）
const studentJoinRequests = computed(() => joinRequests.value.filter((r) => r.apply_role !== 'mentor'));
const mentorJoinRequests = computed(() => joinRequests.value.filter((r) => r.apply_role === 'mentor'));

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

// ── 考勤三模式（09-12）：本地编辑态 attCfg；保存后回读 session 驱动渲染。
// A 模式考勤参数（期望到岗/最低时长/仅工作日）随模式一并保存（09-12 从建营弹窗迁入）──
const attCfg = reactive({
  mode: 'daily', saving: false,
  expectedCheckIn: null, minDailyHours: null, weekdaysOnly: true,
});
const attModeSaved = computed(() => {
  const caps = session.value.policy?.capabilities;
  if (caps && caps.attendance === false) return 'off';
  return session.value.policy?.attendance_mode || 'daily';
});
// 项目营考勤（09-13 独立口径）：活动考勤恒开（负责人看板勾选出席），此处仅开关
// 成员个人周打卡统计条——落 policy 时恒 mode='weekly'，项目营不进培训营 daily 承诺日语义
const projectAtt = reactive({ on: false, saving: false });
watch(attModeSaved, (m) => { projectAtt.on = m !== 'off'; }, { immediate: true });
async function saveProjectAtt() {
  projectAtt.saving = true;
  try {
    await api.put(`/camp/sessions/${campId}`, {
      policy: { attendance_mode: 'weekly', attendance_enabled: projectAtt.on },
    });
    ElMessage.success('考勤设置已保存');
    await fetchAll();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    projectAtt.saving = false;
  }
}
watch(attModeSaved, (m) => { attCfg.mode = m; }, { immediate: true });
watch(session, (s) => {
  if (!s?.id) return;
  attCfg.expectedCheckIn = s.expected_check_in ? String(s.expected_check_in).slice(0, 5) : null;
  attCfg.minDailyHours = s.min_daily_hours ?? null;
  attCfg.weekdaysOnly = !!s.weekdays_only;
}, { immediate: true });
async function saveAttMode() {
  attCfg.saving = true;
  try {
    const mode = attCfg.mode;
    await api.put(`/camp/sessions/${campId}`, {
      policy: {
        attendance_mode: mode === 'off' ? 'daily' : mode,   // off 由能力位承载，mode 落 daily
        attendance_enabled: mode !== 'off',
      },
      ...(mode === 'daily' ? {
        expected_check_in: attCfg.expectedCheckIn || null,
        min_daily_hours: attCfg.minDailyHours,
        weekdays_only: attCfg.weekdaysOnly,
      } : {}),
    });
    ElMessage.success('考勤设置已保存');
    await fetchAll();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    attCfg.saving = false;
  }
}

// ── 选导生与方向配置（09-12 定稿：配置从建营弹窗迁到详情；draft/upcoming 可编辑，开跑后锁定）──
const msCfg = reactive({
  enabled: false, start: null, deadline: null,
  directions: [{ name: '', course_ids: [] }],
  saving: false, loaded: false,
});
const msCfgEditable = computed(() => manageWritable.value
  && ['draft', 'upcoming'].includes(session.value.status));
const sessionDirections = computed(() => session.value.ms_directions || []);
const courseTitle = (cid) => {
  const c = allCourses.value.find((x) => Number(x.Course_Id) === Number(cid));
  return c?.Course_title || '';
};
// session 加载后回填配置卡（一次；切营由路由重建组件）
watch(session, (s) => {
  if (!msCfg.loaded && s?.id) {
    msCfg.loaded = true;
    msCfg.enabled = !!s.mentor_selection_enabled;
    msCfg.start = s.ms_preference_start || null;
    msCfg.deadline = s.ms_preference_deadline || null;
    const dirs = (s.ms_directions && s.ms_directions.length)
      ? s.ms_directions : [];
    // 09-13 多课制：course_ids 数组；旧单课回显标量兜底为单元素数组
    msCfg.directions = dirs.length
      ? dirs.map((d) => ({ name: d.name || '',
        course_ids: Array.isArray(d.course_ids) ? [...d.course_ids]
          : (d.course_id != null ? [Number(d.course_id)] : []) }))
      : [{ name: '', course_ids: [] }];
  }
});
async function saveMsConfig() {
  if (msCfg.enabled && (!msCfg.start || !msCfg.deadline)) {
    ElMessage.warning('启用选导生需设置志愿开始 / 截止时间');
    return;
  }
  const tags = msCfg.enabled
    ? msCfg.directions.map((d) => ({ name: (d.name || '').trim(), course_ids: d.course_ids || [] }))
    : null;
  if (tags) {
    if (!tags.length || tags.some((d) => !d.name || !d.course_ids.length)) {
      ElMessage.warning('请完整填写每个分类方向（方向名 + 至少一门关联课程）');
      return;
    }
    if (new Set(tags.map((d) => d.name)).size !== tags.length) {
      ElMessage.warning('分类方向名称不能重复');
      return;
    }
  }
  msCfg.saving = true;
  try {
    const body = {
      mentor_selection_enabled: msCfg.enabled,
      ms_preference_start: msCfg.enabled ? msCfg.start : null,
      ms_preference_deadline: msCfg.enabled ? msCfg.deadline : null,
      ...(tags ? { ms_tags: tags } : {}),
    };
    await api.put(`/camp/sessions/${campId}`, body);
    ElMessage.success('配置已保存');
    await fetchAll();
    msCfg.loaded = false;   // 让 watch 重新回填最新 session
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    msCfg.saving = false;
  }
}

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

// ── 批量指派（线下协调结果回填，逐行独立结果；支持 JSON/CSV 导入预填）──
const batchDlg = reactive({ visible: false, submitting: false, rows: [], raw: '', importNote: null });
const BATCH_STATUS = {
  assigned: { label: '已指派', tag: 'success' },
  skipped: { label: '跳过', tag: 'info' },
  conflict: { label: '冲突', tag: 'warning' },
  error: { label: '失败', tag: 'danger' },
};
const batchStatusMeta = (status) => BATCH_STATUS[status] || { label: status, tag: 'info' };
const batchFileRef = ref(null);

function openBatchAssign() {
  batchDlg.rows = (msOverview.value?.students || [])
    .filter((s) => !s.matched)
    .map((s) => ({ ...s, _mentor: null, _result: null }));
  batchDlg.raw = '';
  batchDlg.importNote = null;
  batchDlg.visible = true;
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
.elig-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 10px 0 4px; }
.elig-toolbar :deep(.el-button + .el-button) { margin-left: 0; }
.elig-toolbar :deep(.el-divider--vertical) { margin: 0; }
.elig-toolbar .hint { margin-left: 4px; }
.elig-level-select { width: 88px; }

/* 选导生与方向配置卡（09-12：配置从建营弹窗迁入详情） */
.ms-cfg-card { border: 1px solid var(--el-border-color-light, #e4e7ed); border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; }
.ms-cfg-head { display: flex; align-items: center; justify-content: space-between; }
.ms-cfg-dirs { width: 100%; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.ms-cfg-dir-row { display: flex; gap: 8px; align-items: center; width: 100%; }
.ms-cfg-readonly { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.ms-cfg-dir-view { display: flex; gap: 10px; font-size: 13px; }
.ms-cfg-dir-view .dir-name { font-weight: 600; min-width: 90px; }
.ms-cfg-dir-view .dir-course { color: #909399; }

/* 考勤模式设置卡（09-12 三模式） */
.att-cfg-card { border: 1px solid var(--el-border-color-light, #e4e7ed); border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; }
.att-cfg-card :deep(.el-radio) { height: auto; align-items: flex-start; margin-right: 0; }

</style>
