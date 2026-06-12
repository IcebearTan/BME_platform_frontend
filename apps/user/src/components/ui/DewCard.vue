<template>
  <div
    ref="cardRef"
    class="dew-card"
    :class="[
      `dew-card--${variant}`,
      `dew-card--${size}`,
      {
        'dew-card--glass': glass,
        'dew-card--interactive': interactive,
        'dew-card--no-hover': noHover,
        'dew-card--divided': divided,
        'dew-card--tinted': tinted,
        [`dew-card--accent-${accent}`]: accent,
      }
    ]"
    @mouseenter="onEnter"
    @mousemove="onMove"
    @mouseleave="onLeave"
    @click="interactive && $emit('click', $event)"
  >
    <!-- 折射层 -->
    <span class="dew-card__refraction" :style="refractionStyle"></span>
    <!-- 色散层 -->
    <span class="dew-card__chromatic" :style="chromaticStyle"></span>
    <!-- 顶部高光线 -->
    <span class="dew-card__highlight"></span>
    <!-- 色彩底色层（tinted 模式） -->
    <span v-if="tinted" class="dew-card__tint"></span>
    <!-- 内容 -->
    <div v-if="$slots.header" class="dew-card__header">
      <slot name="header" />
    </div>
    <div class="dew-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="dew-card__footer">
      <slot name="footer" />
    </div>
    <!-- 可交互指示器 -->
    <span v-if="interactive" class="dew-card__ripple"></span>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const props = defineProps({
  /** 卡片变体：default | elevated | inset */
  variant: { type: String, default: 'default' },
  /** 尺寸：sm | md | lg */
  size: { type: String, default: 'md' },
  /** 毛玻璃效果（更强的模糊和透明度） */
  glass: { type: Boolean, default: false },
  /** 可交互卡片：显示点击反馈，带 cursor: pointer */
  interactive: { type: Boolean, default: false },
  /** 禁用悬停上浮效果 */
  noHover: { type: Boolean, default: false },
  /** 色彩底色模式：在毛玻璃下方叠加淡色渐变 */
  tinted: { type: Boolean, default: false },
  /** 强调色：primary | success | warning | danger | info */
  accent: { type: String, default: null },
  /** 显示 header 底部分割线 */
  divided: { type: Boolean, default: false },
})

defineEmits(['click'])

const cardRef = ref(null)
const state = reactive({ hovering: false, x: 0.5, y: 0.5 })

function onEnter() { state.hovering = true }
function onMove(e) {
  if (!cardRef.value) return
  const r = cardRef.value.getBoundingClientRect()
  state.x = (e.clientX - r.left) / r.width
  state.y = (e.clientY - r.top) / r.height
}
function onLeave() { state.hovering = false; state.x = 0.5; state.y = 0.5 }

const refractionStyle = computed(() => {
  const cx = (state.x * 100).toFixed(1)
  const cy = (state.y * 100).toFixed(1)
  const i = state.hovering ? 0.5 : 0.25
  return {
    background: `radial-gradient(ellipse at ${cx}% ${cy}%, rgba(255,255,255,${(0.35*i).toFixed(2)}) 0%, rgba(180,200,255,${(0.18*i).toFixed(2)}) 25%, rgba(200,160,255,${(0.1*i).toFixed(2)}) 45%, transparent 100%)`,
    opacity: state.hovering ? '0.9' : '0.5',
    transition: state.hovering ? 'opacity 0.15s' : 'opacity 0.4s',
  }
})

const chromaticStyle = computed(() => {
  if (!state.hovering) return { opacity: '0' }
  const cx = (state.x * 100).toFixed(1)
  const cy = (state.y * 100).toFixed(1)
  return {
    opacity: '0.7',
    background: `radial-gradient(ellipse at ${cx}% ${cy}%, rgba(255,150,150,0.05) 0%, rgba(150,255,150,0.04) 30%, rgba(150,150,255,0.06) 60%, transparent 100%)`,
  }
})
</script>

<style scoped>
.dew-card {
  position: relative;
  isolation: isolate;
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  background: var(--dew-card-bg);
  border: 1px solid var(--dew-card-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--dew-card-shadow);
  overflow: hidden;
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dew-card:hover {
  background: var(--dew-card-bg-hover);
  box-shadow: var(--dew-card-shadow-hover);
  transform: translateY(-2px);
}

/* ━━━━ 变体 ━━━━ */

/* ── elevated ── */
.dew-card--elevated {
  background: var(--dew-card-elevated-bg);
  box-shadow: var(--dew-card-elevated-shadow);
}
.dew-card--elevated:hover {
  background: var(--dew-card-elevated-bg-hover);
  box-shadow: var(--dew-card-elevated-shadow-hover);
  transform: translateY(-3px);
}

/* ── inset ── */
.dew-card--inset {
  background: var(--dew-card-inset-bg);
  border-color: var(--dew-card-inset-border);
  box-shadow: var(--dew-card-inset-shadow);
}
.dew-card--inset:hover {
  background: var(--dew-card-inset-bg-hover);
  border-color: var(--dew-card-inset-border-hover);
  box-shadow: var(--dew-card-inset-shadow-hover);
  transform: none;
}

/* ━━━━ 毛玻璃模式 ━━━━ */
.dew-card--glass {
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  background: var(--dew-card-glass-bg);
  border-color: var(--dew-card-glass-border);
  box-shadow: var(--dew-card-glass-shadow);
}
.dew-card--glass:hover {
  background: var(--dew-card-glass-bg-hover);
  box-shadow: var(--dew-card-glass-shadow-hover);
}

/* ━━━━ 可交互 ━━━━ */
.dew-card--interactive {
  cursor: pointer;
  user-select: none;
}
.dew-card--interactive:active {
  transform: translateY(0) scale(0.985) !important;
}

/* ━━━━ 禁用悬停（放在变体之后，靠源码顺序覆盖所有 hover transform） ━━━━ */
.dew-card--no-hover:hover {
  transform: none;
}

/* 点击涟漪层 */
.dew-card__ripple {
  position: absolute;
  inset: 0;
  z-index: 4;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(circle at var(--ripple-x, 50%) var(--ripple-y, 50%),
    rgba(255, 255, 255, 0.25) 0%,
    transparent 60%);
  opacity: 0;
  transition: opacity 0.4s ease;
}
.dew-card--interactive:active .dew-card__ripple {
  opacity: 1;
  transition: opacity 0s;
}

/* ━━━━ 色彩底色 ━━━━ */
.dew-card__tint {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.35;
  background: linear-gradient(135deg, var(--tint-from, rgba(59,130,246,0.3)), var(--tint-to, rgba(139,92,246,0.2)));
}

/* ── accent 色彩变体 ── */
.dew-card--accent-primary .dew-card__tint {
  --tint-from: rgba(59,130,246,0.3);
  --tint-to: rgba(99,102,241,0.2);
}
.dew-card--accent-success .dew-card__tint {
  --tint-from: rgba(34,197,94,0.3);
  --tint-to: rgba(16,185,129,0.2);
}
.dew-card--accent-warning .dew-card__tint {
  --tint-from: rgba(245,158,11,0.3);
  --tint-to: rgba(251,146,60,0.2);
}
.dew-card--accent-danger .dew-card__tint {
  --tint-from: rgba(239,68,68,0.3);
  --tint-to: rgba(244,63,94,0.2);
}
.dew-card--accent-info .dew-card__tint {
  --tint-from: rgba(6,182,212,0.3);
  --tint-to: rgba(59,130,246,0.2);
}

/* ━━━━ 尺寸（内边距） ━━━━ */
.dew-card--sm .dew-card__header,
.dew-card--sm .dew-card__body,
.dew-card--sm .dew-card__footer { padding-left: 14px; padding-right: 14px; }
.dew-card--sm .dew-card__body { padding-top: 10px; padding-bottom: 10px; }
.dew-card--sm .dew-card__header { padding-top: 12px; }
.dew-card--sm .dew-card__footer { padding-bottom: 12px; }

.dew-card--md .dew-card__header,
.dew-card--md .dew-card__body,
.dew-card--md .dew-card__footer { padding-left: 16px; padding-right: 16px; }
.dew-card--md .dew-card__body { padding-top: 12px; padding-bottom: 12px; }
.dew-card--md .dew-card__header { padding-top: 14px; }
.dew-card--md .dew-card__footer { padding-bottom: 14px; }

.dew-card--lg .dew-card__header,
.dew-card--lg .dew-card__body,
.dew-card--lg .dew-card__footer { padding-left: 20px; padding-right: 20px; }
.dew-card--lg .dew-card__body { padding-top: 14px; padding-bottom: 14px; }
.dew-card--lg .dew-card__header { padding-top: 16px; }
.dew-card--lg .dew-card__footer { padding-bottom: 16px; }

/* ━━━━ 折射层 ━━━━ */
.dew-card__refraction {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  mix-blend-mode: overlay;
  pointer-events: none;
}

/* ━━━━ 色散层 ━━━━ */
.dew-card__chromatic {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  pointer-events: none;
  mix-blend-mode: screen;
  transition: opacity 0.4s ease;
}

/* ━━━━ 顶部高光线 ━━━━ */
.dew-card__highlight {
  position: absolute;
  top: 0;
  left: 15%;
  right: 15%;
  height: 1px;
  z-index: 2;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  pointer-events: none;
}

/* ━━━━ 结构层 ━━━━ */
.dew-card__header {
  position: relative;
  z-index: 3;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text);
}

/* ━━━━ 分割线（divided 模式下 header 底部显示） ━━━━ */
.dew-card--divided .dew-card__header {
  border-bottom: 1px solid var(--dew-card-divider);
}

.dew-card__body {
  position: relative;
  z-index: 3;
}

.dew-card__footer {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
