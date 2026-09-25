<script setup>
/**
 * 我的书架（个人中心子页）：courseShelf 收藏的课程列表。
 * - 数据：GET /courseShelf/list（service 层备好，与详情页「加入书架」共用）
 * - 卡片 = 封面 + 标题/简介/章节数；点击进课程详情（/study/details?id=，同学习页口径）
 * - 下架课不删行（后端口径：记录不擅自清理，展示形态交前端）：置灰 + 「已下架」标记，仍可点进详情
 * - 移出：DewMessageBox 确认 → courseShelfService.remove → 局部删（不整页刷新）
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Notebook } from '@element-plus/icons-vue'
import { DewCard, DewTag, DewButton, DewMessage, DewMessageBox, DewSkeleton } from '@bme/dew-ui'
import DewImage from '@bme/dew-ui/DewImage.vue'
import { assetUrl } from '../../services/campService'
import { courseShelfService } from '../../services/courseShelfService'

const router = useRouter()
const courses = ref([])
const loading = ref(true)   // 首屏加载态：为 true 时展示骨架占位，避免误显空状态

const load = async () => {
  loading.value = true
  try {
    courses.value = await courseShelfService.list()
  } catch (e) {
    console.error('加载书架失败', e)
  } finally {
    loading.value = false
  }
}

// 收藏时间 "2026-09-21 10:00:00" → 2026/9/21
const fmtDate = (t) => (t ? new Date(t.replace(' ', 'T')).toLocaleDateString('zh-CN') : '')

const openCourse = (c) => {
  router.push({ path: '/study/details', query: { id: c.course_id } })
}

const onRemove = async (c) => {
  try {
    await DewMessageBox.confirm(`确定把「${c.course_title}」移出书架吗？`, '移出书架', { confirmText: '移出' })
  } catch { return }
  try {
    await courseShelfService.remove(c.course_id)
    courses.value = courses.value.filter(x => x.course_id !== c.course_id)
    DewMessage.success('已移出书架')
  } catch (e) {
    DewMessage.error(e?.message || '移出失败，请重试')
  }
}

onMounted(load)
</script>

<template>
  <DewCard size="lg" divided class="my-shelf-card">
    <template #header>
      <div class="shelf-header">
        <span class="shelf-title"><el-icon class="shelf-title__icon"><Notebook /></el-icon> 我的书架</span>
        <span v-if="!loading && courses.length" class="shelf-count">{{ courses.length }} 门课程</span>
      </div>
    </template>

    <!-- 加载中：课程卡骨架（封面块 + 文本条） -->
    <div v-if="loading" class="shelf-grid">
      <div v-for="n in 4" :key="n" class="shelf-item shelf-item--skeleton">
        <DewSkeleton variant="rect" width="75px" height="100px" rounded="8px" />
        <div class="shelf-info">
          <DewSkeleton variant="text" width="70%" height="16px" />
          <DewSkeleton variant="text" :lines="2" />
          <DewSkeleton variant="text" width="50%" />
        </div>
      </div>
    </div>

    <!-- 空书架：引导去课程广场 -->
    <div v-else-if="!courses.length" class="shelf-empty">
      <div class="shelf-empty__text">书架还是空的，收藏喜欢的课程随时回来看</div>
      <DewButton type="primary" @click="router.push('/study')">去逛课程</DewButton>
    </div>

    <div v-else class="shelf-grid">
      <div
        v-for="c in courses"
        :key="c.course_id"
        class="shelf-item"
        :class="{ 'is-off': c.course_status === 'off_shelf' }"
        @click="openCourse(c)"
      >
        <!-- 封面：有缩略图出图，无图回退中性底 + 课程名（不复制学习页的色板逻辑） -->
        <div class="shelf-cover">
          <DewImage
            v-if="c.course_cover_thumb"
            class="shelf-cover__img"
            :src="assetUrl(c.course_cover_thumb)"
            :alt="c.course_title"
          />
          <span v-else class="shelf-cover__text">{{ c.course_title }}</span>
        </div>
        <div class="shelf-info">
          <div class="shelf-name-row">
            <div class="shelf-name" :title="c.course_title">{{ c.course_title }}</div>
            <span v-if="c.learning_mode === 'open'" class="mode-chip">自主学</span>
            <DewTag v-if="c.course_status === 'off_shelf'" type="info" size="sm" class="shelf-off-tag">已下架</DewTag>
          </div>
          <div class="shelf-intro">{{ c.course_introduction || '暂无简介' }}</div>
          <div class="shelf-meta">
            <span class="shelf-meta__text">共 {{ c.course_chapters || 0 }} 章 · 收藏于 {{ fmtDate(c.created_at) }}</span>
            <DewButton size="sm" type="ghost" class="shelf-remove" @click.stop="onRemove(c)">移出</DewButton>
          </div>
        </div>
      </div>
    </div>
  </DewCard>
</template>

<style scoped>
.my-shelf-card {
  width: 100%;
}

/* 头部：标题 + 计数 */
.shelf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shelf-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
}

.shelf-title__icon {
  color: var(--dew-text-muted);
}

.shelf-count {
  font-size: 13px;
  color: var(--dew-text-faint);
}

/* 卡片网格：宽屏两列（个人中心右栏约 950px，两列留呼吸感），窄屏单列 */
.shelf-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (max-width: 768px) {
  .shelf-grid {
    grid-template-columns: 1fr;
  }
}

/* 课程卡：flat 面 + 弹性提浮（hover 优先形态反馈，不变色） */
.shelf-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--dew-card-flat-border);
  background: var(--dew-card-flat-bg);
  box-shadow: var(--dew-card-flat-shadow);
  cursor: pointer;
  transition: transform 0.25s var(--dew-bounce), box-shadow 0.25s ease;
  min-width: 0;
}

.shelf-item:hover {
  transform: translateY(-2px);
  background: var(--dew-card-flat-bg-hover);
  box-shadow: var(--dew-card-flat-shadow-hover);
}

.shelf-item--skeleton {
  cursor: default;
  pointer-events: none;
}

/* 下架课：置灰降权，仍可点进详情（详情页自有其降级逻辑） */
.shelf-item.is-off {
  opacity: 0.55;
  filter: grayscale(0.5);
}

/* 封面 75x100 与学习页书卡同比例 */
.shelf-cover {
  width: 75px;
  height: 100px;
  border-radius: 8px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: var(--dew-card-flat-bg-hover);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.shelf-cover__img {
  width: 100%;
  height: 100%;
}

.shelf-cover__text {
  padding: 6px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--dew-text-muted);
  word-break: break-all;
}

/* 信息列 */
.shelf-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shelf-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.shelf-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--dew-text-heading);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 自主学标记（migrate_52 口径）：仅 open 课显示，营期学为默认形态不标 */
.mode-chip {
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 500;
  line-height: 16px;
  color: var(--color-success);
  background: var(--color-success-light);
}

.shelf-off-tag {
  flex-shrink: 0;
}

.shelf-intro {
  font-size: 12px;
  line-height: 1.5;
  color: var(--dew-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* 底部：章节 + 收藏时间 / 移出 */
.shelf-meta {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.shelf-meta__text {
  font-size: 12px;
  color: var(--dew-text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shelf-remove {
  flex-shrink: 0;
}

/* 空状态 */
.shelf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 36px 0;
}

.shelf-empty__text {
  font-size: 14px;
  color: var(--dew-text-faint);
}
</style>
