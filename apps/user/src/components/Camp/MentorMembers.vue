<template>
  <!-- 导生「团队与学习认证」（09-12 方向制；09-13 多课+评分）：本团队学员 × 方向全部课程，
       按章认证（可打分 0-100）/撤销/改分；课程均分读时聚合展示 -->
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
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { DewCard, DewButton } from '@bme/dew-ui';
import { ElMessage, ElMessageBox, ElIcon } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const SCORE_RE = /^([0-9]|[1-9]\d|100)$/;   // 0-100 整数

const progress = ref({});
const expanded = ref(null);
const acting = ref(false);

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
.hint { font-size: 12px; color: var(--dew-text-faint); margin-top: 14px; line-height: 1.7; }
.empty { color: var(--dew-text-muted); padding: 16px 0; line-height: 1.7; }
</style>
