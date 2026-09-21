<script setup>
// 课程目录递归节点（CourseLearningCatalog 内部用）：任意深度章节 + 课时行。
// 章节行只负责展开/折叠；课时行点击上抛 select。当前态/完成态/章节完成数
// 全部由课时数据派生（completed 翻转后自动联动，不另存一套状态）。
import { computed } from 'vue'
import {
  ArrowDown, ArrowRight, Document, EditPen, Link, Notebook, Select, VideoPlay
} from '@element-plus/icons-vue'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  index: { type: Number, default: 0 },
  currentLessonId: { type: Number, default: null }
})
const emit = defineEmits(['select'])

// 课时类型图标（克制：只区分五类）
const TYPE_ICON = { video: VideoPlay, text: Document, link: Link, quiz: EditPen, homework: Notebook }

const hasContent = (n) => (n.lessons?.length || 0) + (n.children?.length || 0) > 0

// 子树课时统计（一级章节行右侧 x/y）
const stats = computed(() => {
  const all = []
  const collect = (n) => {
    n.lessons.forEach((l) => all.push(l))
    n.children.forEach(collect)
  }
  collect(props.node)
  return { total: all.length, done: all.filter((l) => l.completed).length }
})
</script>

<template>
  <div class="cat-node">
    <!-- 章节行：一级=两位编号+完成数；二/三级=缩进+折叠箭头+弱字重 -->
    <div
      class="cat-chapter"
      :class="{ 'is-expanded': node.expanded }"
      @click="node.expanded = !node.expanded"
    >
      <span v-if="depth === 0" class="cat-num">{{ String(index + 1).padStart(2, '0') }}</span>
      <el-icon v-else class="cat-chevron">
        <ArrowDown v-if="node.expanded" />
        <ArrowRight v-else />
      </el-icon>
      <span class="cat-chapter-title">{{ node.title }}</span>
      <span v-if="depth === 0 && stats.total" class="cat-chapter-count">{{ stats.done }}/{{ stats.total }}</span>
      <el-icon v-else-if="depth === 0 && hasContent(node)" class="cat-chevron cat-chevron-tail">
        <ArrowDown v-if="node.expanded" />
        <ArrowRight v-else />
      </el-icon>
    </div>

    <div v-show="node.expanded" class="cat-group">
      <!-- 课时行：类型图标 + 标题 + 时长 + 完成勾 -->
      <div
        v-for="lesson in node.lessons"
        :key="lesson.id"
        class="cat-lesson"
        :class="{ 'is-current': lesson.id === currentLessonId, 'is-done': lesson.completed }"
        :data-lesson-id="lesson.id"
        @click="emit('select', lesson)"
      >
        <el-icon class="cat-lesson-type"><component :is="TYPE_ICON[lesson.type] || Document" /></el-icon>
        <span class="cat-lesson-title">{{ lesson.title }}</span>
        <el-icon v-if="lesson.completed" class="cat-lesson-check"><Select /></el-icon>
        <span v-else-if="lesson.duration" class="cat-lesson-duration">{{ lesson.duration }}分钟</span>
      </div>

      <CourseCatalogNode
        v-for="(child, i) in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :index="i"
        :current-lesson-id="currentLessonId"
        @select="emit('select', $event)"
      />

      <div v-if="!hasContent(node)" class="cat-empty">暂无课时</div>
    </div>
  </div>
</template>

<style scoped>
.cat-group {
  margin-left: 12px;
}

/* ── 章节行 ── */
.cat-chapter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.cat-chapter:hover { background: var(--dew-ghost-hover-bg); }

.cat-num {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--dew-text-faint);
  font-variant-numeric: tabular-nums;
}

.cat-chapter-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--dew-text-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 二/三级章节（递归嵌套一层以上）：弱字重（.cat-group 的缩进已体现层级） */
.cat-node .cat-node .cat-chapter-title { font-weight: 400; color: var(--dew-text); }

.cat-chapter-count {
  font-size: 11px;
  color: var(--dew-text-faint);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.cat-chevron {
  font-size: 12px;
  color: var(--dew-text-faint);
  flex-shrink: 0;
}
.cat-chevron-tail { margin-left: auto; }

/* ── 课时行 ── */
.cat-lesson {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.cat-lesson:hover { background: var(--dew-ghost-hover-bg); }

/* 当前课时：主题色左边线 + 浅色底 + 中等字重 */
.cat-lesson.is-current::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  border-radius: 0 2px 2px 0;
  background: var(--color-primary);
}
.cat-lesson.is-current { background: var(--color-primary-light); }
.theme-dark .cat-lesson.is-current { background: rgba(59, 130, 246, 0.16); }

.cat-lesson-type {
  font-size: 14px;
  color: var(--dew-text-faint);
  flex-shrink: 0;
}
.cat-lesson.is-current .cat-lesson-type { color: var(--color-primary); }

.cat-lesson-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dew-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cat-lesson.is-current .cat-lesson-title {
  color: var(--dew-text-heading);
  font-weight: 500;
}

.cat-lesson-duration {
  font-size: 11px;
  color: var(--dew-text-faint);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* 已完成：绿色对勾，标题保持正常可读 */
.cat-lesson-check {
  font-size: 13px;
  color: var(--color-success);
  flex-shrink: 0;
}

.cat-empty {
  padding: 4px 10px 8px 22px;
  font-size: 12px;
  color: var(--dew-text-faint);
}
</style>
