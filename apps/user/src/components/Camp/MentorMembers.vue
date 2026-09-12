<template>
  <!-- 导生「团队与学习认证」（09-12 方向制）：本团队学员 + 方向课程章节进度 + 按章认证/撤销 -->
  <div class="mentor-members">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header>
        <h3>团队与学习认证<span v-if="progress.direction" class="dir-chip">{{ progress.direction }}</span></h3>
      </template>

      <div v-if="!progress.direction || !progress.course_id" class="empty">
        {{ progress.message || '尚未设置方向（或方向未绑定课程）——先在「选导生」页完善名片的方向选择。' }}
      </div>

      <template v-else>
        <div v-if="!progress.students?.length" class="empty">本团队暂无学员</div>
        <div v-else class="member-rows">
          <div v-for="s in progress.students" :key="s.student_user_id" class="member-row">
            <button type="button" class="row-head" @click="toggleExpand(s.student_user_id)">
              <span class="row-name">{{ s.username }}</span>
              <span class="row-meta">
                章节认证 {{ s.certified_chapters }}/{{ s.total_chapters }}
                <span v-if="s.course_status === 'completed'" class="done-tag">课程已完成</span>
              </span>
              <el-icon class="row-arrow" :class="{ open: expanded === s.student_user_id }"><ArrowDown /></el-icon>
            </button>

            <div v-if="expanded === s.student_user_id" class="chapter-panel">
              <div v-for="ch in s.chapters" :key="ch.chapter_id" class="ch-row">
                <span class="ch-name" :title="ch.name">{{ ch.name }}</span>
                <span class="ch-meta">学员自报 {{ ch.lessons_completed }}/{{ ch.lessons }} 课时</span>
                <DewButton v-if="!ch.certified" type="glass" size="sm" :loading="acting"
                  @click="certify(s, ch, false)">认证</DewButton>
                <template v-else>
                  <span class="ch-cert">已认证{{ ch.certified_at ? ` · ${ch.certified_at}` : '' }}</span>
                  <DewButton type="ghost" size="sm" :loading="acting" @click="certify(s, ch, true)">撤销</DewButton>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div class="hint">方向课程：{{ progress.course_title || '—' }} · 全章认证齐后课程自动记为已完成</div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { DewCard, DewButton } from '@bme/dew-ui';
import { ElMessage, ElIcon } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

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

async function certify(student, chapter, revoke) {
  if (acting.value) return;
  acting.value = true;
  try {
    const fn = revoke ? campService.revokeChapterCertification : campService.certifyChapter;
    const r = await fn(props.sid, student.student_user_id, chapter.chapter_id);
    ElMessage.success(r.message || (revoke ? '已撤销' : '已认证'));
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
.row-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--dew-text-heading); }
.row-meta { font-size: 12.5px; color: var(--dew-text-muted); display: flex; align-items: center; gap: 8px; }
.done-tag { font-size: 11px; font-weight: 600; color: var(--color-success, #67c23a); }
.row-arrow { color: var(--dew-text-faint); transition: transform 0.15s ease; }
.row-arrow.open { transform: rotate(180deg); }
.chapter-panel { border: 1px dashed var(--dew-card-border); border-top: none; border-radius: 0 0 8px 8px; padding: 4px 14px; }
.ch-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--dew-card-border); }
.ch-row:last-child { border-bottom: none; }
.ch-name { flex: 1; font-size: 13px; color: var(--dew-text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ch-meta { font-size: 12px; color: var(--dew-text-faint); flex-shrink: 0; }
.ch-cert { font-size: 12px; color: var(--color-success, #67c23a); font-weight: 600; flex-shrink: 0; }
.hint { font-size: 12px; color: var(--dew-text-faint); margin-top: 14px; }
.empty { color: var(--dew-text-muted); padding: 16px 0; line-height: 1.7; }
</style>
