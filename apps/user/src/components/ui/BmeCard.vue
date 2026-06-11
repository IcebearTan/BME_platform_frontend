<template>
  <div
    ref="cardRef"
    class="bme-card"
    :class="[
      `bme-card--${variant}`,
      `bme-card--${size}`,
      {
        'bme-card--glass': glass,
        'bme-card--interactive': interactive,
        'bme-card--tinted': tinted,
        [`bme-card--accent-${accent}`]: accent,
      }
    ]"
    @mouseenter="onEnter"
    @mousemove="onMove"
    @mouseleave="onLeave"
    @click="interactive && $emit('click', $event)"
  >
    <!-- 折射层 -->
    <span class="bme-card__refraction" :style="refractionStyle"></span>
    <!-- 色散层 -->
    <span class="bme-card__chromatic" :style="chromaticStyle"></span>
    <!-- 顶部高光线 -->
    <span class="bme-card__highlight"></span>
    <!-- 色彩底色层（tinted 模式） -->
    <span v-if="tinted" class="bme-card__tint"></span>
    <!-- 内容 -->
    <div v-if="$slots.header" class="bme-card__header">
      <slot name="header" />
    </div>
    <div class="bme-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="bme-card__footer">
      <slot name="footer" />
    </div>
    <!-- 可交互指示器 -->
    <span v-if="interactive" class="bme-card__ripple"></span>
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
  /** 色彩底色模式：在毛玻璃下方叠加淡色渐变 */
  tinted: { type: Boolean, default: false },
  /** 强调色：primary | success | warning | danger | info */
  accent: { type: String, default: null },
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
.bme-card {
  position: relative;
  isolation: isolate;
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: var(--radius-lg);
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.04),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  overflow: hidden;
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bme-card:hover {
  background: rgba(255, 255, 255, 0.5);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.07),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

/* ━━━━ 变体 ━━━━ */

/* ── elevated：更高层级的卡片 ── */
.bme-card--elevated {
  background: rgba(255, 255, 255, 0.5);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.06),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.bme-card--elevated:hover {
  background: rgba(255, 255, 255, 0.6);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.09),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transform: translateY(-3px);
}

/* ── inset：凹陷/嵌入效果 ── */
.bme-card--inset {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.04),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.15);
}
.bme-card--inset:hover {
  background: rgba(255, 255, 255, 0.38);
  border-color: rgba(255, 255, 255, 0.32);
  box-shadow:
    inset 0 1px 6px rgba(0, 0, 0, 0.06),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.3);
  transform: none;
}

/* ━━━━ 毛玻璃模式 ━━━━ */
.bme-card--glass {
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.05),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.bme-card--glass:hover {
  background: rgba(255, 255, 255, 0.25);
  box-shadow:
    0 10px 36px rgba(0, 0, 0, 0.08),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

/* ━━━━ 可交互 ━━━━ */
.bme-card--interactive {
  cursor: pointer;
  user-select: none;
}
.bme-card--interactive:active {
  transform: translateY(0) scale(0.985) !important;
}

/* 点击涟漪层 */
.bme-card__ripple {
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
.bme-card--interactive:active .bme-card__ripple {
  opacity: 1;
  transition: opacity 0s;
}

/* ━━━━ 色彩底色 ━━━━ */
.bme-card__tint {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.35;
  background: linear-gradient(135deg, var(--tint-from, rgba(59,130,246,0.3)), var(--tint-to, rgba(139,92,246,0.2)));
}

/* ── accent 色彩变体 ── */
.bme-card--accent-primary .bme-card__tint {
  --tint-from: rgba(59,130,246,0.3);
  --tint-to: rgba(99,102,241,0.2);
}
.bme-card--accent-success .bme-card__tint {
  --tint-from: rgba(34,197,94,0.3);
  --tint-to: rgba(16,185,129,0.2);
}
.bme-card--accent-warning .bme-card__tint {
  --tint-from: rgba(245,158,11,0.3);
  --tint-to: rgba(251,146,60,0.2);
}
.bme-card--accent-danger .bme-card__tint {
  --tint-from: rgba(239,68,68,0.3);
  --tint-to: rgba(244,63,94,0.2);
}
.bme-card--accent-info .bme-card__tint {
  --tint-from: rgba(6,182,212,0.3);
  --tint-to: rgba(59,130,246,0.2);
}

/* ━━━━ 尺寸（内边距） ━━━━ */
.bme-card--sm .bme-card__header,
.bme-card--sm .bme-card__body,
.bme-card--sm .bme-card__footer { padding-left: 16px; padding-right: 16px; }
.bme-card--sm .bme-card__body { padding-top: 14px; padding-bottom: 14px; }
.bme-card--sm .bme-card__header { padding-top: 14px; }
.bme-card--sm .bme-card__footer { padding-bottom: 14px; }

.bme-card--md .bme-card__header,
.bme-card--md .bme-card__body,
.bme-card--md .bme-card__footer { padding-left: 20px; padding-right: 20px; }
.bme-card--md .bme-card__body { padding-top: 18px; padding-bottom: 18px; }
.bme-card--md .bme-card__header { padding-top: 18px; }
.bme-card--md .bme-card__footer { padding-bottom: 18px; }

.bme-card--lg .bme-card__header,
.bme-card--lg .bme-card__body,
.bme-card--lg .bme-card__footer { padding-left: 24px; padding-right: 24px; }
.bme-card--lg .bme-card__body { padding-top: 22px; padding-bottom: 22px; }
.bme-card--lg .bme-card__header { padding-top: 22px; }
.bme-card--lg .bme-card__footer { padding-bottom: 22px; }

/* ━━━━ 折射层 ━━━━ */
.bme-card__refraction {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  mix-blend-mode: overlay;
  pointer-events: none;
}

/* ━━━━ 色散层 ━━━━ */
.bme-card__chromatic {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  pointer-events: none;
  mix-blend-mode: screen;
  transition: opacity 0.4s ease;
}

/* ━━━━ 顶部高光线 ━━━━ */
.bme-card__highlight {
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
.bme-card__header {
  position: relative;
  z-index: 3;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.bme-card__body {
  position: relative;
  z-index: 3;
}

.bme-card__footer {
  position: relative;
  z-index: 3;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}
</style>
