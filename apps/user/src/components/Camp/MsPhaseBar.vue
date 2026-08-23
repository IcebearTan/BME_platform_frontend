<template>
  <div class="ms-phase-bar">
    <template v-for="(s, i) in steps" :key="s.key">
      <div v-if="i > 0" class="ph-line" :class="{ passed: s.idx <= currentIndex }"></div>
      <div class="ph-step" :class="`is-${s.state}`">
        <span class="ph-dot">
          <el-icon v-if="s.state === 'done'"><Check /></el-icon>
          <span v-else class="ph-num">{{ i + 1 }}</span>
        </span>
        <span class="ph-label">{{ s.label }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Check } from '@element-plus/icons-vue';

const props = defineProps({
  phase: { type: String, default: 'disabled' },
  round2Enabled: { type: Boolean, default: false },
});

// 阶段 → 全局步骤索引（disabled 由父级隐藏本组件，兜底按 -1 处理）
const INDEX = { upcoming: 0, collecting: 1, round1: 2, round2: 3, done: 4 };
const currentIndex = computed(() => INDEX[props.phase] ?? -1);

const steps = computed(() => {
  const cur = currentIndex.value;
  const all = [
    { key: 'upcoming', label: '名片展示' },
    { key: 'collecting', label: '志愿提交' },
    { key: 'round1', label: '导生挑选' },
    { key: 'round2', label: '二轮互选' },
    { key: 'done', label: '完成' },
  ];
  // 未配置二轮：整个步骤不显示（相位判定仍按全局 INDEX，不受过滤影响）
  const shown = props.round2Enabled ? all : all.filter((s) => s.key !== 'round2');
  return shown.map((s) => {
    const idx = INDEX[s.key];
    return { ...s, idx, state: cur > idx ? 'done' : cur === idx ? 'current' : 'todo' };
  });
});
</script>

<style scoped>
.ms-phase-bar {
  display: flex;
  align-items: flex-start;
  padding: 14px 6px 6px;
}

.ph-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  min-width: 56px;
}

.ph-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: var(--dew-card-flat-bg, rgba(0, 0, 0, 0.04));
  color: var(--dew-text-muted);
  border: 1.5px solid transparent;
  transition: all 0.3s var(--dew-bounce, ease);
}

.ph-num { line-height: 1; }

/* 当前步：主色点亮 */
.is-current .ph-dot {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 16%, transparent);
  transform: scale(1.08);
}

/* 已完成步 */
.is-done .ph-dot {
  background: var(--color-primary);
  color: #fff;
  opacity: 0.85;
}

.ph-label {
  font-size: 11px;
  color: var(--dew-text-muted);
  white-space: nowrap;
}
.is-current .ph-label { color: var(--color-primary); font-weight: 600; }
.is-done .ph-label { color: var(--dew-text); }

/* 连接线 */
.ph-line {
  flex: 1;
  height: 2px;
  margin-top: 13px;
  min-width: 12px;
  border-radius: 2px;
  background: var(--dew-card-flat-bg, rgba(0, 0, 0, 0.08));
}
.ph-line.passed {
  background: var(--color-primary);
  opacity: 0.75;
}
</style>
