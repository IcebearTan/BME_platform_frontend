<template>
  <div class="teacher-meetings">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header>
        <div class="head-row">
          <!-- 首次加载不闪「全营组会（0）」：标题计数走骨架，加载后用后端 total（非当前页条数） -->
          <h3>全营组会（<DewSkeleton v-if="initialLoading" variant="text" :width="24" :height="14" class="head-count-skel" /><template v-else>{{ total }}</template>）</h3>
          <span class="head-hint">{{ headHint }}</span>
        </div>
      </template>

      <!-- 工具栏：导生筛选（仅学习营；项目营保持项目组语义不混用「导生」文案） -->
      <div v-if="isLearning" class="filter-bar">
        <template v-if="initialLoading">
          <DewSkeleton variant="rect" :width="190" :height="32" rounded="10px" />
        </template>
        <template v-else>
          <DewSelect v-model="mentorId" size="sm" class="mentor-filter"
            :options="mentorOptions" :disabled="listLoading"
            @update:model-value="onFilterChange" />
        </template>
      </div>

      <!-- 列表：骨架 / 错误 / 空态 / 数据 四态互斥 -->
      <div v-if="initialLoading" class="mtg-skeletons">
        <div v-for="n in 5" :key="n" class="mtg-skel-card">
          <DewSkeleton variant="circle" size="26" />
          <div class="mtg-skel-lines">
            <DewSkeleton variant="text" :width="n % 2 ? '62%' : '48%'" />
            <DewSkeleton variant="text" width="30%" />
          </div>
          <DewSkeleton variant="text" :width="56" />
        </div>
      </div>

      <div v-else-if="loadError" class="error-box">
        <span class="error-text">{{ errorMsg }}</span>
        <DewButton size="sm" @click="retry">重试</DewButton>
      </div>

      <div v-else-if="listLoading" class="mtg-skeletons">
        <div v-for="n in 4" :key="n" class="mtg-skel-card">
          <DewSkeleton variant="circle" size="26" />
          <div class="mtg-skel-lines">
            <DewSkeleton variant="text" :width="n % 2 ? '60%' : '44%'" />
            <DewSkeleton variant="text" width="26%" />
          </div>
          <DewSkeleton variant="text" :width="56" />
        </div>
      </div>

      <div v-else-if="!meetings.length" class="empty">
        <template v-if="mentorId === null">本营暂无组会记录</template>
        <template v-else>
          该导生暂无组会记录
          <DewButton size="sm" type="ghost" @click="clearFilter">查看全部组会</DewButton>
        </template>
      </div>

      <div v-else class="mtg-list">
        <DewCard v-for="m in meetings" :key="m.id" variant="inset" size="sm"
                 :interactive="true" style="margin: 8px 0;" @click="openDetail(m)">
          <div class="mtg-row">
            <DewTag size="sm" :round="true" :type="m.has_minutes ? 'success' : 'warning'">
              {{ m.has_minutes ? '已归档' : '进行中' }}
            </DewTag>
            <span class="mtg-team">{{ m.team_label }}</span>
            <span class="mtg-title">{{ m.title }}</span>
            <span class="mtg-date">{{ m.meeting_date }}</span>
            <span class="mtg-creator">发起 {{ m.creator_name }}</span>
            <span class="mtg-count">任务 {{ m.task_count }}</span>
            <span v-if="m.chapter_count" class="mtg-count">课内 {{ m.chapter_count }} 章</span>
            <el-icon class="mtg-arrow"><ArrowRight /></el-icon>
          </div>
        </DewCard>
      </div>

      <!-- 分页（与 TeacherMembers 同款 DewButton 形式） -->
      <div v-if="!initialLoading && !loadError && totalPages > 0" class="pager">
        <DewButton size="sm" :disabled="page <= 1 || listLoading" @click="goPage(page - 1)">上一页</DewButton>
        <span class="pager-text">第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 条</span>
        <DewButton size="sm" :disabled="page >= totalPages || listLoading" @click="goPage(page + 1)">下一页</DewButton>
      </div>
    </DewCard>

    <!-- 详情（复用组会详情弹窗；老师视角 _can_manage=False → 纯只读，无编辑/审阅入口）。
         弹窗开关不动筛选与页码——关闭详情后列表停留在原筛选原页 -->
    <MeetingDetail v-model="detailVisible" :sid="sid" :meeting-id="detailId" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ArrowRight } from '@element-plus/icons-vue';
import { DewButton, DewCard, DewSelect, DewSkeleton, DewTag } from '@bme/dew-ui';
import { campService } from '../../services/campService';
import MeetingDetail from './MeetingDetail.vue';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  /** 营期类型（session.category）：learning=培训营显示导生筛选；project=项目营不显示 */
  category: { type: String, default: 'learning' },
});

const isLearning = computed(() => props.category !== 'project');

// 加载态分层：initialLoading / listLoading / loadError 三态互斥，空态在加载成功后判定
const initialLoading = ref(true);
const listLoading = ref(false);
const loadError = ref(false);
const errorMsg = ref('');

const meetings = ref([]);
const mentors = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
// mentorId：null=全部 / 数字=某导生（服务端 mentor_id 筛选，禁止前端全量过滤）
const mentorId = ref(null);

const detailVisible = ref(false);
const detailId = ref(null);

let reqSeq = 0;          // 请求序号：切筛选/翻页的旧响应一律丢弃

async function load() {
  const seq = ++reqSeq;
  // 已有数据（翻页/筛选/重试）走受控加载保住工具栏；首次加载整体骨架
  if (meetings.value.length) listLoading.value = true;
  else initialLoading.value = true;
  loadError.value = false;
  try {
    const d = await campService.fetchCampMeetingsAll(props.sid, {
      page: page.value,
      page_size: pageSize,
      mentor_id: mentorId.value ?? undefined,
    });
    if (seq !== reqSeq) return;                    // 过期响应：丢弃
    meetings.value = d.meetings || [];
    mentors.value = d.mentors || [];
    total.value = d.total || 0;
    // 当前页因数据变化变空且已越过末页 → 回到最后有效页重新请求
    const pages = totalPages.value;
    if (page.value > pages && pages > 0) {
      page.value = pages;
      return load();
    }
  } catch (e) {
    if (seq !== reqSeq) return;
    loadError.value = true;
    errorMsg.value = e.response?.data?.message || '加载全营组会失败';
  } finally {
    if (seq === reqSeq) {
      initialLoading.value = false;
      listLoading.value = false;
    }
  }
}

function retry() {
  load();
}
function goPage(p) {
  if (listLoading.value || p < 1 || p > totalPages.value) return;
  page.value = p;
  load();
}
function onFilterChange() {
  page.value = 1;                                   // 切导生回第一页
  load();
}
function clearFilter() {
  mentorId.value = null;
  onFilterChange();
}
// 切营：清筛选、回第一页、重进完整准备态
watch(() => props.sid, () => {
  page.value = 1;
  mentorId.value = null;
  meetings.value = [];
  mentors.value = [];
  total.value = 0;
  load();
}, { immediate: true });
defineExpose({ reload: load });

const totalPages = computed(() => (total.value ? Math.max(1, Math.ceil(total.value / pageSize)) : 0));

// 筛选选项来自后端本营真实导生列表（mentors 契约：user_id/username/direction）
const mentorOptions = computed(() => [
  { label: '全部导生', value: null },
  ...mentors.value.map((m) => ({
    label: m.direction ? `${m.username} · ${m.direction}` : m.username,
    value: m.user_id,
  })),
]);

const headHint = computed(() =>
  (isLearning.value
    ? '只读总览——发起、布置与审阅由各组导生在其工作台完成'
    : '只读总览——发起、布置与审阅由各项目负责人在其工作台完成'));

function openDetail(m) {
  detailId.value = m.id;
  detailVisible.value = true;
}
</script>

<style scoped>
.head-row { display: flex; align-items: center; gap: 10px; width: 100%; flex-wrap: wrap; }
.head-row h3 { margin: 0; }
.head-count-skel { display: inline-block; vertical-align: middle; }
.head-hint { font-size: 12px; color: var(--dew-text-faint); }

.filter-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.mentor-filter { width: 210px; }

/* 卡片骨架：接近真实组会卡结构（状态圆点 + 两行文字 + 箭头位） */
.mtg-skeletons { display: flex; flex-direction: column; gap: 4px; }
.mtg-skel-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 6px;
}
.mtg-skel-card + .mtg-skel-card { border-top: 1px solid var(--dew-card-divider); }
.mtg-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }

.error-box { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 26px 0; }
.error-text { font-size: 13px; color: var(--color-warning); }
.empty { padding: 28px 0; color: var(--dew-text-faint); font-size: 13px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 10px; }

.mtg-list { display: flex; flex-direction: column; }
.mtg-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mtg-team { font-size: 12px; color: var(--dew-text-faint); min-width: 60px; }
.mtg-title { font-weight: 600; color: var(--dew-text-heading); flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mtg-date { font-size: 12px; color: var(--dew-text-muted); }
.mtg-creator { font-size: 12px; color: var(--dew-text-muted); }
.mtg-count { font-size: 12px; color: var(--dew-text-muted); }
.mtg-arrow { color: var(--dew-text-faint); }

.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 12px; }
.pager-text { font-size: 12.5px; color: var(--dew-text-faint); }

/* 尊重系统减弱动效设置：骨架呼吸动画停用为静态占位 */
@media (prefers-reduced-motion: reduce) {
  .teacher-meetings :deep(.dew-skeleton) { animation: none; opacity: 0.7; }
}
</style>
