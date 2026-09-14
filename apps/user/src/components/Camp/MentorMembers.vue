<template>
  <!-- 导生「团队与学习认证」（09-12 方向制；09-13 多课+评分）：本团队学员 × 方向全部课程，
       按章认证（可打分 0-100）/撤销/改分；课程均分读时聚合展示；
       09-14 章节材料：章节行「材料 n」chip 打开弹层查看/下载/删除学员提交的材料 -->
  <div class="mentor-members">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header>
        <h3>团队与学习认证<span v-if="progress.direction" class="dir-chip">{{ progress.direction }}</span></h3>
      </template>

      <div v-if="!progress.direction || !progress.courses?.length" class="empty">
        {{ progress.message || '尚未设置方向（或方向未绑定课程）——先在「选导生」页完善名片的方向选择。' }}
      </div>

      <template v-else>
        <div v-if="!progress.students?.length" class="empty">本团队暂无学员</div>
        <div v-else class="member-rows">
          <div v-for="s in progress.students" :key="s.student_user_id" class="member-row">
            <button type="button" class="row-head" @click="toggleExpand(s.student_user_id)">
              <span class="row-name">{{ s.username }}</span>
              <span class="row-meta">
                <span v-for="c in s.courses" :key="c.course_id" class="course-chip">
                  {{ c.course_title }} {{ c.certified_chapters }}/{{ c.total_chapters }}<template v-if="c.score_avg != null"> · 均 {{ c.score_avg }}</template><template v-if="c.course_status === 'completed'"> · 完成</template>
                </span>
              </span>
              <el-icon class="row-arrow" :class="{ open: expanded === s.student_user_id }"><ArrowDown /></el-icon>
            </button>

            <div v-if="expanded === s.student_user_id" class="chapter-panel">
              <div v-for="c in s.courses" :key="c.course_id" class="course-sec">
                <div class="cs-head">
                  <span class="cs-title">{{ c.course_title }}</span>
                  <span class="cs-meta">
                    认证 {{ c.certified_chapters }}/{{ c.total_chapters }}
                    <template v-if="c.score_avg != null"> · 均分 {{ c.score_avg }}</template>
                    <span v-if="c.course_status === 'completed'" class="done-tag">课程已完成</span>
                  </span>
                </div>
                <div v-for="ch in c.chapters" :key="ch.chapter_id" class="ch-row">
                  <span class="ch-name" :title="ch.name">{{ ch.name }}</span>
                  <span class="ch-meta">学员自报 {{ ch.lessons_completed }}/{{ ch.lessons }} 课时</span>
                  <button type="button" :class="['mat-chip', { has: ch.material_count > 0 }]"
                          :disabled="!ch.material_count" @click="openMaterials(s, ch)">
                    材料 {{ ch.material_count || 0 }}
                  </button>
                  <DewButton v-if="!ch.certified" type="glass" size="sm" :loading="acting"
                    @click="certify(s, c, ch)">认证</DewButton>
                  <template v-else>
                    <span class="ch-cert">已认证{{ ch.score != null ? ` · ${ch.score} 分` : '' }}{{ ch.certified_at ? ` · ${ch.certified_at}` : '' }}</span>
                    <DewButton type="ghost" size="sm" :loading="acting" @click="rescore(s, c, ch)">改分</DewButton>
                    <DewButton type="ghost" size="sm" :loading="acting" @click="revoke(s, c, ch)">撤销</DewButton>
                  </template>
                </div>
                <div v-if="!c.chapters.length" class="ch-empty">该课程暂无章节</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div class="hint">
        方向课程：{{ (progress.courses || []).map((c) => c.course_title).join(' / ') || '—' }}
        · 全章认证齐后对应课程自动记为已完成；认证时可评分（0-100），课程均分自动聚合
      </div>
    </DewCard>

    <!-- 章节材料弹层（09-14）：学员 × 章的材料列表，认证/评分前查看下载 -->
    <DewDialog v-model="matDlg.open" :title="`章节材料 · ${matDlg.studentName} · ${matDlg.chapterName}`" width="560px">
      <div class="mat-list" v-loading="matDlg.loading">
        <div v-if="!matDlg.materials.length && !matDlg.loading" class="mat-empty">该学员本章暂无材料</div>
        <div v-for="m in matDlg.materials" :key="m.id" class="mat-row">
          <div class="mat-main">
            <div v-if="m.content" class="mat-content">{{ m.content }}</div>
            <div v-if="m.attachments?.length" class="mat-atts">
              <a v-for="a in m.attachments" :key="a.id"
                 :href="campService.chapterMaterialAttachmentUrl(a.id)" target="_blank" class="att-link">
                {{ a.filename }}{{ a.size ? `（${Math.round(a.size / 1024)}KB）` : '' }}
              </a>
            </div>
            <span class="mat-time">{{ (m.created_at || '').slice(0, 16).replace('T', ' ') }}</span>
          </div>
          <DewButton type="ghost" size="sm" @click="removeMaterial(m)">删除</DewButton>
        </div>
      </div>
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { DewCard, DewButton, DewDialog } from '@bme/dew-ui';
import { ElMessage, ElMessageBox, ElIcon } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const SCORE_RE = /^([0-9]|[1-9]\d|100)$/;   // 0-100 整数

const progress = ref({});
const expanded = ref(null);
const acting = ref(false);

// ── 章节材料弹层（09-14）──
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

async function removeMaterial(m) {
  try {
    await ElMessageBox.confirm('删除该学员的这条材料？', '删除材料',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' });
  } catch { return; }
  try {
    await campService.deleteChapterMaterial(m.id);
    ElMessage.success('已删除');
    const d = await campService.fetchChapterMaterials(props.sid, {
      student_user_id: matDlg.value.student.student_user_id,
      chapter_id: matDlg.value.chapter.chapter_id });
    matDlg.value.materials = d.materials || [];
    await load();   // 刷新章节行 material_count
    expanded.value = matDlg.value.student.student_user_id;   // load 会重置展开态，恢复
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

function toggleExpand(uid) {
  expanded.value = expanded.value === uid ? null : uid;
}

async function load() {
  expanded.value = null;
  try {
    const d = await campService.fetchTeamProgress(props.sid);
    progress.value = d.data || d;
  } catch {
    progress.value = {};
    ElMessage.error('加载团队进度失败');
  }
}

// 认证：弹评分框（可留空=只认证不打分）
async function certify(student, course, chapter) {
  if (acting.value) return;
  let raw;
  try {
    ({ value: raw } = await ElMessageBox.prompt(
      `「${chapter.name}」评分（0-100 整数，留空 = 只认证不打分）`, '认证章节',
      {
        confirmButtonText: '认证', cancelButtonText: '取消',
        inputPattern: /^$|^([0-9]|[1-9]\d|100)$/,
        inputErrorMessage: '评分须为 0-100 的整数（可留空）',
        inputValue: '',
      }));
  } catch { return; }   // 取消认证
  await submit(student, chapter, raw === '' ? null : Number(raw));
}

// 改分：已认证行重复 POST 带 score（免撤销改分）
async function rescore(student, course, chapter) {
  if (acting.value) return;
  let raw;
  try {
    ({ value: raw } = await ElMessageBox.prompt(
      `「${chapter.name}」新评分（0-100 整数）`, '修改评分',
      {
        confirmButtonText: '保存', cancelButtonText: '取消',
        inputPattern: SCORE_RE,
        inputErrorMessage: '评分须为 0-100 的整数',
        inputValue: chapter.score != null ? String(chapter.score) : '',
      }));
  } catch { return; }
  await submit(student, chapter, Number(raw));
}

async function submit(student, chapter, score) {
  acting.value = true;
  try {
    const r = await campService.certifyChapter(
      props.sid, student.student_user_id, chapter.chapter_id, score);
    ElMessage.success(r.message || '已认证');
    await load();
    expanded.value = student.student_user_id;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  } finally {
    acting.value = false;
  }
}

async function revoke(student, course, chapter) {
  if (acting.value) return;
  acting.value = true;
  try {
    const r = await campService.revokeChapterCertification(
      props.sid, student.student_user_id, chapter.chapter_id);
    ElMessage.success(r.message || '已撤销');
    await load();
    expanded.value = student.student_user_id;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  } finally {
    acting.value = false;
  }
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.dir-chip {
  margin-left: 10px; font-size: 12px; font-weight: 600; vertical-align: middle;
  color: var(--color-primary); border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  border-radius: 999px; padding: 2px 10px;
}
.member-rows { display: flex; flex-direction: column; gap: 8px; }
.row-head {
  display: flex; align-items: center; gap: 12px; width: 100%;
  background: transparent; border: 1px solid var(--dew-card-border); border-radius: 8px;
  padding: 10px 14px; cursor: pointer; text-align: left;
  transition: border-color 0.15s ease;
}
.row-head:hover { border-color: var(--dew-text-faint); }
.row-name { flex-shrink: 0; font-size: 14px; font-weight: 600; color: var(--dew-text-heading); }
.row-meta {
  flex: 1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-size: 12px; color: var(--dew-text-muted); justify-content: flex-end;
}
.course-chip {
  border: 1px solid var(--dew-card-border); border-radius: 999px; padding: 1px 9px;
  white-space: nowrap;
}
.done-tag { font-size: 11px; font-weight: 600; color: var(--color-success, #67c23a); }
.row-arrow { color: var(--dew-text-faint); transition: transform 0.15s ease; }
.row-arrow.open { transform: rotate(180deg); }
.chapter-panel { border: 1px dashed var(--dew-card-border); border-top: none; border-radius: 0 0 8px 8px; padding: 6px 14px; }
.course-sec + .course-sec { margin-top: 10px; }
.cs-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 4px 0; }
.cs-title { font-size: 13px; font-weight: 650; color: var(--dew-text-heading); }
.cs-meta { font-size: 12px; color: var(--dew-text-muted); display: flex; align-items: center; gap: 6px; }
.ch-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--dew-card-border); }
.ch-row:last-child { border-bottom: none; }
.ch-name { flex: 1; font-size: 13px; color: var(--dew-text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ch-meta { font-size: 12px; color: var(--dew-text-faint); flex-shrink: 0; }
.ch-cert { font-size: 12px; color: var(--color-success, #67c23a); font-weight: 600; flex-shrink: 0; }
.ch-empty { font-size: 12px; color: var(--dew-text-faint); padding: 6px 0; }

/* 材料 chip（章节行，有料可点开弹层；无料置灰提示入口存在） */
.mat-chip {
  flex-shrink: 0; font-size: 12px; color: var(--dew-text-faint); cursor: pointer;
  border: 1px solid var(--dew-card-border); border-radius: 999px; padding: 2px 10px;
  background: transparent; transition: color 0.15s ease, border-color 0.15s ease;
}
.mat-chip.has { color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 40%, transparent); }
.mat-chip:disabled { cursor: default; opacity: 0.75; }

/* 材料弹层列表 */
.mat-list { display: flex; flex-direction: column; gap: 4px; max-height: 50vh; overflow-y: auto; }
.mat-empty { font-size: 12.5px; color: var(--dew-text-faint); padding: 8px 0; }
.mat-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  padding: 8px 0; border-bottom: 1px dashed var(--dew-card-border);
}
.mat-row:last-child { border-bottom: none; }
.mat-main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.mat-content { font-size: 13px; color: var(--dew-text-heading); line-height: 1.6; word-break: break-word; }
.mat-atts { display: flex; flex-wrap: wrap; gap: 4px 12px; }
.att-link {
  font-size: 12.5px; color: var(--color-primary); text-decoration: none;
  border-bottom: 1px dashed color-mix(in srgb, var(--color-primary) 45%, transparent);
}
.att-link:hover { opacity: 0.8; }
.mat-time { font-size: 11.5px; color: var(--dew-text-faint); }
.hint { font-size: 12px; color: var(--dew-text-faint); margin-top: 14px; line-height: 1.7; }
.empty { color: var(--dew-text-muted); padding: 16px 0; line-height: 1.7; }
</style>
