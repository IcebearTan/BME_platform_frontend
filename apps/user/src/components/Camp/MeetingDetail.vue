<template>
  <!-- 组会详情（2026-09-17 教学单元；09-18 生命周期化）：一次组会 = 发起 → 布置（课内章节+课外任务）
       → 会后提交纪要。视角分流：导生 = 纪要（提交/编辑）+ 布置编辑 + 审阅矩阵（提交明细 /
       章节认证 / 一键打包）；组员 = 纪要 + 我的任务（提交/修改）+ 我的章节认证态。公共外壳，角色子区。 -->
  <DewDialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
             :title="`组会 · ${detail?.meeting?.title || ''}`" width="min(920px, 96vw)"
             :close-on-click-modal="!submitDlg" :close-on-press-escape="!submitDlg">
    <div v-if="loading" class="md-loading">
      <DewSkeleton variant="rect" width="100%" height="160" rounded="8px" />
    </div>
    <div v-else-if="!detail" class="md-none">组会不存在或已被删除。</div>
    <div v-else class="meeting-detail">

      <!-- ① 纪要（双视角共用；附件直链：纪要走点击换签，任务附件为回包内嵌短签）。
           生命周期第 3 步：未归档=占位提示（导生可就地提交），归档后=正文+附件 -->
      <section class="md-sec">
        <div class="md-sec-head">
          <span class="md-sec-title">纪要</span>
          <span class="md-sec-meta">{{ detail.meeting.meeting_date }} · {{ detail.meeting.creator_name }} 记录</span>
          <DewButton v-if="isLeader && writable" type="ghost" size="sm" class="md-sec-act"
                     @click="$emit('edit', detail.meeting)">{{ hasMinutes ? '编辑纪要' : '提交纪要' }}</DewButton>
        </div>
        <template v-if="hasMinutes">
          <p v-if="detail.meeting.content" class="md-content">{{ detail.meeting.content }}</p>
          <div v-if="detail.meeting.attachments.length" class="md-atts">
            <template v-for="a in detail.meeting.attachments" :key="a.id">
              <div v-if="a.is_video" class="md-video">
                <video v-if="videoSrcs[a.id]" :src="videoSrcs[a.id]" controls preload="metadata" playsinline></video>
                <button v-else type="button" class="video-shell" @click="playVideo(a)">
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
        </template>
        <div v-else class="minutes-pending">
          {{ isLeader
            ? '纪要待提交——开完会后在此归档文字、会议文件与录像。'
            : '纪要尚未归档，会后由组长提交。' }}
        </div>
      </section>

      <!-- ② 布置（导生·只读概览）：编辑走独立「布置」弹窗（emit assign，父层关详情再开，不叠窗） -->
      <section v-if="isLeader" class="md-sec">
        <div class="md-sec-head">
          <span class="md-sec-title">布置</span>
          <DewButton v-if="writable" type="ghost" size="sm" class="md-sec-act"
                     @click="$emit('assign', detail.meeting)">编辑布置</DewButton>
        </div>
        <div v-if="!detail.tasks.length && !detail.chapters.length" class="md-none">
          本期未布置任务。
        </div>
        <div v-for="t in detail.tasks" :key="t.id" class="task-line">
          <DewTag size="sm" round>{{ t.submit_type_text }}</DewTag>
          <span class="task-title">{{ t.title }}</span>
          <span v-if="t.note" class="task-note">{{ t.note }}</span>
          <span class="task-stat">已交 {{ t.submission_count }}/{{ detail.students.length }}</span>
        </div>
        <div v-if="detail.chapters.length" class="chapter-line">
          <span class="chapter-label">课内</span>
          <span v-for="c in detail.chapters" :key="c.chapter_id" class="chapter-item">
            {{ c.chapter_title }}<i class="sep">·</i>{{ c.certified_count }}/{{ detail.students.length }} 认证
          </span>
        </div>
      </section>

      <!-- ③ 我的任务（组员；待办条直达锚点） -->
      <section v-if="!isLeader" ref="tasksSection" class="md-sec">
        <div class="md-sec-head">
          <span class="md-sec-title">我的任务</span>
          <span class="md-sec-meta">{{ myPending ? `待提交 ${myPending}` : '全部完成' }}</span>
        </div>
        <div v-if="!detail.tasks.length" class="md-none">本次组会没有布置任务。</div>
        <div v-for="t in detail.tasks" :key="t.id" class="my-task">
          <div class="task-line">
            <DewTag size="sm" round>{{ t.submit_type_text }}</DewTag>
            <span class="task-title">{{ t.title }}</span>
            <span v-if="t.due_at" class="task-due" :class="{ late: t.my_overdue }">
              截止 {{ dueText(t.due_at) }}
            </span>
            <DewBadge :type="myState(t).type">{{ myState(t).label }}</DewBadge>
            <DewButton v-if="writable" type="ghost" size="sm" class="md-sec-act"
                       @click="openSubmit(t)">{{
                         t.my_submission?.status === 'returned' ? '重新提交'
                           : t.my_submission ? '修改' : '提交' }}</DewButton>
          </div>
          <p v-if="t.note" class="task-note-line">{{ t.note }}</p>
          <div v-if="t.my_submission?.status === 'returned' && t.my_submission.review_comment"
               class="returned-note">
            退回原因：{{ t.my_submission.review_comment }}
          </div>
          <div v-else-if="t.my_submission?.status === 'accepted' && t.my_submission.review_comment"
               class="accepted-note">
            评语：{{ t.my_submission.review_comment }}
          </div>
          <p v-if="t.my_submission?.content" class="my-content">{{ t.my_submission.content }}</p>
          <div v-if="t.my_submission?.attachments?.length" class="chips">
            <span v-for="a in t.my_submission.attachments" :key="a.id" class="chip">
              <a :href="assetUrl(a.url)" target="_blank" class="chip-link">{{ a.filename }}</a>
              <button v-if="writable" type="button" class="chip-x"
                      @click="removeTaskAtt(t, a)">×</button>
            </span>
          </div>
        </div>
        <div v-if="detail.chapters.length" class="chapter-line">
          <span class="chapter-label">课内</span>
          <span v-for="c in detail.chapters" :key="c.chapter_id" class="chapter-item">
            {{ c.chapter_title }}
            <i class="cert" :class="{ ok: c.my_cert }">{{ c.my_cert
              ? `已认证${c.my_cert.score != null ? ` ${c.my_cert.score} 分` : ''}` : '未认证' }}</i>
          </span>
        </div>
      </section>

      <!-- ④ 审阅（导生：任务提交矩阵 + 章节认证矩阵 + 一键打包） -->
      <section v-if="isLeader && (detail.tasks.length || detail.chapters.length)" class="md-sec">
        <div class="md-sec-head">
          <span class="md-sec-title">审阅</span>
          <DewButton v-if="detail.tasks.length" type="ghost" size="sm" class="md-sec-act"
                     :loading="zipLoading" @click="downloadZip">打包下载全部提交</DewButton>
        </div>

        <template v-if="detail.tasks.length">
          <div class="field-label">任务提交（点成员名看明细）</div>
          <div class="matrix-wrap">
            <table class="matrix">
              <thead>
                <tr>
                  <th class="m-name">成员</th>
                  <th v-for="t in detail.tasks" :key="t.id" :title="t.title">{{ t.title }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in detail.students" :key="s.user_id"
                    :class="{ open: openStudent === s.user_id }">
                  <th class="m-name" @click="openStudent = openStudent === s.user_id ? null : s.user_id">
                    {{ s.username }}
                  </th>
                  <td v-for="t in detail.tasks" :key="t.id"
                      :class="cellClass(t, s)">{{ cellText(t, s) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- 成员提交明细（点成员名展开；有效提交可就地审阅：通过/退回带评语） -->
          <div v-if="openStudent != null" class="student-panel">
            <div class="panel-name">{{ openStudentName }} 的提交</div>
            <div v-for="t in detail.tasks" :key="t.id" class="panel-task">
              <div class="panel-task-head">
                <span class="panel-task-name">{{ t.title }}</span>
                <template v-if="writable && subOf(t, openStudent)?.valid">
                  <DewBadge :type="reviewBadgeType(subOf(t, openStudent))">
                    {{ reviewBadgeText(subOf(t, openStudent)) }}
                  </DewBadge>
                  <DewButton size="sm" type="ghost" class="panel-review"
                             @click="reviewTask(t, openStudent, true)">通过</DewButton>
                  <DewButton size="sm" type="ghost" class="panel-review"
                             @click="reviewTask(t, openStudent, false)">退回</DewButton>
                </template>
              </div>
              <p v-if="subOf(t, openStudent)?.content" class="my-content">{{ subOf(t, openStudent).content }}</p>
              <div v-if="subOf(t, openStudent)?.attachments?.length" class="panel-atts">
                <a v-for="a in subOf(t, openStudent).attachments" :key="a.id"
                   :href="assetUrl(a.url)" target="_blank" class="att-link">
                  {{ a.filename }}（{{ fmtSize(a.size) }}）
                </a>
              </div>
              <div v-if="subOf(t, openStudent)?.review_comment" class="panel-review-note">
                {{ subOf(t, openStudent).status === 'returned' ? '退回原因' : '评语' }}：{{ subOf(t, openStudent).review_comment }}
              </div>
              <div v-if="!subOf(t, openStudent)" class="md-none">未提交</div>
            </div>
          </div>
        </template>

        <template v-if="detail.chapters.length">
          <div class="field-label">章节认证（点格子认证 / 改分 / 撤销）</div>
          <div class="matrix-wrap">
            <table class="matrix">
              <thead>
                <tr>
                  <th class="m-name">成员</th>
                  <th v-for="c in detail.chapters" :key="c.chapter_id"
                      :title="`${c.course_title} · ${c.chapter_title}`">{{ c.chapter_title }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in detail.students" :key="s.user_id">
                  <th class="m-name">{{ s.username }}</th>
                  <td v-for="c in detail.chapters" :key="c.chapter_id"
                      :class="['cert-cell', { ok: !!c.certs[String(s.user_id)] }]"
                      @click="certCell(c, s)">
                    {{ c.certs[String(s.user_id)]
                       ? (c.certs[String(s.user_id)].score != null
                           ? `${c.certs[String(s.user_id)].score} 分` : '已认证')
                       : '未认证' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>
    </div>

    <!-- 组员提交/修改任务（嵌套弹窗：打开时外层弹窗暂闭遮罩点击与 Esc） -->
    <DewDialog v-model="submitDlg" :title="`提交任务 · ${submitTask?.title || ''}`" width="520px">
      <div class="submit-form">
        <div class="submit-req">{{ submitTask?.note || `要求：${submitTask?.submit_type_text || ''}` }}</div>
        <div class="field-label">文字内容</div>
        <DewInput v-model="submitForm.content" type="textarea" :rows="4"
                  placeholder="任务的文字部分（按要求填写）" />
        <div class="field-label">文件</div>
        <div class="picker-row">
          <DewButton type="ghost" size="sm" :disabled="!writable" @click="fileInput?.click()">选择文件</DewButton>
          <span class="picker-hint">可多选，单个不超过 100MB</span>
        </div>
        <div v-if="submitForm.files.length" class="chips">
          <span v-for="(f, i) in submitForm.files" :key="f.name + i" class="chip">
            {{ f.name }}（{{ fmtSize(f.size) }}）
            <button type="button" class="chip-x" @click="submitForm.files.splice(i, 1)">×</button>
          </span>
        </div>
        <div class="form-actions">
          <DewButton type="ghost" @click="submitDlg = false">取消</DewButton>
          <DewButton type="glass" :loading="submitting" :disabled="!canSubmitTask" @click="doSubmit">
            {{ submitTask?.my_submission ? '保存修改' : '提交' }}
          </DewButton>
        </div>
      </div>
    </DewDialog>
    <!-- 章节认证（09-19 抽共享 ChapterCertDialog，与学员进度看板同款交互） -->
    <ChapterCertDialog v-model="certDlg" :sid="sid"
                       :student="certTarget?.student" :chapter="certTarget?.chapter"
                       :cert="certTarget?.cur" :readonly="!writable" @done="load" />

    <input ref="fileInput" type="file" multiple class="file-hidden" @change="onFilesPicked" />
  </DewDialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { VideoPlay } from '@element-plus/icons-vue';
import { DewDialog, DewButton, DewInput, DewTag, DewBadge, DewSkeleton } from '@bme/dew-ui';
import { campService, assetUrl } from '../../services/campService';
import ChapterCertDialog from './ChapterCertDialog.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sid: { type: Number, required: true },
  meetingId: { type: Number, default: null },
  campStatus: { type: String, default: null },    // archived 时整体只读
  focusTasks: { type: Boolean, default: false },  // 待办条直达「我的任务」区
});
const emit = defineEmits(['update:modelValue', 'changed', 'edit', 'assign']);

const writable = computed(() => props.campStatus !== 'archived');
const loading = ref(false);
const detail = ref(null);
const isLeader = computed(() => !!detail.value?.is_leader);
const hasMinutes = computed(() =>          // 已完结=有纪要（文字或附件），与列表 statusOf 同口径
  !!(detail.value?.meeting?.content || '').trim() || !!(detail.value?.meeting?.attachments || []).length);
const tasksSection = ref(null);

async function load() {
  if (!props.meetingId) return;
  loading.value = true;
  try {
    detail.value = await campService.fetchMeetingDetail(props.meetingId);
  } catch (e) {
    detail.value = null;
    ElMessage.error(e.response?.data?.message || '加载组会详情失败');
  } finally { loading.value = false; }
}
watch(() => [props.modelValue, props.meetingId], async ([open]) => {
  if (open) {
    openStudent.value = null;
    await load();
    // 待办条进来滚动到我的任务区
    if (props.focusTasks && tasksSection.value) {
      nextTick(() => tasksSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }
});

const fmtSize = (n) => {
  if (n == null) return '';
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;
};

// ── 纪要附件媒体（点击换签；任务附件用回包内嵌短签直链，无需换签）──
const videoSrcs = ref({});
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
    window.open(await campService.fetchMeetingAttachmentUrl(a.id), '_blank');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '下载失败');
  }
}

// ── 布置编辑：已独立为 MeetingAssign 弹窗（09-18），详情只读概览 + emit assign ──

// ── 我的任务（组员）──
const myPending = computed(() => (detail.value?.tasks || [])
  .filter((t) => !t.my_submission?.valid).length);
// 审阅态徽标（migrate_44）：未交/逾期 → 已退回（附原因）→ 待审阅 → 已通过（附评语）
function myState(t) {
  const s = t.my_submission;
  if (!s) return t.my_overdue
    ? { label: '已逾期', type: 'danger' } : { label: '未提交', type: 'warning' };
  if (s.status === 'accepted') return { label: '已通过', type: 'success' };
  if (s.status === 'returned') return { label: '已退回', type: 'danger' };
  return s.valid ? { label: '待审阅', type: 'info' } : { label: '未达标', type: 'danger' };
}
const dueText = (iso) => iso.slice(5, 16).replace('T', ' ');
const submitDlg = ref(false);
const submitTask = ref(null);
const submitForm = ref({ content: '', files: [] });
const submitting = ref(false);
const fileInput = ref(null);
const canSubmitTask = computed(() => !!submitForm.value.files.length || !!submitForm.value.content.trim());
function openSubmit(t) {
  submitTask.value = t;
  submitForm.value = { content: t.my_submission?.content || '', files: [] };
  submitDlg.value = true;
}
function onFilesPicked(e) {
  const input = e.target;
  for (const f of input.files || []) submitForm.value.files.push(f);
  input.value = '';
}
async function doSubmit() {
  if (submitting.value || !canSubmitTask.value || !submitTask.value) return;
  for (const f of submitForm.value.files) {
    if (f.size / 1024 / 1024 > 100) { ElMessage.error(`${f.name} 超过 100MB 上限`); return; }
  }
  submitting.value = true;
  try {
    const r = await campService.submitMeetingTask(
      submitTask.value.id, submitForm.value.content.trim(), submitForm.value.files);
    submitTask.value.my_submission = r.my_submission;
    submitDlg.value = false;
    ElMessage.success(r.message || '已提交');
    emit('changed');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败');
  } finally { submitting.value = false; }
}
async function removeTaskAtt(t, a) {
  try {
    await campService.deleteMeetingTaskAttachment(a.id);
    t.my_submission.attachments = t.my_submission.attachments.filter((x) => x.id !== a.id);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除附件失败');
  }
}

// ── 审阅矩阵（导生）──
const openStudent = ref(null);
const openStudentName = computed(() =>
  (detail.value?.students || []).find((s) => s.user_id === openStudent.value)?.username || '');
function subOf(task, uid) {
  return task.submissions?.[String(uid)] || null;
}
function cellText(t, s) {
  const sub = subOf(t, s.user_id);
  if (!sub) return '未交';
  if (sub.status === 'accepted') return '已通过';
  if (sub.status === 'returned') return '已退回';
  const n = sub.attachments.length;
  if (!sub.valid) return `未达标（${n} 文件）`;
  return n ? `${n} 文件·待审` : '文字·待审';
}
function cellClass(t, s) {
  const sub = subOf(t, s.user_id);
  return ['task-cell', { ok: sub?.valid, miss: !sub, bad: sub && !sub.valid }];
}
// 审阅（migrate_44 生命周期）：通过/退回带评语，退回后学员重交重新待审
const reviewBadgeType = (sub) => (sub.status === 'accepted' ? 'success'
  : sub.status === 'returned' ? 'danger' : 'info');
const reviewBadgeText = (sub) => ({ accepted: '已通过', returned: '已退回', submitted: '待审阅' }[sub.status] || sub.status);
async function reviewTask(t, uid, accept) {
  let comment = '';
  try {
    const { value } = await ElMessageBox.prompt(
      accept ? `可填写评语（将通知该组员）` : `可填写退回原因（将通知该组员重新提交）`,
      accept ? `通过 · ${t.title}` : `退回 · ${t.title}`,
      { confirmButtonText: accept ? '通过' : '退回', cancelButtonText: '取消',
        type: accept ? 'success' : 'warning', inputPlaceholder: accept ? '评语（可选）' : '退回原因（建议填写）' });
    comment = value || '';
  } catch { return; }
  try {
    await campService.reviewMeetingTask(t.id, uid, accept, comment);
    ElMessage.success(accept ? '已通过' : '已退回');
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '审阅失败');
  }
}
async function downloadZip() {
  if (zipLoading.value) return;
  zipLoading.value = true;
  try {
    window.open(await campService.fetchMeetingZipUrl(props.meetingId), '_blank');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '打包下载失败');
  } finally { zipLoading.value = false; }
}
const zipLoading = ref(false);

// 章节认证格子：点开共享 ChapterCertDialog（09-19 抽出，与学员进度看板同款；
// 写端点同一个 team/progress/certify，行为不变）
const certDlg = ref(false);
const certTarget = ref(null);     // { chapter, student, cur }
function certCell(c, s) {
  if (!writable.value) return;
  certTarget.value = { chapter: c, student: s, cur: c.certs[String(s.user_id)] || null };
  certDlg.value = true;
}
</script>

<style scoped>
.md-loading { padding: 4px 0; }
.md-none { font-size: 12.5px; color: var(--dew-text-faint); padding: 4px 0; }

.meeting-detail { display: flex; flex-direction: column; gap: 18px; }
.md-sec { display: flex; flex-direction: column; gap: 8px; }
.md-sec-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.md-sec-title { font-size: 14px; font-weight: 700; color: var(--dew-text-heading); }
.md-sec-meta { font-size: 12px; color: var(--dew-text-faint); }
.md-sec-act { margin-left: auto; }
.md-content {
  margin: 0; font-size: 13px; line-height: 1.75; color: var(--dew-text-text, var(--dew-text-heading));
  white-space: pre-wrap; word-break: break-word;
}
.md-atts { display: flex; flex-direction: column; gap: 8px; }
.att-link {
  align-self: flex-start; border: none; background: none; padding: 0; cursor: pointer;
  font-size: 12.5px; color: var(--color-primary); text-decoration: none;
}
a.att-link { align-self: flex-start; }
.att-link:hover { opacity: 0.78; }
.md-video video { width: 100%; max-height: 420px; border-radius: 10px; display: block; background: rgba(0, 0, 0, 0.9); }
.video-shell {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 10px 14px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--dew-card-border, rgba(148,163,184,.25));
  background: transparent; color: var(--dew-text-muted); font-size: 12.5px;
  transition: transform 0.25s var(--dew-bounce, ease), color 0.2s ease;
}
.video-shell:hover { transform: translateY(-1px); color: var(--dew-text-heading); }
.video-name { font-weight: 600; color: var(--dew-text-heading); }
.video-size { color: var(--dew-text-faint); }

/* 布置区 */
.task-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 2px 0; }
.task-title { font-size: 13.5px; font-weight: 600; color: var(--dew-text-heading); }
.task-note { font-size: 12.5px; color: var(--dew-text-muted); }
.task-note-line { margin: 2px 0 0; font-size: 12.5px; color: var(--dew-text-muted); }
.task-due { font-size: 12px; color: var(--dew-text-faint); }
.task-due.late { color: var(--color-danger); font-weight: 600; }
.returned-note, .accepted-note {
  font-size: 12.5px; line-height: 1.6; padding: 6px 10px; border-radius: 8px; margin: 2px 0 0;
}
.returned-note { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 8%, transparent); }
.accepted-note { color: var(--color-success); background: color-mix(in srgb, var(--color-success) 8%, transparent); }
.task-stat { margin-left: auto; font-size: 12px; color: var(--dew-text-faint); }
.chapter-line { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; font-size: 12.5px; }
.chapter-label { color: var(--dew-text-faint); }
.chapter-item { color: var(--dew-text-muted); }
.chapter-item .sep { color: var(--dew-text-faint); font-style: normal; margin: 0 4px; }
.chapter-item .cert { font-style: normal; font-size: 12px; }
.chapter-item .cert.ok { color: var(--color-success); }
.chapter-item .cert:not(.ok) { color: var(--dew-text-faint); }

/* 纪要未归档（进行中）：占位提示，会后由组长提交 */
.minutes-pending {
  font-size: 12.5px; color: var(--dew-text-faint); line-height: 1.7;
  padding: 2px 0;
}
.field-label { font-size: 12.5px; font-weight: 600; color: var(--dew-text-muted); margin-top: 4px; }

/* 我的任务（无分割线，靠间距分组） */
.my-task { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; }
.my-content {
  margin: 0; font-size: 13px; line-height: 1.7; color: var(--dew-text-text, var(--dew-text-heading));
  white-space: pre-wrap; word-break: break-word;
  padding: 8px 12px; border-radius: 8px;
  background: color-mix(in srgb, var(--dew-text-muted) 6%, transparent);
}
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px;
  border-radius: 999px; font-size: 12px; color: var(--dew-text-muted);
  border: 1px solid var(--dew-card-border, rgba(148,163,184,.25));
}
.chip-link { color: var(--color-primary); text-decoration: none; }
.chip-link:hover { opacity: 0.78; }
.chip-x {
  border: none; background: none; padding: 0; cursor: pointer; line-height: 1;
  font-size: 14px; color: var(--dew-text-faint);
}
.chip-x:hover { color: var(--color-danger, #e5484d); }

/* 审阅矩阵 */
.matrix-wrap { overflow-x: auto; }
.matrix { border-collapse: collapse; width: 100%; font-size: 12.5px; }
.matrix th, .matrix td {
  border: 1px solid var(--dew-card-border, rgba(148,163,184,.2));
  padding: 6px 10px; text-align: left; white-space: nowrap;
}
.matrix thead th {
  font-weight: 650; color: var(--dew-text-heading);
  background: color-mix(in srgb, var(--dew-text-muted) 6%, transparent);
  max-width: 160px; overflow: hidden; text-overflow: ellipsis;
}
.matrix .m-name { font-weight: 650; color: var(--dew-text-heading); cursor: pointer; }
.matrix tr.open .m-name { color: var(--color-primary); }
.task-cell { color: var(--dew-text-muted); }
.task-cell.ok { color: var(--color-success); font-weight: 600; }
.task-cell.miss { color: var(--dew-text-faint); }
.task-cell.bad { color: var(--color-warning); }
.cert-cell { cursor: pointer; color: var(--dew-text-faint); }
.cert-cell.ok { color: var(--color-success); font-weight: 600; }
.cert-cell:not(.ok):hover { color: var(--color-primary); }
.cert-cell.ok:hover { color: var(--color-warning); }

.student-panel {
  display: flex; flex-direction: column; gap: 10px; padding: 12px;
  border-radius: 10px; background: color-mix(in srgb, var(--dew-text-muted) 6%, transparent);
}
.panel-name { font-size: 13px; font-weight: 700; color: var(--dew-text-heading); }
.panel-task { display: flex; flex-direction: column; gap: 6px; }
.panel-task-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.panel-task-name { font-size: 12.5px; font-weight: 600; color: var(--dew-text-muted); }
.panel-review { padding: 2px 10px; }
.panel-review-note { font-size: 12px; color: var(--dew-text-faint); }
.panel-atts { display: flex; flex-direction: column; gap: 4px; }

/* 提交弹窗 */
.submit-form { display: flex; flex-direction: column; gap: 4px; }
.submit-req {
  font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6; margin-bottom: 4px;
  padding: 8px 12px; border-radius: 8px;
  background: color-mix(in srgb, var(--dew-text-muted) 6%, transparent);
}
.picker-row { display: flex; align-items: center; gap: 10px; }
.picker-hint { font-size: 12px; color: var(--dew-text-faint); }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.file-hidden { display: none; }
</style>
