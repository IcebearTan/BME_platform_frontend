<script setup>
// 学习页固定顶栏（方案 §4.1）：返回课程 / 课程名 / 当前章节 / 课时进度 / 目录开关。
// 上下文始终可见——用户滚动长文时仍能确认位置。返回行为由父级决定
//（营期语境回营期学习方向，普通入口回课程详情）。
import { ArrowLeft, Fold, Expand } from '@element-plus/icons-vue'

defineProps({
  courseTitle: { type: String, default: '' },
  chapterTitle: { type: String, default: '' },
  completed: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  collapsed: { type: Boolean, default: false }
})
const emit = defineEmits(['back', 'toggle-catalog'])
</script>

<template>
  <header class="learning-topbar">
    <button class="tb-back" type="button" @click="emit('back')">
      <el-icon><ArrowLeft /></el-icon>
      <span>返回课程</span>
    </button>

    <span class="tb-divider" aria-hidden="true"></span>

    <div class="tb-context">
      <span class="tb-course">{{ courseTitle }}</span>
      <template v-if="chapterTitle">
        <span class="tb-sep" aria-hidden="true">/</span>
        <span class="tb-chapter">{{ chapterTitle }}</span>
      </template>
    </div>

    <div class="tb-right">
      <span class="tb-kbd-hint" title="快捷键切换上一课/下一课">Ctrl/⌘ + ←/→ 切换课时</span>
      <span class="tb-count">{{ completed }}/{{ total }} 课时</span>
      <button class="tb-toggle" type="button" @click="emit('toggle-catalog')">
        <el-icon><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
        <span>{{ collapsed ? '展开目录' : '收起目录' }}</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.learning-topbar {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--dew-card-flat-border);
  position: relative;
  z-index: 10;
}

.theme-dark .learning-topbar {
  background: rgba(22, 22, 26, 0.72);
}

.tb-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--dew-text);
  font-size: 13px;
  font-family: var(--dew-font);
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
}
.tb-back:hover { background: var(--dew-ghost-hover-bg); }

.tb-divider {
  width: 1px;
  height: 20px;
  background: var(--dew-card-flat-divider);
  flex-shrink: 0;
}

/* 课程名一级上下文，章节名弱化；空间不足时单行省略 */
.tb-context {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 14px;
  overflow: hidden;
  white-space: nowrap;
}

.tb-course {
  font-weight: 600;
  color: var(--dew-text-heading);
  overflow: hidden;
  text-overflow: ellipsis;
}

.tb-sep { color: var(--dew-text-faint); }

.tb-chapter {
  color: var(--dew-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
}

.tb-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.tb-kbd-hint {
  font-size: 12px;
  color: var(--dew-text-faint);
  white-space: nowrap;
}

.tb-count {
  font-size: 13px;
  color: var(--dew-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tb-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--dew-card-flat-border);
  border-radius: var(--radius-sm);
  background: var(--dew-card-flat-bg);
  color: var(--dew-text);
  font-size: 12px;
  font-family: var(--dew-font);
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}
.tb-toggle:hover { background: var(--dew-card-flat-bg-hover); }

/* 窄桌面优先保进度与开关，快捷键提示先让位 */
@media (max-width: 1360px) {
  .tb-kbd-hint { display: none; }
}
</style>
