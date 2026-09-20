<template>
  <!-- 组会（2026-09-18 重构：按开会的自然顺序 组织）。两种挂载：
       培训组 = 营期工作台 tab（unitId 缺省，后端按营内身份解析「我的导生组」）；
       项目组 = ProjectBoard 内嵌（unitId 指定项目单元）。
       生命周期：发起（主题+日期）→ 布置（课内章节+课外任务）→ 会后提交纪要归档；
       状态由「有纪要」派生（见 statusOf），组长全程可推进，组员只读+交任务；
       结营（archived）后整体只读。
       交互独立（09-18 定稿）：点卡片=详情看全部内容（只读）；列表卡右下角
       「去布置/提交纪要」各自直达独立弹窗（MeetingAssign / 纪要表单），互不叠放。 -->
  <div class="camp-meetings">
    <div v-if="loading" class="cm-loading">
      <DewSkeleton variant="rect" width="100%" height="120" rounded="8px" />
    </div>

    <!-- 培训组未编组：空态分流（不报错）。样式与看板「不考勤说明卡」同款 -->
    <DewCard v-else-if="!group" variant="default" size="lg" :no-hover="true" class="cm-empty">
      <div class="empty-note">
        <div class="empty-title">尚未分配导生</div>
        <div class="empty-sub">编组后组会会显示在这里。</div>
      </div>
    </DewCard>

    <template v-else>
      <!-- 组员待办聚合条（09-17 用户引导：作业是组会域的高频动作，置顶直达，不再翻卡片找；
           09-20 口径合并：待提交任务 + 待认证课内章节数，纯课内布置不再误判已完成） -->
      <div v-if="!isLeader && pendingTotal > 0" class="pending-strip" role="status">
        <span class="pending-num">{{ pendingTotal }}</span>
        <span class="pending-text">项待完成</span>
        <DewButton type="glass" size="sm" class="pending-go" @click="goPending">去完成</DewButton>
      </div>
      <div v-else-if="!isLeader && hasAnyAssign" class="pending-done">本期组会任务与课内进度已全部完成</div>

      <div class="cm-head">
        <span class="cm-head-meta">
          {{ isUnit
            ? `共 ${meetings.length} 次组会`
            : `导生组 · 组长 ${group.mentor_name} · 组员 ${group.member_count} 人 · 共 ${meetings.length} 次` }}
        </span>
        <DewButton v-if="isLeader && writable" type="glass" size="sm" class="cm-add"
                   @click="openCreate">发起组会</DewButton>
      </div>

      <DewCard v-if="!meetings.length" variant="default" size="lg" :no-hover="true" class="cm-none">
        <div class="empty-note">
          <template v-if="isLeader">
            <div class="empty-title">还没有组会</div>
            <div class="empty-sub">发起第一期：创建组会 → 布置任务与课内进度 → 会后提交纪要归档</div>
          </template>
          <template v-else>
            <div class="empty-title">还没有组会记录</div>
            <div class="empty-sub">组长发起后会显示在这里。</div>
          </template>
        </div>
      </DewCard>

      <div v-else class="cm-list">
        <!-- 组会概要卡：DewCard interactive（点击=详情）；右下角 footer 插槽放动作按钮
             （同型 glass，主推进动作用 :active 点亮——与反馈卡同款，避免混型大小失衡） -->
        <DewCard v-for="m in meetings" :key="m.id" interactive role="button" tabindex="0"
                 class="mtg-card" @click="openDetail(m)" @keydown.enter="openDetail(m)">
          <div class="mtg-body">
            <!-- 行1：状态 + 主题（管理按钮右贴） -->
            <div class="mtg-head">
              <span class="mtg-status" :class="`st-${statusOf(m).key}`">{{ statusOf(m).label }}</span>
              <span class="mtg-title">{{ m.title }}</span>
              <template v-if="isLeader && writable">
                <DewButton type="ghost" size="sm" class="mtg-tool" @click.stop="openEdit(m)">编辑</DewButton>
                <DewButton type="ghost" size="sm" class="mtg-tool" @click.stop="delMeeting(m)">删除</DewButton>
              </template>
            </div>
            <!-- 行2：日期 · 发起人 -->
            <div class="mtg-meta">{{ m.meeting_date }} · {{ m.creator_name }} 发起</div>

            <!-- 行3：纪要摘录 / 待归档提示 -->
            <p v-if="m.content" class="mtg-content">{{ m.content }}</p>
            <div v-else-if="statusOf(m).key !== 'held'" class="mtg-minutes-hint">
              {{ isLeader ? '纪要待提交——开完会后归档文字、文件与录像' : '纪要会后由组长归档' }}
            </div>

            <!-- 行4：附件（文件直链 + 录像先签后播） -->
            <div v-if="m.attachments.length" class="mtg-atts">
              <template v-for="a in m.attachments" :key="a.id">
                <!-- 视频先签后播：<video> 带不了 Authorization 头，点击时换短签直连 -->
                <div v-if="a.is_video" class="mtg-video">
                  <video v-if="videoSrcs[a.id]" :src="videoSrcs[a.id]" controls
                         preload="metadata" playsinline></video>
                  <button v-else type="button" class="video-shell"
                          :disabled="videoLoading === a.id" @click.stop="playVideo(a)">
                    <el-icon><VideoPlay /></el-icon>
                    <span class="video-name">{{ a.filename }}</span>
                    <span class="video-size">{{ fmtSize(a.size) }} · 点击播放</span>
                  </button>
                </div>
                <button v-else type="button" class="att-link" @click.stop="downloadAtt(a)">
                  {{ a.filename }}（{{ fmtSize(a.size) }}）
                </button>
              </template>
            </div>
          </div>

          <!-- footer：左=布置与提交进度（任务+课内合并口径），右=下一步动作 -->
          <template #footer>
            <div class="mtg-foot">
              <span v-if="m.task_count || m.chapter_count" class="mtg-stats">
                <span class="stat">任务 {{ m.task_count }}</span>
                <i class="dot"></i>
                <span v-if="m.chapter_count" class="stat">课内 {{ m.chapter_count }} 章</span>
                <i v-if="m.chapter_count" class="dot"></i>
                <template v-if="isLeader && m.expected_count > 0">
                  <span class="stat">提交 {{ m.submission_count }}/{{ m.expected_count }}</span>
                  <span class="mtg-prog"><i :style="{ width: `${Math.round(m.submission_count / m.expected_count * 100)}%` }"></i></span>
                  <span v-if="m.overdue_count > 0" class="stat late">逾期 {{ m.overdue_count }}</span>
                </template>
                <template v-if="isLeader && m.chapter_expected > 0">
                  <span class="stat">认证 {{ m.chapter_certified }}/{{ m.chapter_expected }}</span>
                  <span v-if="m.chapter_overdue_count > 0" class="stat late">逾期 {{ m.chapter_overdue_count }}</span>
                </template>
                <template v-if="!isLeader">
                  <span v-if="myTodoOf(m) > 0" class="stat warn">待完成 {{ myTodoOf(m) }}</span>
                  <span v-else class="stat ok">已全部完成</span>
                  <span v-if="(m.my_overdue || 0) + (m.my_chapter_overdue || 0) > 0"
                        class="stat late">逾期 {{ (m.my_overdue || 0) + (m.my_chapter_overdue || 0) }}</span>
                </template>
              </span>
              <span v-else></span>
              <span class="mtg-foot-acts">
                <DewButton v-if="isLeader && writable" :type="assignBtn(m).glass ? 'glass' : 'ghost'"
                           size="sm" :active="assignBtn(m).glass"
                           @click.stop="assignBtn(m).run(m)">{{ assignBtn(m).label }}</DewButton>
                <DewButton v-if="isLeader && writable && statusOf(m).key !== 'held'"
                           :type="statusOf(m).key === 'minutes' ? 'glass' : 'ghost'" size="sm"
                           :active="statusOf(m).key === 'minutes'" @click.stop="openEdit(m)">提交纪要</DewButton>
                <DewButton v-if="!isLeader && writable && myTodoOf(m) > 0" type="glass" size="sm"
                           @click.stop="goSubmit(m)">去完成</DewButton>
                <span class="mtg-open">详情</span>
              </span>
            </div>
          </template>
        </DewCard>
      </div>
    </template>

    <!-- 创建组会（轻量：主题+日期；纪要会后经「提交纪要」归档）/ 编辑·提交纪要 -->
    <DewDialog v-model="dlg" :title="dlgTitle" :width="editing ? '620px' : '520px'">
      <!-- 三步流程条：把开会的顺序摆在眼前（编辑纪要时不重复展示） -->
      <div v-if="!editing" class="flow-steps">
        <span class="fstep on"><i>1</i>发起组会</span>
        <span class="farrow">→</span>
        <span class="fstep"><i>2</i>布置任务与进度</span>
        <span class="farrow">→</span>
        <span class="fstep"><i>3</i>会后提交纪要</span>
      </div>
      <div class="cm-form">
        <div class="field-label">会议主题 <span class="field-req">必填</span></div>
        <DewInput v-model="form.title" size="lg" placeholder="如：第一周组会 · 方向讨论" />
        <div class="field-label">会议日期 <span class="field-req">必填</span></div>
        <DewInput v-model="form.meeting_date" type="date" />

        <template v-if="editing">
          <!-- 以下仅「提交/编辑纪要」（第 3 步）时出现 -->
          <div class="field-label">文字纪要</div>
          <DewInput v-model="form.content" type="textarea" :rows="5"
                    placeholder="议题、结论与分工（文字与附件至少其一）" />
          <div class="field-label">会议文件</div>
          <div class="picker-row">
            <DewButton type="ghost" size="sm" @click="pickFiles('file')">选择文件</DewButton>
            <span class="picker-hint">可多选，单个不超过 100MB</span>
          </div>
          <div v-if="form.files.filter((f) => !f.type.startsWith('video/')).length" class="chips">
            <span v-for="(f, i) in form.files.filter((f) => !f.type.startsWith('video/'))"
                  :key="f.name + i" class="chip">
              {{ f.name }}（{{ fmtSize(f.size) }}）
              <button type="button" class="chip-x" @click="removePicked(f)">×</button>
            </span>
          </div>
          <div class="field-label">会议录像</div>
          <div class="picker-row">
            <DewButton type="ghost" size="sm" @click="pickFiles('video')">选择视频</DewButton>
            <span class="picker-hint">单个不超过 500MB，组员可在线播放</span>
          </div>
          <div v-if="form.files.filter((f) => f.type.startsWith('video/')).length" class="chips">
            <span v-for="(f, i) in form.files.filter((f) => f.type.startsWith('video/'))"
                  :key="f.name + i" class="chip">
              {{ f.name }}（{{ fmtSize(f.size) }}）
              <button type="button" class="chip-x" @click="removePicked(f)">×</button>
            </span>
          </div>
          <div class="field-label">已传附件 <span class="picker-hint">点 × 删除</span></div>
          <div v-if="existingAtts.length" class="chips">
            <span v-for="a in existingAtts" :key="a.id" class="chip">
              {{ a.filename }}{{ a.is_video ? ' · 视频' : '' }}
              <button type="button" class="chip-x" @click="removeExisting(a)">×</button>
            </span>
          </div>
          <div v-else class="picker-hint">无（保存后可再补传）</div>
        </template>

        <div class="form-actions">
          <DewButton type="ghost" @click="dlg = false">取消</DewButton>
          <DewButton type="glass" :loading="saving" :disabled="!canSubmit" @click="save">
            {{ editing ? (statusOf(editing).key === 'held' ? '保存修改' : '提交纪要') : '创建并去布置' }}
          </DewButton>
        </div>
      </div>
    </DewDialog>

    <!-- 组会详情（点卡片进入，看全部内容：纪要/布置/任务/审阅）。编辑动作全部独立成弹窗：
         提交纪要 = 纪要表单弹窗；布置 = MeetingAssign 弹窗（互不叠放，进前先关详情）。
         focusTasks：待办条直达我的任务区 -->
    <MeetingDetail v-model="detailDlg" :sid="sid" :meeting-id="detailId"
                   :camp-status="campStatus" :focus-tasks="detailFocusTasks"
                   @changed="load" @edit="openEdit" @assign="(m) => openAssign(m)" />

    <!-- 布置进度（独立弹窗）：课内章节 + 课外任务；fresh=创建组会后直达（三步引导条） -->
    <MeetingAssign v-model="assignDlg" :sid="sid" :meeting-id="assignId"
                   :camp-status="campStatus" :fresh="assignFresh" @saved="load" />

    <!-- 删除确认（DewUI 弹窗，替代 ELP MessageBox） -->
    <DewDialog v-model="delDlg" title="删除组会" width="440px">
      <div class="del-form">
        <p class="del-line">删除「{{ delTarget?.title }}」（{{ delTarget?.meeting_date }}）？</p>
        <p class="del-sub">附件、录像与任务提交一并删除，不可恢复。</p>
        <div class="del-actions">
          <DewButton type="ghost" @click="delDlg = false">取消</DewButton>
          <DewButton type="danger" :loading="deleting" @click="doDelete">删除</DewButton>
        </div>
      </div>
    </DewDialog>

    <input ref="fileInput" type="file" multiple class="file-hidden" @change="onFilesPicked" />
    <input ref="videoInput" type="file" accept="video/*" class="file-hidden" @change="onFilesPicked" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { VideoPlay } from '@element-plus/icons-vue';
import { DewCard, DewButton, DewInput, DewDialog, DewSkeleton } from '@bme/dew-ui';
import { campService, todayLocal } from '../../services/campService';
import MeetingDetail from './MeetingDetail.vue';
import MeetingAssign from './MeetingAssign.vue';

const props = defineProps({
  sid: { type: Number, required: true },
  unitId: { type: Number, default: null },        // 传入=项目组（unit 域）；缺省=培训组（我的导生组）
  campStatus: { type: String, default: null },    // archived 时整体只读
});
const isUnit = computed(() => props.unitId != null);
const writable = computed(() => props.campStatus !== 'archived');

const loading = ref(true);
const group = ref(null);
const isLeader = ref(false);
const meetings = ref([]);

async function load() {
  loading.value = true;
  try {
    const d = isUnit.value
      ? await campService.fetchUnitMeetings(props.unitId)
      : await campService.fetchTeamMeetings(props.sid);
    group.value = d.group || null;
    isLeader.value = !!d.is_leader;
    meetings.value = d.meetings || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载组会失败');
  } finally { loading.value = false; }
}
watch(() => [props.sid, props.unitId], load, { immediate: true });

// ── 组会状态（派生，不落库）：有纪要（文字/附件）=已完结；会期已过未归档=待纪要；
// 已布置=进行中；否则=待布置。存量旧记录一律带纪要，天然是已完结态 ──
function statusOf(m) {
  if ((m.content || '').trim() || (m.attachments || []).length)
    return { key: 'held', label: '已完结' };
  if (m.meeting_date < todayLocal())
    return { key: 'minutes', label: '待纪要' };
  if ((m.task_count || 0) + (m.chapter_count || 0) > 0)
    return { key: 'live', label: '进行中' };
  return { key: 'prep', label: '待布置' };
}

// 卡片右下角「布置/审阅」按钮：待布置=直达独立布置弹窗（强调），之后=进详情审阅
function assignBtn(m) {
  if (statusOf(m).key === 'prep')
    return { label: '去布置', glass: true, run: () => openAssign(m) };
  return { label: '去审阅', glass: statusOf(m).key === 'live', run: () => openDetail(m) };
}
// 组员卡片动作：有待办直达「我的任务」区
function goSubmit(m) {
  detailFocusTasks.value = true;
  openDetail(m);
}

// ── 布置进度（独立弹窗）：与详情/纪要弹窗互斥，打开前先关其他弹窗 ──
const assignId = ref(null);
const assignFresh = ref(false);     // 创建组会后直达：顶部三步引导条（关一次即复位）
const assignDlg = computed({
  get: () => assignId.value != null,
  set: (v) => { if (!v) { assignId.value = null; assignFresh.value = false; } },
});
function openAssign(m, fresh = false) {
  detailId.value = null;
  detailFocusTasks.value = false;
  dlg.value = false;
  assignFresh.value = fresh;
  assignId.value = m.id;
}

// ── 组会详情（点卡片进入，只读查看全部内容）──
const detailId = ref(null);
const detailFocusTasks = ref(false);   // 待办条直达「我的任务」区
const detailDlg = computed({
  get: () => detailId.value != null,
  set: (v) => {
    if (!v) { detailId.value = null; detailFocusTasks.value = false; }
  },
});
function openDetail(m) { detailId.value = m.id; }

// 组员待办聚合（09-20 口径合并：待提交任务 + 待认证课内章节）+ 最近一期有待办的组会（列表已按日期倒序）
const myTodoOf = (m) => (m.my_pending || 0) + (m.my_chapter_pending || 0);
const pendingTotal = computed(() => meetings.value.reduce((n, m) => n + myTodoOf(m), 0));
const hasAnyAssign = computed(() => meetings.value.some((m) => m.task_count || m.chapter_count));
function goPending() {
  const target = meetings.value.find((m) => myTodoOf(m) > 0);
  if (!target) return;
  detailFocusTasks.value = true;
  openDetail(target);
}

// ── 创建组会（轻量）/ 提交·编辑纪要（组长·负责人）──
const dlg = ref(false);
const editing = ref(null);       // 编辑中的组会行（null=创建）
const form = ref({ title: '', meeting_date: '', content: '', files: [] });
const existingAtts = ref([]);    // 编辑时的已传附件（可就地删）
const saving = ref(false);
const dlgTitle = computed(() => {
  if (!editing.value) return '创建组会';
  return statusOf(editing.value).key === 'held' ? '编辑组会纪要' : '提交纪要';
});
const canSubmit = computed(() => {
  const base = !!(form.value.title.trim() && form.value.meeting_date);
  if (!editing.value) return base;   // 创建=主题+日期；纪要第 3 步再交
  return base && !!(form.value.content.trim() || form.value.files.length || existingAtts.value.length);
});
function openCreate() {
  editing.value = null;
  form.value = { title: '', meeting_date: todayLocal(), content: '', files: [] };
  existingAtts.value = [];
  dlg.value = true;
}
function openEdit(m) {
  // 若从详情内进入：先关详情弹窗，纪要表单独立出现（两层弹窗不叠放）
  detailId.value = null;
  detailFocusTasks.value = false;
  dlg.value = false;
  editing.value = m;
  form.value = { title: m.title, meeting_date: m.meeting_date, content: m.content || '', files: [] };
  existingAtts.value = [...(m.attachments || [])];
  dlg.value = true;
}
async function save() {
  if (saving.value || !canSubmit.value) return;
  // 前端粗校验单件大小（后端仍强校验）：文件 100MB / 视频 500MB
  for (const f of form.value.files) {
    const mb = f.size / 1024 / 1024;
    const cap = f.type.startsWith('video/') ? 500 : 100;
    if (mb > cap) { ElMessage.error(`${f.name} 超过 ${cap}MB 上限`); return; }
  }
  saving.value = true;
  try {
    // 创建只带主题+日期（第 1 步）；纪要/文件/录像经「提交纪要」（编辑链）归档
    const payload = editing.value
      ? { title: form.value.title.trim(), meeting_date: form.value.meeting_date,
          content: form.value.content.trim(), files: form.value.files }
      : { title: form.value.title.trim(), meeting_date: form.value.meeting_date };
    const wasCreate = !editing.value;
    const r = editing.value
      ? await campService.updateMeeting(editing.value.id, payload)
      : isUnit.value
        ? await campService.createUnitMeeting(props.unitId, payload)
        : await campService.createTeamMeeting(props.sid, payload);
    ElMessage.success(r.message || (wasCreate ? '组会已创建' : '纪要已保存'));
    dlg.value = false;
    load();
    // 创建即布置：创建成功直达独立布置弹窗（第 2 步，带三步引导条）
    if (wasCreate && r.meeting?.id) {
      openAssign(r.meeting, true);
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally { saving.value = false; }
}

// ── 附件选取（原生隐藏 input，与章节材料同款）──
const fileInput = ref(null);
const videoInput = ref(null);
function pickFiles(kind) { (kind === 'video' ? videoInput.value : fileInput.value)?.click(); }
function onFilesPicked(e) {
  const input = e.target;
  for (const f of input.files || []) form.value.files.push(f);
  input.value = '';   // 允许重复选同名文件
}
function removePicked(f) {
  form.value.files = form.value.files.filter((x) => x !== f);
}
async function removeExisting(a) {
  try {
    await campService.deleteMeetingAttachment(a.id);
    existingAtts.value = existingAtts.value.filter((x) => x.id !== a.id);
    // 就地同步列表行，避免关弹窗后旧附件闪现
    const m = meetings.value.find((x) => x.id === editing.value?.id);
    if (m) m.attachments = (m.attachments || []).filter((x) => x.id !== a.id);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除附件失败');
  }
}

// ── 媒体访问（下载/播放均先换短签直连，2h 有效）──
const videoSrcs = ref({});       // aid → 签名直连 URL
const videoLoading = ref(null);
async function playVideo(a) {
  if (videoLoading.value) return;
  videoLoading.value = a.id;
  try {
    videoSrcs.value[a.id] = await campService.fetchMeetingAttachmentUrl(a.id);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '视频打开失败');
  } finally { videoLoading.value = null; }
}
async function downloadAtt(a) {
  try {
    const url = await campService.fetchMeetingAttachmentUrl(a.id);
    window.open(url, '_blank');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '下载失败');
  }
}

// ── 删除确认（DewUI 弹窗，替代 ELP MessageBox）──
const delDlg = ref(false);
const delTarget = ref(null);
const deleting = ref(false);
function delMeeting(m) {
  delTarget.value = m;
  delDlg.value = true;
}
async function doDelete() {
  if (!delTarget.value || deleting.value) return;
  deleting.value = true;
  try {
    await campService.deleteMeeting(delTarget.value.id);
    ElMessage.success('已删除');
    delDlg.value = false;
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  } finally { deleting.value = false; }
}

const fmtSize = (n) => {
  if (n == null) return '';
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;
};
</script>

<style scoped>
.camp-meetings { display: flex; flex-direction: column; gap: 12px; }
.cm-loading { padding: 4px 0; }

/* 空态（未编组 / 无组会）：与看板「不考勤说明卡」同款半透明卡 + 居中双行 */
.empty-note { padding: 28px 16px; text-align: center; }
.empty-title { font-size: 15px; font-weight: 650; color: var(--dew-text-heading); }
.empty-sub { font-size: 12.5px; color: var(--dew-text-muted); margin-top: 8px; line-height: 1.7; }

.cm-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cm-head-meta { font-size: 13px; color: var(--dew-text-muted); }
.cm-add { margin-left: auto; }

/* 组员待办聚合条：作业是高频动作，醒目置顶直达 */
.pending-strip {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--color-warning) 35%, transparent);
  background: color-mix(in srgb, var(--color-warning) 9%, transparent);
}
.pending-num {
  font-size: 22px; font-weight: 800; color: var(--color-warning);
  font-variant-numeric: tabular-nums; line-height: 1;
}
.pending-text { font-size: 13.5px; font-weight: 600; color: var(--dew-text-heading); }
.pending-go { margin-left: auto; }
.pending-done {
  font-size: 12.5px; color: var(--color-success);
  padding: 8px 12px; border-radius: 10px;
  background: color-mix(in srgb, var(--color-success) 8%, transparent);
}

.cm-list { display: flex; flex-direction: column; gap: 10px; }
/* 组会概要卡：DewCard interactive（壳体/悬停/点击反馈全由 DewCard 提供）。
   body 内容包一层 wrapper——DewCard 的 body 插槽不带子项间距，这里统一给 */
.mtg-body { display: flex; flex-direction: column; gap: 9px; }

/* 行1：状态章 + 标题（管理按钮右贴） */
.mtg-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mtg-status {
  flex: none; padding: 2px 10px; border-radius: 999px;
  font-size: 11.5px; font-weight: 700; line-height: 1.6;
}
.mtg-status.st-prep {
  color: var(--dew-text-muted);
  background: color-mix(in srgb, var(--dew-text-muted) 10%, transparent);
}
.mtg-status.st-live {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}
.mtg-status.st-minutes {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
}
.mtg-status.st-held {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
}
.mtg-title { font-size: 14px; font-weight: 650; color: var(--dew-text-heading); }
.mtg-tool:first-of-type { margin-left: auto; }

/* 行2：日期 · 发起人 */
.mtg-meta {
  font-size: 12px; color: var(--dew-text-faint);
  font-variant-numeric: tabular-nums; margin-top: -3px;
}

/* 行3：纪要摘录 / 待归档提示 */
.mtg-content {
  margin: 0; font-size: 13px; line-height: 1.7; color: var(--dew-text-text, var(--dew-text-heading));
  white-space: pre-wrap; word-break: break-word;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
  line-clamp: 2; overflow: hidden;
}
.mtg-minutes-hint {
  font-size: 12.5px; color: var(--dew-text-faint); line-height: 1.7;
}

/* 行4：附件 */
.mtg-atts { display: flex; flex-direction: column; gap: 8px; }
.att-link {
  align-self: flex-start; border: none; background: none; padding: 0; cursor: pointer;
  font-size: 12.5px; color: var(--color-primary); text-decoration: none;
  transition: opacity 0.2s ease;
}
.att-link:hover { opacity: 0.78; }

/* 视频：签名前=占位壳（点播放换直连），签名后=原生 <video>（Range 206 拖进度条） */
.mtg-video video {
  width: 100%; max-height: 420px; border-radius: 10px; display: block;
  background: rgba(0, 0, 0, 0.9);
}
.video-shell {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 10px 14px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--dew-card-border, rgba(148,163,184,.2));
  background: transparent; color: var(--dew-text-muted); font-size: 12.5px;
  transition: transform 0.25s var(--dew-bounce, ease), color 0.2s ease;
}
.video-shell:hover:not(:disabled) { transform: translateY(-1px); color: var(--dew-text-heading); }
.video-shell:disabled { opacity: 0.6; cursor: wait; }
.video-name { font-weight: 600; color: var(--dew-text-heading); }
.video-size { color: var(--dew-text-faint); }

/* footer：左=布置与提交进度，右=动作（无分割线） */
.mtg-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; width: 100%;
}
.mtg-stats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.stat {
  font-size: 12px; color: var(--dew-text-muted); white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.stat.warn { color: var(--color-warning); font-weight: 650; }
.stat.ok { color: var(--color-success); }
.stat.late { color: var(--color-danger); font-weight: 650; }
.mtg-stats .dot {
  width: 3px; height: 3px; border-radius: 50%; flex: none;
  background: var(--dew-text-faint); opacity: 0.6;
}
.mtg-prog {
  position: relative; width: 90px; height: 5px; flex: none;
  border-radius: 999px; overflow: hidden;
  background: color-mix(in srgb, var(--dew-text-muted) 14%, transparent);
}
.mtg-prog i {
  position: absolute; inset: 0 auto 0 0; border-radius: 999px;
  background: var(--color-primary);
  transition: width 0.4s var(--dew-bounce, ease);
}
.mtg-foot-acts {
  margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  justify-content: flex-end;
}
.mtg-open { font-size: 12px; color: var(--color-primary); opacity: 0.85; }
.mtg-card:hover .mtg-open { opacity: 1; }

/* 创建弹窗·三步流程条（把开会的顺序摆在眼前） */
.flow-steps {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 11px 14px; margin-bottom: 10px; border-radius: 10px;
  background: color-mix(in srgb, var(--dew-text-muted) 6%, transparent);
}
.fstep {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; color: var(--dew-text-faint); font-weight: 600;
}
.fstep i {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 50%; flex: none;
  font-size: 11px; font-style: normal; font-weight: 700;
  border: 1px solid var(--dew-card-border, rgba(148,163,184,.3));
}
.fstep.on { color: var(--dew-text-heading); }
.fstep.on i {
  color: #fff; border-color: transparent;
  background: var(--color-primary);
}
.farrow { font-size: 12px; color: var(--dew-text-faint); }

.cm-form { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); margin: 10px 0 6px; }
.field-req { font-size: 11px; font-weight: 400; color: var(--color-warning); margin-left: 4px; }
.picker-row { display: flex; align-items: center; gap: 10px; }
.picker-hint { font-size: 12px; color: var(--dew-text-faint); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px;
  border-radius: 999px; font-size: 12px; color: var(--dew-text-muted);
  border: 1px solid var(--dew-card-border, rgba(148,163,184,.25));
  max-width: 100%; overflow: hidden;
}
.chip-x {
  border: none; background: none; padding: 0; cursor: pointer; line-height: 1;
  font-size: 14px; color: var(--dew-text-faint);
}
.chip-x:hover { color: var(--color-danger, #e5484d); }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.file-hidden { display: none; }

/* 删除确认弹窗（DewUI，替代 ELP MessageBox） */
.del-form { display: flex; flex-direction: column; gap: 8px; }
.del-line { margin: 0; font-size: 13.5px; font-weight: 600; color: var(--dew-text-heading); line-height: 1.6; }
.del-sub { margin: 0; font-size: 12.5px; color: var(--dew-text-faint); line-height: 1.6; }
.del-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
</style>
