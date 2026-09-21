<script setup>
// 课时底部操作区（方案 §4.4/§6.3）：上一课（显示目标课时名）+ 完成本课并继续。
// 文案统一用「课」；完成保存中禁用重复提交，失败保留重试；
// 全部完成后给出课程完成反馈与返回入口。
import { ArrowLeft, CircleCheckFilled } from '@element-plus/icons-vue'
import { DewButton, DewTag } from '@bme/dew-ui'

defineProps({
  hasPrev: { type: Boolean, default: false },
  prevTitle: { type: String, default: '' },
  hasNext: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  canComplete: { type: Boolean, default: false },   // 课时无内容时默认不允许标记完成（§7.5）
  saving: { type: Boolean, default: false },
  saveError: { type: Boolean, default: false },
  finished: { type: Boolean, default: false }        // 本次会话完成最后一课
})
const emit = defineEmits(['prev', 'next', 'complete', 'back'])
</script>

<template>
  <!-- 课程完成反馈：最后一课完成后的收束态 -->
  <div v-if="finished" class="lesson-nav is-finished">
    <el-icon class="finished-icon"><CircleCheckFilled /></el-icon>
    <div class="finished-text">
      <span class="finished-title">课程学习完成</span>
      <span class="finished-desc">你已完成全部课时</span>
    </div>
    <button class="nav-cta" type="button" @click="emit('back')">返回课程</button>
  </div>

  <footer v-else class="lesson-nav">
    <button class="nav-prev" type="button" :disabled="!hasPrev" @click="emit('prev')">
      <el-icon><ArrowLeft /></el-icon>
      <span class="nav-prev-text">
        <span class="nav-direction">上一课</span>
        <span v-if="hasPrev" class="nav-target">{{ prevTitle }}</span>
      </span>
    </button>

    <div class="nav-next">
      <span v-if="saveError" class="nav-error">保存失败，请重试</span>
      <DewTag v-if="isCompleted" type="success">已完成</DewTag>

      <button
        v-if="!isCompleted && canComplete"
        class="nav-cta"
        type="button"
        :disabled="saving"
        @click="emit('complete')"
      >
        {{ saving ? '保存中…' : (hasNext ? '完成本课并继续' : '完成本课并返回课程') }}
      </button>
      <DewButton v-else-if="hasNext" size="lg" @click="emit('next')">下一课</DewButton>
      <DewButton v-else size="lg" type="ghost" @click="emit('back')">返回课程</DewButton>
    </div>
  </footer>
</template>

<style scoped>
.lesson-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 32px 48px 0;
  padding-top: 24px;
  border-top: 1px solid var(--dew-card-flat-divider);
}

/* ── 上一课：两行文字的次级按钮 ── */
.nav-prev {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  max-width: 340px;
  padding: 8px 14px 8px 10px;
  border: 1px solid var(--dew-card-flat-border);
  border-radius: var(--radius-md);
  background: var(--dew-card-flat-bg);
  cursor: pointer;
  transition: background 0.15s ease;
  font-family: var(--dew-font);
  color: var(--dew-text);
}
.nav-prev:hover:not(:disabled) { background: var(--dew-card-flat-bg-hover); }
.nav-prev:disabled { opacity: 0.4; cursor: not-allowed; }

.nav-prev-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.nav-direction {
  font-size: 13px;
  font-weight: 500;
  color: var(--dew-text);
}

.nav-target {
  max-width: 280px;
  font-size: 12px;
  color: var(--dew-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 右侧：完成 / 下一课 ── */
.nav-next {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.nav-error {
  font-size: 12px;
  color: var(--color-danger);
  white-space: nowrap;
}

/* 主操作：实色主题按钮（token 色，无渐变；DewButton 无实色主操作变体） */
.nav-cta {
  height: 40px;
  padding: 0 22px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--dew-font);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
  white-space: nowrap;
}
.nav-cta:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}
.nav-cta:active:not(:disabled) { transform: translateY(0.5px); }
.nav-cta:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── 课程完成态 ── */
.lesson-nav.is-finished {
  justify-content: flex-start;
  gap: 14px;
}

.finished-icon {
  font-size: 34px;
  color: var(--color-success);
  flex-shrink: 0;
}

.finished-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-right: auto;
}

.finished-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

.finished-desc {
  font-size: 12px;
  color: var(--dew-text-muted);
}
</style>
