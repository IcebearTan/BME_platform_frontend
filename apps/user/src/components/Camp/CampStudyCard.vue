<template>
  <!-- 学员「学习方向」卡（09-12 方向制；09-13 多课）：方向随归属导生继承全部课程，
       各课章节进度由导生按章认证（含 0-100 评分，课程均分聚合展示）。
       09-14 章节材料：每章可提交文字+附件（追加式、提交即可见），导生认证时查看。 -->
  <div class="camp-study">
    <DewCard v-if="!direction || !courses.length" variant="inset" size="lg" :no-hover="true" class="study-card">
      <div class="study-title">学习方向</div>
      <div class="study-hint">{{ hint || '尚未确定学习方向——归属导生后将自动继承其方向与全部课程。' }}</div>
    </DewCard>

    <DewCard v-else variant="inset" size="lg" :no-hover="true" class="study-card" v-loading="loading">
      <div class="study-head">
        <div class="study-head-main">
          <div class="study-title">{{ direction }}</div>
          <div class="study-hint">
            方向随归属导生{{ mentorName ? `（${mentorName}）` : '' }}继承；完成章节学习后由导生认证进度。
          </div>
        </div>
        <span class="course-count">{{ courses.length }} 门课程</span>
      </div>

      <div v-for="c in courses" :key="c.course_id" class="course-block">
        <div class="course-row">
          <div class="course-info">
            <div class="course-name">
              {{ c.course_title }}
              <span v-if="c.course_status === 'completed'" class="study-badge done">已完成</span>
            </div>
            <div class="course-meta">
              难度 {{ c.difficulty || '—' }} · 章节认证 {{ c.certified_chapters }}/{{ c.total_chapters }}<template v-if="c.score_avg != null"> · 均分 {{ c.score_avg }}</template>
            </div>
          </div>
          <DewButton size="sm" @click="goStudy(c)">去学习</DewButton>
        </div>

        <div v-if="c.chapters.length" class="chapter-list">
          <div v-for="ch in c.chapters" :key="ch.chapter_id" class="chapter-item">
            <div class="chapter-row">
              <span class="chapter-name" :title="ch.name">{{ ch.name }}</span>
              <span class="chapter-meta">自报 {{ ch.lessons_completed }}/{{ ch.lessons }} 课时</span>
              <span :class="['cert-tag', { certified: ch.certified }]">
                {{ ch.certified ? (ch.score != null ? `已认证（${ch.score} 分）` : '已认证') : '未认证' }}
              </span>
              <button type="button" :class="['mat-chip', { open: openChapterId === ch.chapter_id }]"
                      @click="toggleChapter(ch)">
                材料 {{ ch.material_count || 0 }}
                <el-icon class="mat-caret" :class="{ open: openChapterId === ch.chapter_id }"><ArrowDown /></el-icon>
              </button>
            </div>

            <!-- 章节材料面板：本人材料列表 + 提交盒 -->
            <div v-if="openChapterId === ch.chapter_id" class="mat-panel" v-loading="matLoading">
              <div v-if="!materials.length && !matLoading" class="mat-empty">尚无材料——提交学习记录或成果文件，供导生认证时参考</div>
              <div v-for="m in materials" :key="m.id" class="mat-row">
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

              <div class="mat-submit">
                <DewInput v-model="draft.content" type="textarea" :rows="2"
                          placeholder="章节材料说明（实验记录 / 学习心得，选填）" />
                <input :ref="(el) => (fileEls[ch.chapter_id] = el)" type="file" multiple
                       class="file-input-hidden" @change="(e) => onFiles(ch.chapter_id, e)" />
                <div class="mat-submit-row">
                  <DewButton type="ghost" size="sm" @click="pickFiles(ch.chapter_id)">
                    {{ draft.files.length ? `附件 ×${draft.files.length}` : '选择附件' }}
                  </DewButton>
                  <DewButton type="glass" size="sm" :loading="submitting"
                             :disabled="!draft.content.trim() && !draft.files.length"
                             @click="submitMaterial(ch)">提交材料</DewButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, ElIcon } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { DewCard, DewButton, DewInput } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const router = useRouter();
const loading = ref(true);
const data = ref({});

const direction = computed(() => data.value.direction);
const courses = computed(() => data.value.courses || []);
const mentorName = computed(() => data.value.mentor_name);
const hint = computed(() => data.value.hint);

// ── 章节材料（09-14）──
const openChapterId = ref(null);   // 当前展开材料面板的章（单开）
const materials = ref([]);
const matLoading = ref(false);
const submitting = ref(false);
const draft = ref({ content: '', files: [] });
const fileEls = {};                // 隐藏原生 file input，按 chapter_id 索引（DewButton 触发选择）

function goStudy(course) {
  // sid 透传：详情页/学习页按营期快照口径显示进度（09-14 从零快照）
  router.push(`/study/details?id=${course.course_id}&from=camp&sid=${props.sid}`);
}

async function loadDirection() {
  const r = await campService.fetchMyDirection(props.sid);
  data.value = r.data || r;   // 后端顶层字段（direction/courses/hint）
}

async function toggleChapter(ch) {
  if (openChapterId.value === ch.chapter_id) {
    openChapterId.value = null;
    return;
  }
  openChapterId.value = ch.chapter_id;
  draft.value = { content: '', files: [] };
  await loadMaterials(ch.chapter_id);
}

async function loadMaterials(chapterId) {
  matLoading.value = true;
  try {
    const d = await campService.fetchChapterMaterials(props.sid, { chapter_id: chapterId });
    materials.value = d.materials || [];
  } catch (e) {
    materials.value = [];
    ElMessage.error(e.response?.data?.message || '加载材料失败');
  } finally {
    matLoading.value = false;
  }
}

function pickFiles(chapterId) { fileEls[chapterId]?.click(); }
function onFiles(chapterId, e) {
  draft.value.files = [...e.target.files];
  e.target.value = '';
}

async function submitMaterial(ch) {
  if (submitting.value || (!draft.value.content.trim() && !draft.value.files.length)) return;
  submitting.value = true;
  try {
    const r = await campService.submitChapterMaterial(
      props.sid, ch.chapter_id, draft.value.content.trim(), draft.value.files);
    ElMessage.success(r.message || '材料已提交');
    draft.value = { content: '', files: [] };
    await Promise.all([loadMaterials(ch.chapter_id), loadDirection()]);   // 列表 + material_count 同步刷
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败');
  } finally {
    submitting.value = false;
  }
}

async function removeMaterial(m) {
  try {
    await ElMessageBox.confirm('删除后导生将不再可见，确定删除这条材料？', '删除材料',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' });
  } catch { return; }
  try {
    await campService.deleteChapterMaterial(m.id);
    ElMessage.success('已删除');
    await Promise.all([loadMaterials(m.chapter_id), loadDirection()]);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

onMounted(async () => {
  try {
    await loadDirection();
  } catch { /* 未归属等场景由后端 200+hint 表达；网络错误静默空卡 */ }
  finally { loading.value = false; }
});
</script>

<style scoped>
.study-card { margin-top: 16px; }
.study-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
.study-title { font-size: 16px; font-weight: 600; color: var(--dew-text-heading); }
.study-hint { font-size: 13px; color: var(--dew-text-muted); line-height: 1.7; margin-top: 4px; }
.course-count { flex-shrink: 0; font-size: 12px; color: var(--dew-text-faint); padding-top: 3px; }
.study-badge.done {
  font-size: 11px; font-weight: 600; color: var(--color-success, #67c23a);
  border: 1px solid color-mix(in srgb, var(--color-success, #67c23a) 45%, transparent);
  border-radius: 999px; padding: 1px 8px; margin-left: 8px; vertical-align: middle;
}
.course-block + .course-block { margin-top: 14px; }
.course-row {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  border: 1px solid var(--dew-card-border); border-radius: 8px; padding: 12px 14px;
}
.course-name { font-size: 14px; font-weight: 600; color: var(--dew-text-heading); }
.course-meta { font-size: 12.5px; color: var(--dew-text-muted); margin-top: 4px; }
.chapter-list { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; padding: 0 2px; }
.chapter-item { display: flex; flex-direction: column; }
.chapter-row {
  display: flex; align-items: center; gap: 12px; font-size: 13px;
  border-bottom: 1px dashed var(--dew-card-border); padding: 6px 2px;
}
.chapter-item:last-child .chapter-row { border-bottom: none; }
.chapter-item:has(.mat-panel) .chapter-row { border-bottom: 1px dashed var(--dew-card-border); }
.chapter-name { flex: 1; color: var(--dew-text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chapter-meta { flex-shrink: 0; font-size: 12px; color: var(--dew-text-faint); }
.cert-tag { flex-shrink: 0; font-size: 12px; color: var(--dew-text-faint); }
.cert-tag.certified { color: var(--color-success, #67c23a); font-weight: 600; }

/* 材料 chip（章节行尾入口） */
.mat-chip {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--dew-text-muted); cursor: pointer;
  border: 1px solid var(--dew-card-border); border-radius: 999px; padding: 2px 10px;
  background: transparent; transition: color 0.15s ease, border-color 0.15s ease;
}
.mat-chip:hover { color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 40%, transparent); }
.mat-chip.open { color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 45%, transparent); }
.mat-caret { font-size: 11px; transition: transform 0.15s ease; }
.mat-caret.open { transform: rotate(180deg); }

/* 章节材料面板 */
.mat-panel {
  display: flex; flex-direction: column; gap: 10px; margin: 2px 0 8px;
  border: 1px dashed var(--dew-card-border); border-radius: 8px; padding: 10px 12px;
}
.mat-empty { font-size: 12.5px; color: var(--dew-text-faint); line-height: 1.7; }
.mat-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
  padding: 6px 0; border-bottom: 1px dashed var(--dew-card-border);
}
.mat-row:last-of-type { border-bottom: none; }
.mat-main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.mat-content { font-size: 13px; color: var(--dew-text-heading); line-height: 1.6; word-break: break-word; }
.mat-atts { display: flex; flex-wrap: wrap; gap: 6px 12px; }
.att-link {
  font-size: 12.5px; color: var(--color-primary); text-decoration: none;
  border-bottom: 1px dashed color-mix(in srgb, var(--color-primary) 45%, transparent);
}
.att-link:hover { opacity: 0.8; }
.mat-time { font-size: 11.5px; color: var(--dew-text-faint); }
.mat-submit { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; padding-top: 8px; border-top: 1px dashed var(--dew-card-border); }
.mat-submit-row { display: flex; justify-content: flex-end; gap: 8px; }
.file-input-hidden { display: none; }

@media (max-width: 760px) {
  .chapter-row { flex-wrap: wrap; }
  .chapter-name { flex-basis: 100%; }
}
</style>
