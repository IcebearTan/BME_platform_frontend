<template>
  <!-- 组会纪要（2026-09-17：培训组/项目组通用留档）。两种挂载：
       培训组 = 营期工作台 tab（unitId 缺省，后端按营内身份解析「我的导生组」）；
       项目组 = ProjectBoard 内嵌（unitId 指定项目单元）。
       组长（导生）/负责人可提交编辑，组员只读；结营（archived）后整体只读。 -->
  <div class="camp-meetings">
    <div v-if="loading" class="cm-loading">
      <DewSkeleton variant="rect" width="100%" height="120" rounded="8px" />
    </div>

    <!-- 培训组未编组：空态分流（不报错） -->
    <DewCard v-else-if="!group" variant="flat" class="cm-empty">
      <div class="empty-text">尚未分配导生——编组后组会纪要会显示在这里。</div>
    </DewCard>

    <template v-else>
      <div class="cm-head">
        <span class="cm-head-meta">
          {{ isUnit
            ? `共 ${meetings.length} 次组会`
            : `导生组 · 组长 ${group.mentor_name} · 组员 ${group.member_count} 人 · 共 ${meetings.length} 次` }}
        </span>
        <DewButton v-if="isLeader && writable" type="glass" size="sm" class="cm-add"
                   @click="openCreate">记录组会</DewButton>
      </div>

      <div v-if="!meetings.length" class="cm-none">
        {{ isLeader ? '还没有组会记录——开完会在这里留下纪要、文件或录像。' : '还没有组会记录' }}
      </div>

      <div v-else class="cm-list">
        <div v-for="m in meetings" :key="m.id" class="mtg-card">
          <div class="mtg-head">
            <span class="mtg-title">{{ m.title }}</span>
            <span class="mtg-date">{{ m.meeting_date }}</span>
            <span class="mtg-by">{{ m.creator_name }} 记录</span>
            <template v-if="isLeader && writable">
              <DewButton type="ghost" size="sm" @click="openEdit(m)">编辑</DewButton>
              <DewButton type="ghost" size="sm" @click="delMeeting(m)">删除</DewButton>
            </template>
          </div>
          <p v-if="m.content" class="mtg-content">{{ m.content }}</p>
          <div v-if="m.attachments.length" class="mtg-atts">
            <template v-for="a in m.attachments" :key="a.id">
              <!-- 视频先签后播：<video> 带不了 Authorization 头，点击时换短签直连 -->
              <div v-if="a.is_video" class="mtg-video">
                <video v-if="videoSrcs[a.id]" :src="videoSrcs[a.id]" controls
                       preload="metadata" playsinline></video>
                <button v-else type="button" class="video-shell"
                        :disabled="videoLoading === a.id" @click="playVideo(a)">
                  <el-icon><VideoPlay /></el-icon>
                  <span class="video-name">{{ a.filename }}</span>
                  <span class="video-size">{{ fmtSize(a.size) }} · 点击播放</span>
                </button>
              </div>
              <button v-else type="button" class="att-link" @click="downloadAtt(a)">
                {{ a.filename }}（{{ fmtSize(a.size) }}）
              </button>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- 记录 / 编辑组会 -->
    <DewDialog v-model="dlg" :title="editing ? '编辑组会纪要' : '记录组会'" width="560px">
      <div class="cm-form">
        <div class="field-label">会议主题 <span class="field-req">必填</span></div>
        <DewInput v-model="form.title" size="lg" placeholder="如：第一周组会 · 方向讨论" />
        <div class="field-label">会议日期 <span class="field-req">必填</span></div>
        <DewInput v-model="form.meeting_date" type="date" />
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
        <template v-if="editing">
          <div class="field-label">已传附件 <span class="picker-hint">点 × 删除</span></div>
          <div v-if="existingAtts.length" class="chips">
            <span v-for="a in existingAtts" :key="a.id" class="chip">
              {{ a.filename }}{{ a.is_video ? ' · 视频' : '' }}
              <button type="button" class="chip-x" @click="removeExisting(a)">×</button>
            </span>
          </div>
          <div v-else class="picker-hint">无（保存后可在编辑时补传）</div>
        </template>
        <div class="form-actions">
          <DewButton type="ghost" @click="dlg = false">取消</DewButton>
          <DewButton type="glass" :loading="saving" :disabled="!canSubmit" @click="save">
            {{ editing ? '保存修改' : '提交纪要' }}
          </DewButton>
        </div>
      </div>
    </DewDialog>

    <input ref="fileInput" type="file" multiple class="file-hidden" @change="onFilesPicked" />
    <input ref="videoInput" type="file" accept="video/*" class="file-hidden" @change="onFilesPicked" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { VideoPlay } from '@element-plus/icons-vue';
import { DewCard, DewButton, DewInput, DewDialog, DewSkeleton } from '@bme/dew-ui';
import { campService, todayLocal } from '../../services/campService';

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
    ElMessage.error(e.response?.data?.message || '加载组会纪要失败');
  } finally { loading.value = false; }
}
watch(() => [props.sid, props.unitId], load, { immediate: true });

// ── 记录 / 编辑（组长·负责人）──
const dlg = ref(false);
const editing = ref(null);       // 编辑中的组会行（null=新建）
const form = ref({ title: '', meeting_date: '', content: '', files: [] });
const existingAtts = ref([]);    // 编辑时的已传附件（可就地删）
const saving = ref(false);
const canSubmit = computed(() => !!(form.value.title.trim() && form.value.meeting_date
  && (form.value.content.trim() || form.value.files.length || existingAtts.value.length)));
function openCreate() {
  editing.value = null;
  form.value = { title: '', meeting_date: todayLocal(), content: '', files: [] };
  existingAtts.value = [];
  dlg.value = true;
}
function openEdit(m) {
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
    const payload = {
      title: form.value.title.trim(),
      meeting_date: form.value.meeting_date,
      content: form.value.content.trim(),
      files: form.value.files,
    };
    const r = editing.value
      ? await campService.updateMeeting(editing.value.id, payload)
      : isUnit.value
        ? await campService.createUnitMeeting(props.unitId, payload)
        : await campService.createTeamMeeting(props.sid, payload);
    ElMessage.success(r.message || '组会纪要已保存');
    dlg.value = false;
    load();
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

function delMeeting(m) {
  ElMessageBox.confirm(`删除「${m.title}」（${m.meeting_date}）？附件与录像一并删除。`, '删除组会纪要', {
    confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning',
  }).then(async () => {
    try {
      await campService.deleteMeeting(m.id);
      ElMessage.success('已删除');
      load();
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '删除失败');
    }
  }).catch(() => {});
}

const fmtSize = (n) => {
  if (n == null) return '';
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;
};
</script>

<style scoped>
.camp-meetings { display: flex; flex-direction: column; gap: 12px; }
.cm-loading { padding: 4px 0; }
.cm-empty { padding: 26px 0; }
.empty-text { font-size: 13px; color: var(--dew-text-faint); text-align: center; }

.cm-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cm-head-meta { font-size: 12.5px; color: var(--dew-text-muted); }
.cm-add { margin-left: auto; }
.cm-none { font-size: 12.5px; color: var(--dew-text-faint); padding: 6px 2px; }

.cm-list { display: flex; flex-direction: column; gap: 10px; }
.mtg-card {
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 14px; border-radius: 12px;
  background: var(--dew-card-bg, rgba(148,163,184,.06));
  border: 1px solid var(--dew-card-border, transparent);
}
.mtg-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mtg-title { font-size: 13.5px; font-weight: 650; color: var(--dew-text-heading); }
.mtg-date { font-size: 12.5px; color: var(--dew-text-muted); }
.mtg-by { font-size: 12px; color: var(--dew-text-faint); }
.mtg-head .dew-button:first-of-type { margin-left: auto; }
.mtg-content {
  margin: 0; font-size: 13px; line-height: 1.7; color: var(--dew-text-text, var(--dew-text-heading));
  white-space: pre-wrap; word-break: break-word;
}

.mtg-atts { display: flex; flex-direction: column; gap: 8px; }
.att-link {
  align-self: flex-start; border: none; background: none; padding: 0; cursor: pointer;
  font-size: 12.5px; color: var(--color-primary); text-decoration: none;
  transition: opacity 0.2s ease;
}
.att-link:hover { opacity: 0.78; }

/* 视频：签名前=虚线占位（点播放换直连），签名后=原生 <video>（Range 206 拖进度条） */
.mtg-video video {
  width: 100%; max-height: 420px; border-radius: 10px; display: block;
  background: rgba(0, 0, 0, 0.9);
}
.video-shell {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 10px 14px; border-radius: 10px; cursor: pointer;
  border: 1px dashed var(--dew-card-border, rgba(148,163,184,.25));
  background: transparent; color: var(--dew-text-muted); font-size: 12.5px;
  transition: transform 0.25s var(--dew-bounce, ease), color 0.2s ease;
}
.video-shell:hover:not(:disabled) { transform: translateY(-1px); color: var(--dew-text-heading); }
.video-shell:disabled { opacity: 0.6; cursor: wait; }
.video-name { font-weight: 600; color: var(--dew-text-heading); }
.video-size { color: var(--dew-text-faint); }

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
</style>
