<template>
  <!-- 营期设置（09-17 集中管理）：准入门槛 / 考勤模式 / 选导生流程三区块收拢至此；
       各业务 tab 只留运营与数据。统一 .set-card 分区卡片语言，配置写模型整体内聚本组件——
       全部写操作走 PUT /camp/sessions/{campId}，保存成功 emit('saved') 由父组件 fetchAll 回读。 -->
  <div class="camp-settings">
    <!-- ── 区块一：准入门槛（learning=导生报名门槛 / project=负责人申报门槛，即时保存） ── -->
    <section class="set-card">
      <header class="set-card__head">
        <h4 class="set-card__title">准入门槛</h4>
        <span class="hint">开关即时保存，失败自动回滚；管理员导入 / 指派 / 换负责人通道不受限</span>
      </header>
      <div v-if="!isProjectCamp" class="gate-row">
        <span class="gate-label">报名等级门槛</span>
        <el-switch :model-value="gateOn('mentor_level_gate')" :loading="gateSaving.mentor_level_gate"
          :disabled="!manageWritable" @change="saveGate('mentor_level_gate')" />
        <span class="hint">{{ gateOn('mentor_level_gate')
          ? 'LV2 及以上才能自助报名导生（默认）' : '不设等级门槛，所有学员均可自助报名' }}</span>
      </div>
      <div v-else class="gate-row">
        <span class="gate-label">申报等级门槛</span>
        <el-switch :model-value="gateOn('leader_level_gate')" :loading="gateSaving.leader_level_gate"
          :disabled="!manageWritable" @change="saveGate('leader_level_gate')" />
        <span class="hint">{{ gateOn('leader_level_gate')
          ? 'LV2 及以上才能申报成为项目负责人' : '不设等级门槛，所有学员均可申报负责人（默认）' }}</span>
      </div>
    </section>

    <!-- ── 区块二：考勤模式（项目营=周打卡开关；培训营=三模式 + A 模式考勤参数） ── -->
    <section class="set-card">
      <header class="set-card__head">
        <h4 class="set-card__title">考勤模式</h4>
        <span v-if="!manageWritable" class="hint">已结营只读</span>
      </header>

      <!-- 项目营（09-13 独立口径）：活动考勤恒开，此处仅控周打卡统计条 -->
      <template v-if="isProjectCamp">
        <el-alert type="info" :closable="false" style="margin-bottom: 12px;"
          title="项目考勤以活动为单位：各项目负责人在项目看板发起活动并勾选成员出席，无需在此设置" />
        <el-form label-width="90px" size="small" style="max-width: 520px;">
          <el-form-item label="周打卡">
            <el-switch v-model="projectAtt.on" :disabled="!manageWritable" />
            <span class="hint" style="margin-left: 6px;">开=成员工作台顶部显示累计出勤统计条（个人打卡口径，与活动考勤独立）</span>
          </el-form-item>
        </el-form>
        <div v-if="manageWritable" style="margin-top: 10px;">
          <el-button type="primary" size="small" :loading="projectAtt.saving" @click="saveProjectAtt">保存</el-button>
        </div>
      </template>

      <!-- 培训营（learning）：三模式 + A 模式考勤参数 -->
      <template v-else>
        <el-radio-group v-model="attCfg.mode" :disabled="!manageWritable" style="flex-direction: column; align-items: stretch; gap: 8px;">
          <el-radio value="daily">假期营 · 每日承诺出勤——报名选到岗日，按日打卡评估出勤/迟到/时长</el-radio>
          <el-radio value="weekly">学期 · 校区培训 · 按周累计——不收承诺日，考察每周打卡次数与时长</el-radio>
          <el-radio value="off">学期 · 远程培训 · 不考勤</el-radio>
        </el-radio-group>
        <el-alert v-if="attCfg.mode === 'off'" type="info" :closable="false" style="margin-top: 10px;"
          title="本营不考勤：报名/工作台均不出考勤入口，保存后考勤能力关闭" />

        <!-- A 模式考勤参数（仅每日模式需要） -->
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

        <div v-if="manageWritable" style="margin-top: 10px;">
          <el-button type="primary" size="small" :loading="attCfg.saving" @click="saveAttMode">保存</el-button>
          <span class="hint" style="margin-left:8px;">切换出「每日」会清空本营承诺出勤日；切回需手动重生成</span>
        </div>
      </template>
    </section>

    <!-- ── 区块三：选导生流程（仅 learning）：draft/upcoming 可编辑，开跑后锁定只读 ── -->
    <section v-if="!isProjectCamp" class="set-card">
      <header class="set-card__head">
        <h4 class="set-card__title">选导生流程</h4>
        <span v-if="!msCfgEditable" class="hint">选导生已开跑（{{ statusLabel(session.status) }}），配置锁定只读</span>
      </header>

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
    </section>
  </div>
</template>

<script setup>
import { reactive, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';

// 营期设置子组件（09-17 从 CampSessionDetail 搬迁集中）：配置读模型经 props 传入，
// 写操作统一 PUT /camp/sessions/{campId}，成功后 emit('saved') 由父 fetchAll 回读。
// 本地派生（attModeSaved/isProjectCamp/gateOn/statusLabel）与父组件同名逻辑保持一致（交叉锚定，e2e 锁行为）。
const props = defineProps({
  session: { type: Object, required: true },        // 营期读模型（policy/ms_directions/status/category…）
  campId: { type: [String, Number], required: true },
  manageWritable: { type: Boolean, default: false }, // 老师/超管且未结营（父 computed，随 fetchAll 更新）
  allCourses: { type: Array, default: () => [] },   // 方向关联课程下拉 + 只读态课程名反查
});
const emit = defineEmits(['saved']);

const isProjectCamp = computed(() => props.session.category === 'project');
const statusLabel = (s) => ({ draft: '草稿', upcoming: '待开放', selecting: '选择阶段', running: '进行中', archived: '已结营' }[s] || s);
// 门槛位缺省回退与类型默认一致：mentor 默认开（=旧硬编码 LV2 门槛）、leader 默认关（=项目营零门槛史）
const gateOn = (k) => {
  if (k === 'leader_level_gate') return props.session?.policy?.capabilities?.[k] ?? false;
  return props.session?.policy?.capabilities?.[k] ?? true;
};
const gateSaving = reactive({ mentor_level_gate: false, leader_level_gate: false });
async function saveGate(key) {
  if (gateSaving[key] || !props.manageWritable) return;
  gateSaving[key] = true;
  try {
    await api.put(`/camp/sessions/${props.campId}`, { policy: { [key]: !gateOn(key) } });
    ElMessage.success('门槛设置已保存');
    emit('saved');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    gateSaving[key] = false;
  }
}

// ── 考勤三模式（09-12）：本地编辑态 attCfg；保存后回读 session 驱动渲染。
// A 模式考勤参数（期望到岗/最低时长/仅工作日）随模式一并保存 ──
const attCfg = reactive({
  mode: 'daily', saving: false,
  expectedCheckIn: null, minDailyHours: null, weekdaysOnly: true,
});
const attModeSaved = computed(() => {
  const caps = props.session.policy?.capabilities;
  if (caps && caps.attendance === false) return 'off';
  return props.session.policy?.attendance_mode || 'daily';
});
// 项目营考勤（09-13 独立口径）：落 policy 时恒 mode='weekly'，仅开关周打卡统计条
const projectAtt = reactive({ on: false, saving: false });
watch(attModeSaved, (m) => { projectAtt.on = m !== 'off'; }, { immediate: true });
async function saveProjectAtt() {
  projectAtt.saving = true;
  try {
    await api.put(`/camp/sessions/${props.campId}`, {
      policy: { attendance_mode: 'weekly', attendance_enabled: projectAtt.on },
    });
    ElMessage.success('考勤设置已保存');
    emit('saved');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    projectAtt.saving = false;
  }
}
watch(attModeSaved, (m) => { attCfg.mode = m; }, { immediate: true });
// immediate 必须有：本 pane 为 lazy，首次挂载时父组件 session 早已加载完毕，非 immediate 永不触发
watch(() => props.session, (s) => {
  if (!s?.id) return;
  attCfg.expectedCheckIn = s.expected_check_in ? String(s.expected_check_in).slice(0, 5) : null;
  attCfg.minDailyHours = s.min_daily_hours ?? null;
  attCfg.weekdaysOnly = !!s.weekdays_only;
}, { immediate: true });
async function saveAttMode() {
  attCfg.saving = true;
  try {
    const mode = attCfg.mode;
    await api.put(`/camp/sessions/${props.campId}`, {
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
    emit('saved');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    attCfg.saving = false;
  }
}

// ── 选导生与方向配置（09-12 定稿）：draft/upcoming 可编辑，开跑后锁定 ──
const msCfg = reactive({
  enabled: false, start: null, deadline: null,
  directions: [{ name: '', course_ids: [] }],
  saving: false, loaded: false,
});
const msCfgEditable = computed(() => props.manageWritable
  && ['draft', 'upcoming'].includes(props.session.status));
const sessionDirections = computed(() => props.session.ms_directions || []);
const courseTitle = (cid) => {
  const c = props.allCourses.find((x) => Number(x.Course_Id) === Number(cid));
  return c?.Course_title || '';
};
// session 加载后回填配置卡（一次；父 fetchAll 整体替换 session → prop 引用变化重燃本 watch）
watch(() => props.session, (s) => {
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
}, { immediate: true });
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
    await api.put(`/camp/sessions/${props.campId}`, body);
    ElMessage.success('配置已保存');
    emit('saved');
    msCfg.loaded = false;   // 让 watch 重新回填最新 session
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    msCfg.saving = false;
  }
}
</script>

<style scoped>
/* 分区卡片统一语言（09-17）：准入门槛/考勤模式/选导生流程三区块同款 */
.set-card {
  border: 1px solid var(--el-border-color-light, #dcdfe6);
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.set-card__head { display: flex; align-items: baseline; gap: 10px; }
.set-card__title { margin: 0; font-size: 14px; font-weight: 600; }
.hint { margin-left: 12px; color: #909399; font-size: 12px; }
.set-card__head .hint { margin-left: 0; }

/* 准入门槛开关行 */
.gate-row { display: flex; align-items: center; gap: 10px; margin: 10px 0 2px; }
.gate-label { font-size: 13px; font-weight: 500; }

/* 考勤三模式 radio 纵排（多行文案顶对齐，搬迁自 CampSessionDetail .att-cfg-card） */
:deep(.el-radio-group > .el-radio) { height: auto; align-items: flex-start; margin-right: 0; }

/* 分类方向编辑行（搬迁自 CampSessionDetail） */
.ms-cfg-dirs { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.ms-cfg-dir-row { display: flex; gap: 8px; align-items: center; }
.ms-cfg-readonly { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.ms-cfg-dir-view {
  display: flex; align-items: baseline; gap: 10px; font-size: 13px;
  padding: 6px 10px; border-radius: 4px; background: var(--el-fill-color-light, #f5f7fa);
}
.dir-name { font-weight: 600; }
.dir-course { color: #909399; font-size: 12px; }
@media (max-width: 640px) { .ms-cfg-dir-row { flex-wrap: wrap; } }
</style>
