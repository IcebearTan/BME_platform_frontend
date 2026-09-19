<template>
  <!-- 导生「学员进度」看板（09-19 重构：折叠列表 → 学员×章节认证矩阵）。
       行=学员（冻结列），列=方向课程章节（两层表头：课程/章节+每课汇总列），尾列=组会任务。
       点格子=按章认证（共享 ChapterCertDialog，与组会审阅同款）；材料角标=学员×章材料弹层；
       任务列点击跳组会 tab。数据 team/progress + task-summary，09-19 后端已消 N+1。 -->
  <div class="mentor-members">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header>
        <div class="mm-head">
          <h3>学员进度<span v-if="progress.direction" class="dir-chip">{{ progress.direction }}</span></h3>
          <span v-if="taskTotal" class="mm-task" :title="pendingTitle">
            组会任务 全组 {{ taskDoneTotal }}/{{ taskTotal * (progress.students?.length || 0) }} 已交
            <template v-if="pendingNames.length"> · 未交 {{ pendingNames.length }} 人</template>
            <template v-else> · 全部完成</template>
          </span>
        </div>
      </template>

      <div v-if="!progress.direction || !progress.courses?.length" class="empty">
        {{ progress.message || '尚未设置方向（或方向未绑定课程）——先在「选导生」页完善名片的方向选择。' }}
      </div>
      <div v-else-if="!progress.students?.length" class="empty">本团队暂无学员</div>

      <div v-else class="board-wrap">
        <table class="board">
          <thead>
            <tr class="h-course">
              <th class="c-name corner" rowspan="2">学员</th>
              <th v-for="c in headerCourses" :key="c.course_id"
                  class="h-course-title" :colspan="c.chapters.length + 1">{{ c.course_title }}</th>
              <th class="h-task" rowspan="2">任务</th>
            </tr>
            <tr class="h-ch">
              <template v-for="c in headerCourses" :key="c.course_id">
                <th v-for="ch in c.chapters" :key="ch.chapter_id" class="h-ch-name" :title="ch.name">
                  {{ ch.name }}
                </th>
                <th class="h-sum">汇总</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in progress.students" :key="s.student_user_id">
              <th class="c-name">{{ s.username }}</th>
              <template v-for="c in s.courses" :key="c.course_id">
                <td v-for="ch in c.chapters" :key="ch.chapter_id" :data-ch="ch.chapter_id"
                    class="cell" :class="{ ok: ch.certified }" @click="openCert(s, c, ch)">
                  <span v-if="ch.certified" class="val">
                    <el-icon v-if="ch.score == null" class="ok-icon"><Check /></el-icon>
                    <template v-else>{{ ch.score }}</template>
                  </span>
                  <span v-else class="undone" title="未认证">·</span>
                  <button v-if="ch.material_count" type="button" class="mat-dot"
                          :title="`材料 ${ch.material_count}，点击查看`"
                          @click.stop="openMaterials(s, ch)">{{ ch.material_count }}</button>
                </td>
                <td class="sum">
                  <span class="sum-num">{{ c.certified_chapters }}/{{ c.total_chapters }}</span>
                  <span v-if="c.score_avg != null" class="sum-avg">均 {{ c.score_avg }}</span>
                  <span v-if="c.course_status === 'completed'" class="sum-done">完成</span>
                </td>
              </template>
              <td class="c-task">
                <button type="button" v-if="taskTotal"
                        :class="['task-badge', { miss: taskDone(s.student_user_id) < taskTotal }]"
                        title="到「组会任务」查看提交明细"
                        @click="$emit('go-meetings')">
                  {{ taskDone(s.student_user_id) }}/{{ taskTotal }}
                </button>
                <span v-else class="task-none">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="hint">
        点格子按章认证（可评分 0-100）· 全章认证齐后课程自动记完成 · 数字角标为学员提交的材料数
      </div>
    </DewCard>

    <!-- 章节认证（共享弹窗，与组会审阅矩阵同款）：未认证=打分可空；已认证=改分/撤销 -->
    <ChapterCertDialog v-model="certDlg.open" :sid="sid"
                       :student="certDlg.student" :chapter="certDlg.chapter"
                       :cert="certDlg.cert" @done="load" />

    <!-- 章节材料弹层：学员 × 章的材料列表，认证/评分前查看下载 -->
    <DewDialog v-model="matDlg.open" :title="`章节材料 · ${matDlg.studentName} · ${matDlg.chapterName}`" width="560px">
      <div class="mat-list" v-loading="matDlg.loading">
        <div v-if="!matDlg.materials.length && !matDlg.loading" class="mat-empty">该学员本章暂无材料</div>
        <div v-for="m in matDlg.materials" :key="m.id" class="mat-row">
          <div class="mat-main">
            <div v-if="m.content" class="mat-content">{{ m.content }}</div>
            <div v-if="m.attachments?.length" class="mat-atts">
              <button v-for="a in m.attachments" :key="a.id" type="button"
                      class="att-link" @click="downloadAtt(a)">
                {{ a.filename }}{{ a.size ? `（${Math.round(a.size / 1024)}KB）` : '' }}
              </button>
            </div>
            <span class="mat-time">{{ (m.created_at || '').slice(0, 16).replace('T', ' ') }}</span>
          </div>
          <DewButton type="ghost" size="sm" @click="askRemoveMaterial(m)">删除</DewButton>
        </div>
      </div>
    </DewDialog>

    <!-- 删除材料确认（DewUI，替代 ELP MessageBox） -->
    <DewDialog v-model="delDlg.open" title="删除材料" width="440px">
      <div class="del-form">
        <p class="del-line">删除该学员的这条材料？</p>
        <p class="del-sub">材料内容与附件一并删除，不可恢复。</p>
        <div class="del-actions">
          <DewButton type="ghost" @click="delDlg.open = false">取消</DewButton>
          <DewButton type="danger" :loading="delDlg.busy" @click="doRemoveMaterial">删除</DewButton>
        </div>
      </div>
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { DewCard, DewButton, DewDialog } from '@bme/dew-ui';
import { ElMessage } from 'element-plus';
import { Check } from '@element-plus/icons-vue';
import { campService } from '../../services/campService';
import ChapterCertDialog from './ChapterCertDialog.vue';

const props = defineProps({ sid: { type: [Number, String], required: true } });
defineEmits(['go-meetings']);

const progress = ref({});
// 章节表头取首个学员的课程块（后端按 direction.course_ids 同序输出，人人一致）
const headerCourses = computed(() => progress.value.students?.[0]?.courses || []);

// ── 组会任务维度：尾列徽标 + header 摘要（未交名单进 title，不占版面）──
const taskSummary = ref(null);
const taskDone = (uid) => taskSummary.value?.summary?.find((x) => x.user_id === uid)?.submitted ?? 0;
const taskTotal = computed(() => taskSummary.value?.task_total || 0);
const taskDoneTotal = computed(() => (progress.value.students || [])
  .reduce((n, s) => n + taskDone(s.student_user_id), 0));
const pendingNames = computed(() => (progress.value.students || [])
  .filter((s) => taskDone(s.student_user_id) < taskTotal.value)
  .map((s) => s.username));
const pendingTitle = computed(() => {
  if (!pendingNames.value.length) return '全部完成';
  const head = pendingNames.value.slice(0, 5).join('、');
  return `未交：${head}${pendingNames.value.length > 5 ? ' 等' : ''}`;
});

// ── 章节认证（点格子 → 共享弹窗）──
const certDlg = ref({ open: false, student: null, chapter: null, cert: null });
function openCert(student, course, chapter) {
  certDlg.value = {
    open: true,
    student: { user_id: student.student_user_id, username: student.username },
    chapter: { chapter_id: chapter.chapter_id, name: chapter.name, course_title: course.course_title },
    cert: chapter.certified ? { score: chapter.score } : null,
  };
}

// ── 章节材料弹层 ──
const matDlg = ref({
  open: false, loading: false, student: null, chapter: null,
  studentName: '', chapterName: '', materials: [],
});
async function openMaterials(student, chapter) {
  matDlg.value = {
    open: true, loading: true, student, chapter,
    studentName: student.username, chapterName: chapter.name, materials: [],
  };
  try {
    const d = await campService.fetchChapterMaterials(props.sid, {
      student_user_id: student.student_user_id, chapter_id: chapter.chapter_id });
    matDlg.value.materials = d.materials || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载材料失败');
  } finally {
    matDlg.value.loading = false;
  }
}

// 附件下载：先换短签直连再开新窗（裸链带不了 Authorization 头）
async function downloadAtt(a) {
  try {
    const url = await campService.fetchMaterialAttachmentUrl(a.id);
    window.open(url, '_blank');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '下载失败');
  }
}

// ── 删除材料确认（DewDialog）──
const delDlg = ref({ open: false, busy: false, target: null });
function askRemoveMaterial(m) {
  delDlg.value = { open: true, busy: false, target: m };
}
async function doRemoveMaterial() {
  const m = delDlg.value.target;
  if (!m || delDlg.value.busy) return;
  delDlg.value.busy = true;
  try {
    await campService.deleteChapterMaterial(m.id);
    ElMessage.success('已删除');
    delDlg.value.open = false;
    const d = await campService.fetchChapterMaterials(props.sid, {
      student_user_id: matDlg.value.student.student_user_id,
      chapter_id: matDlg.value.chapter.chapter_id });
    matDlg.value.materials = d.materials || [];
    await load();   // 刷新格子材料角标
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  } finally {
    delDlg.value.busy = false;
  }
}

async function load() {
  // 任务汇总静默并行（失败只丢徽标，不阻断认证矩阵）
  campService.fetchTeamTaskSummary(props.sid)
    .then((d) => { taskSummary.value = d; })
    .catch(() => { taskSummary.value = null; });
  try {
    const d = await campService.fetchTeamProgress(props.sid);
    progress.value = d.data || d;
  } catch {
    progress.value = {};
    ElMessage.error('加载团队进度失败');
  }
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.mm-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.mm-head h3 { margin: 0; }
.mm-task { font-size: 12px; color: var(--dew-text-muted); font-variant-numeric: tabular-nums; cursor: default; }
.dir-chip {
  margin-left: 10px; font-size: 12px; font-weight: 600; vertical-align: middle;
  color: var(--color-primary); border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  border-radius: 999px; padding: 2px 10px;
}

/* ── 看板矩阵（样式语言与组会审阅矩阵一致）── */
.board-wrap { overflow-x: auto; }
.board { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 12.5px; }
.board th, .board td { border-bottom: 1px solid var(--dew-card-border); padding: 6px 10px; }
.board td, .board .h-ch-name, .board .h-sum { border-right: 1px solid var(--dew-card-border); }

/* 冻结首列：实色底盖住横向滚动内容（flat token 明暗两态各就位） */
.c-name {
  position: sticky; left: 0; z-index: 2;
  background: var(--dew-card-flat-bg);
  font-size: 13px; font-weight: 650; color: var(--dew-text-heading);
  white-space: nowrap; text-align: left; min-width: 76px;
  border-right: 1px solid var(--dew-card-border);
}
.board thead .c-name { z-index: 4; }

/* 表头两层 */
.h-course-title {
  font-size: 12.5px; font-weight: 650; color: var(--dew-text-heading);
  text-align: center; white-space: nowrap;
  border-right: 1px solid var(--dew-card-border);
  background: color-mix(in srgb, var(--dew-text-muted) 6%, transparent);
}
.h-ch {
  background: color-mix(in srgb, var(--dew-text-muted) 6%, transparent);
}
.h-ch-name {
  font-size: 11.5px; font-weight: 500; color: var(--dew-text-muted);
  max-width: 84px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  text-align: center;
}
.h-sum { font-size: 11.5px; color: var(--dew-text-faint); text-align: center; }
.h-task {
  font-size: 12.5px; font-weight: 650; color: var(--dew-text-heading); text-align: center;
  border-right: none;
}

/* 认证格子 */
.cell {
  position: relative; min-width: 52px; height: 34px; text-align: center;
  cursor: pointer; color: var(--dew-text-faint);
  transition: color 0.15s ease, background 0.15s ease;
}
.cell:hover { color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 7%, transparent); }
.cell .undone { font-size: 14px; opacity: 0.55; }
.cell .val { font-size: 13px; font-weight: 700; color: var(--color-success); font-variant-numeric: tabular-nums; }
.cell .ok-icon { font-size: 13px; color: var(--color-success); vertical-align: -2px; }
/* 材料角标：学员提交的材料数（点开弹层），淡色小号与分数区分 */
.mat-dot {
  position: absolute; top: 2px; right: 3px; line-height: 1;
  font-size: 10px; color: var(--dew-text-faint);
  border: none; background: none; padding: 1px 3px; border-radius: 999px; cursor: pointer;
  background: color-mix(in srgb, var(--dew-text-muted) 10%, transparent);
}
.mat-dot:hover { color: var(--color-primary); }

/* 每课汇总列 */
.sum { min-width: 92px; white-space: nowrap; }
.sum-num { color: var(--dew-text-muted); font-variant-numeric: tabular-nums; }
.sum-avg { margin-left: 6px; color: var(--color-primary); font-weight: 600; font-size: 12px; }
.sum-done { margin-left: 6px; font-size: 11px; font-weight: 600; color: var(--color-success); }

/* 尾列任务徽标（点跳组会 tab） */
.c-task { text-align: center; }
.task-badge {
  font-size: 11.5px; font-weight: 600; color: var(--color-success);
  padding: 2px 9px; border-radius: 999px; cursor: pointer;
  border: none; font-variant-numeric: tabular-nums;
  background: color-mix(in srgb, var(--color-success) 9%, transparent);
  transition: transform 0.2s var(--dew-bounce, ease);
}
.task-badge:hover { transform: translateY(-1px); }
.task-badge.miss {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
}
.task-none { color: var(--dew-text-faint); font-size: 12px; }

/* 材料弹层列表 */
.mat-list { display: flex; flex-direction: column; gap: 4px; max-height: 50vh; overflow-y: auto; }
.mat-empty { font-size: 12.5px; color: var(--dew-text-faint); padding: 8px 0; }
.mat-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--dew-card-border);
}
.mat-row:last-child { border-bottom: none; }
.mat-main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.mat-content { font-size: 13px; color: var(--dew-text-heading); line-height: 1.6; word-break: break-word; }
.mat-atts { display: flex; flex-wrap: wrap; gap: 4px 12px; }
.att-link {
  border: none; background: none; padding: 0; cursor: pointer; text-align: left;
  font-size: 12.5px; color: var(--color-primary); text-decoration: none;
}
.att-link:hover { opacity: 0.8; }
.mat-time { font-size: 11.5px; color: var(--dew-text-faint); }

/* 删除确认 */
.del-form { display: flex; flex-direction: column; gap: 8px; }
.del-line { margin: 0; font-size: 13.5px; font-weight: 600; color: var(--dew-text-heading); line-height: 1.6; }
.del-sub { margin: 0; font-size: 12.5px; color: var(--dew-text-faint); line-height: 1.6; }
.del-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }

.hint { font-size: 12px; color: var(--dew-text-faint); margin-top: 14px; line-height: 1.7; }
.empty { color: var(--dew-text-muted); padding: 16px 0; line-height: 1.7; text-align: center; }
</style>
