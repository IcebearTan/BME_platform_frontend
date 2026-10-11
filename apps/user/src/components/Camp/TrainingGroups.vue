<template>
  <DewCard no-hover class="training-panel">
    <div class="training-toolbar">
      <div class="training-heading"><h3>培训小组</h3><span v-if="ready" class="training-hint">{{ groups.length }} 个方向小组 · 职责按组分配</span></div>
      <DewButton :disabled="!ready || readonly || loading" :active="true" @click="openCreate">创建小组</DewButton>
      <DewButton type="ghost" :loading="loading" @click="load">刷新</DewButton>
    </div>
    <p v-if="!loading && !ready">当前营期继续使用原有编组流程，历史名单切换后可使用此入口。</p>
    <p v-else class="training-hint">先将人员加入营期，再分配学习或带教职责。同一人可以在不同组学习和带教；入组不会重复生成考勤计划。</p>
    <DewSkeleton v-if="loading" variant="rect" height="160" />
    <div v-for="group in groups" :key="group.unit_id" class="training-group">
      <div class="training-toolbar">
        <div class="training-heading">
          <h4>{{ group.name }}</h4>
          <div class="training-meta"><span>{{ group.direction || '尚未设置方向' }}</span><span>{{ group.members.length }} 人 · {{ group.course_ids.length }} 门课</span><DewTag :type="group.status === 'active' ? 'success' : 'info'" size="sm">{{ ({ active: '进行中', paused: '已暂停', archived: '已归档', terminated: '已结束' })[group.status] || group.status }}</DewTag></div>
        </div>
        <DewButton v-if="!readonly && group.status === 'active'" @click="openMember(group)">添加职责</DewButton>
        <DewButton v-if="!readonly && ['active', 'paused'].includes(group.status) && !group.recruitment_mentor_id" @click="editGroup(group)">调整小组</DewButton>
      </div>
      <p class="training-courses">{{ group.course_ids.map(courseTitle).join(' / ') || '尚未配置课程' }}</p>
      <el-table :data="group.members" class="training-table" empty-text="尚未添加成员">
        <el-table-column label="成员" min-width="110"><template #default="{ row }">{{ row.username }}<span v-if="row.camp_status === 'removed'">（已退营）</span><span v-else-if="row.membership_status && row.membership_status !== 'active'">（已离组）</span></template></el-table-column>
        <el-table-column label="职责与课程范围" min-width="230">
          <template #default="{ row }">
            <span v-for="role in row.roles" :key="role.id ?? `${role.role}-${role.scope_id}`" class="training-role">
              <DewTag :type="role.role === 'mentor' ? 'primary' : 'info'" size="sm">{{ role.role === 'mentor' ? '导生' : '学员' }}</DewTag>
              <span>{{ role.scope_type === 'course' ? courseTitle(role.scope_id) : '本组全部课程' }}</span>
              <span v-if="role.active === false">（已结束）</span>
              <DewButton v-if="role.active !== false && !readonly && group.status === 'active'" type="ghost" size="sm" class="training-end" :disabled="busy" @click="removeRole(group, row, role)">结束职责</DewButton>
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <p v-if="!loading && ready && !groups.length" class="training-empty">尚未创建培训小组。</p>
    <DewDialog v-model="creating" title="创建培训小组" width="480px">
      <el-form label-position="top" class="training-form">
        <el-form-item label="小组名称"><DewInput v-model="form.name" maxlength="100" /></el-form-item>
        <el-form-item label="导生"><DewSelect v-model="form.mentor_user_id" :options="memberOptions" filterable placeholder="选择负责带教的营期成员" /></el-form-item>
        <el-form-item label="方向（自动配置该方向课程）"><DewSelect v-model="form.direction" :options="directionOptions" placeholder="选择培训方向" /></el-form-item>
        <el-form-item label="容量（留空不限）"><el-input-number v-model="form.capacity" :min="1" :max="30" /></el-form-item>
      </el-form>
      <template #footer><DewButton type="ghost" @click="creating = false">取消</DewButton><DewButton :active="true" :loading="busy" :disabled="!form.name.trim() || form.name.trim().length > 100 || !form.mentor_user_id" @click="create">创建</DewButton></template>
    </DewDialog>
    <DewDialog v-model="adding" :title="`添加职责 · ${selected?.name || ''}`" width="500px">
      <el-form label-position="top" class="training-form">
        <el-form-item label="营期成员"><DewSelect v-model="assignment.user_id" :options="memberOptions" filterable placeholder="选择营期成员" /></el-form-item>
        <el-form-item label="职责"><DewButtonBar v-model="assignment.role" :items="[{ value: 'learner', label: '学习' }, { value: 'mentor', label: '带教' }]" /></el-form-item>
        <el-form-item label="课程范围"><DewSelect v-model="assignment.course_id" :options="courseOptions" placeholder="本组全部课程" /></el-form-item>
        <template v-if="assignment.role === 'learner'">
          <el-form-item label="本营考勤义务"><DewSelect v-model="attendanceChoice" :options="[{ label: '保留当前要求', value: 'keep' }, { label: '需要考勤', value: 'required' }, { label: '免考勤', value: 'exempt' }]" /></el-form-item>
          <el-checkbox v-model="assignment.transfer_courses">若课程已有责任组，确认将这些课程转交到本组</el-checkbox>
          <p class="training-hint">不勾选时，同营同课重复分组会被拒绝。转交保留原进度、认证和材料。</p>
        </template>
      </el-form>
      <template #footer><DewButton type="ghost" @click="adding = false">取消</DewButton><DewButton :active="true" :loading="busy" :disabled="!assignment.user_id" @click="add">保存</DewButton></template>
    </DewDialog>
    <DewDialog v-model="editing" title="调整培训小组" width="480px">
      <el-form label-position="top" class="training-form">
        <el-form-item label="名称"><DewInput v-model="edit.name" /></el-form-item>
        <el-form-item label="治理负责人（不自动改变带教职责）"><DewSelect v-model="edit.owner_user_id" :options="ownerOptions" placeholder="选择治理负责人" /></el-form-item>
        <el-form-item label="方向"><DewSelect v-model="edit.direction" :options="directionOptions" placeholder="选择培训方向" /></el-form-item>
        <el-form-item label="容量"><el-input-number v-model="edit.capacity" :min="1" :max="30" /></el-form-item>
        <el-form-item label="状态"><DewButtonBar v-model="edit.status" :items="[{ value: 'active', label: '进行中' }, { value: 'paused', label: '暂停' }]" /></el-form-item>
      </el-form>
      <template #footer><DewButton type="ghost" @click="editing = false">取消</DewButton><DewButton :active="true" :loading="busy" :disabled="!edit.name?.trim() || edit.name.trim().length > 100" @click="saveEdit">保存</DewButton></template>
    </DewDialog>
  </DewCard>
</template>
<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { DewCard, DewButton, DewDialog, DewInput, DewSelect, DewButtonBar, DewTag, DewSkeleton, DewMessage, DewMessageBox } from '@bme/dew-ui';
import { campService } from '../../services/campService';
const props = defineProps({ sid: { type: [Number, String], required: true }, session: Object });
const readonly = computed(() => ['archived', 'deleted'].includes(props.session?.status));
const courses = ref([]), loading = ref(false);
const groups = ref([]), members = ref([]), ready = ref(false), busy = ref(false);
const creating = ref(false), adding = ref(false), editing = ref(false), selected = ref(null);
const form = reactive({ name: '', mentor_user_id: null, direction: null, capacity: undefined });
const assignment = reactive({ user_id: null, role: 'learner', course_id: null, transfer_courses: false });
const attendanceChoice = ref('keep');
const edit = reactive({});
const courseTitle = cid => courses.value.find(c => Number(c.course_id) === Number(cid))?.title || `课程 #${cid}（名称暂不可用）`;
const memberOptions = computed(() => members.value.filter(m => !m.status || m.status === 'active').map(m => ({ label: m.username, value: m.user_id })));
const ownerOptions = computed(() => (selected.value?.members || []).filter(m => (!m.membership_status || m.membership_status === 'active') && m.camp_status !== 'removed').map(m => ({ label: m.username, value: m.user_id })));
const directionOptions = computed(() => [{ label: '暂不指定方向', value: null }, ...(props.session?.ms_directions || []).map(d => ({ label: d.name, value: d.name }))]);
const courseOptions = computed(() => [{ label: '本组全部课程', value: null }, ...(selected.value?.course_ids || []).map(cid => ({ label: courseTitle(cid), value: cid }))]);
function openCreate() { Object.assign(form, { name: '', mentor_user_id: null, direction: null, capacity: undefined }); creating.value = true; }
let loadSequence = 0;
async function load() {
  const sequence = ++loadSequence;
  loading.value = true;
  try {
    const [g, m, c] = await Promise.all([campService.fetchTrainingGroups(props.sid), campService.fetchMembers(props.sid), campService.fetchCourses(props.sid)]);
    if (sequence !== loadSequence) return;
    courses.value = c.courses || [];
    groups.value = g.groups || []; ready.value = !!g.ready; members.value = m.members || [];
  } catch (e) { if (sequence === loadSequence) DewMessage.error(e.response?.data?.message || '加载小组失败'); }
  finally { if (sequence === loadSequence) loading.value = false; }
}
async function run(action) {
  if (busy.value) return;
  busy.value = true;
  try { await action(); await load(); DewMessage.success('已保存'); }
  catch (e) { DewMessage.error(e.response?.data?.message || '操作失败，请刷新后重试'); }
  finally { busy.value = false; }
}
function create() { run(async () => { await campService.createTrainingGroup(props.sid, { ...form, capacity: form.capacity ?? null }); creating.value = false; }); }
function openMember(group) { selected.value = group; Object.assign(assignment, { user_id: null, role: 'learner', course_id: null, transfer_courses: false }); attendanceChoice.value = 'keep'; adding.value = true; }
function add() {
  run(async () => {
    const data = { ...assignment, course_id: assignment.course_id || null, expected_version: selected.value.version };
    if (assignment.role === 'learner' && attendanceChoice.value !== 'keep') data.attendance_required = attendanceChoice.value === 'required';
    await campService.changeTrainingRole(props.sid, selected.value.unit_id, data);
    adding.value = false;
  });
}
async function removeRole(group, member, role) {
  try { await DewMessageBox.confirm(`结束 ${member.username} 的${role.role === 'mentor' ? '带教' : '学习'}职责？原学习历史保留。`, '结束职责'); }
  catch { return; }
  run(() => campService.changeTrainingRole(props.sid, group.unit_id, { user_id: member.user_id, role: role.role, course_id: role.scope_type === 'course' ? role.scope_id : null, expected_version: group.version }, true));
}
function editGroup(group) { selected.value = group; Object.assign(edit, { name: group.name, direction: group.direction, owner_user_id: group.owner_user_id, capacity: group.capacity ?? undefined, status: group.status }); editing.value = true; }
function saveEdit() {
  run(async () => {
    const direction = props.session?.ms_directions?.find(d => d.name === edit.direction);
    await campService.updateTrainingGroup(props.sid, selected.value.unit_id, { ...edit, ...(edit.direction !== selected.value.direction ? { course_ids: direction?.course_ids || [] } : {}), capacity: edit.capacity ?? null, expected_version: selected.value.version });
    editing.value = false;
  });
}
watch(() => props.sid, () => { groups.value = []; members.value = []; ready.value = false; creating.value = adding.value = editing.value = false; load(); }, { immediate: true });
</script>
<style scoped>
.training-panel { color: var(--dew-text); }
.training-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.training-heading { flex: 1; min-width: 180px; }
.training-heading h3, .training-heading h4 { margin: 0 0 8px; color: var(--dew-text-heading); }
.training-heading h3 { font-size: 20px; }
.training-heading h4 { font-size: 17px; }
.training-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; color: var(--dew-text-muted); font-size: 13px; }
.training-group { margin-top: 24px; border-top: 1px solid var(--dew-card-border); padding-top: 24px; }
.training-hint { color: var(--dew-text-muted); line-height: 1.7; font-size: 13px; }
.training-courses { color: var(--dew-text-muted); font-size: 13px; line-height: 1.7; margin: 12px 0; }
.training-role { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 4px 0; }
.training-end { color: var(--color-danger); margin-left: auto; }
.training-empty { padding: 36px 0; text-align: center; color: var(--dew-text-muted); }
.training-table { border-radius: 12px; --el-table-bg-color: var(--dew-dialog-bg); --el-table-tr-bg-color: var(--dew-dialog-bg); --el-table-header-bg-color: var(--dew-dialog-bg); --el-table-row-hover-bg-color: var(--dew-input-bg-hover); --el-table-text-color: var(--dew-text); --el-table-header-text-color: var(--dew-text-muted); --el-table-border-color: var(--dew-card-border); }
.training-form { --el-text-color-regular: var(--dew-text); --el-text-color-primary: var(--dew-text-heading); --el-fill-color-blank: var(--dew-dialog-bg); --el-fill-color-light: var(--dew-input-bg); --el-border-color: var(--dew-card-border); --el-color-primary: var(--color-primary); }
.training-form :deep(.dew-select), .training-form :deep(.dew-input) { width: 100%; }
.training-form :deep(.el-checkbox) { height: auto; white-space: normal; }
.training-form :deep(.el-checkbox__label) { white-space: normal; line-height: 1.7; }
@media (max-width: 600px) {
  .training-toolbar { gap: 8px; }
  .training-heading { flex-basis: 100%; }
  .training-group { margin-top: 20px; padding-top: 20px; }
}
</style>
