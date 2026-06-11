<template>
  <div
    ref="barRef"
    class="bme-bar"
    :class="[`bme-bar--${size}`]"
    @mouseenter="onEnter"
    @mousemove="onMove"
    @mouseleave="onLeave"
  >
    <!-- 折射层 -->
    <span class="bme-bar__refraction" :style="refractionStyle"></span>
    <!-- 滑动指示器 -->
    <span class="bme-bar__indicator" :style="indicatorStyle"></span>
    <!-- 选项 -->
    <button
      v-for="item in items"
      :key="item.value"
      class="bme-bar__item"
      :class="{ 'bme-bar__item--active': modelValue === item.value }"
      @click="$emit('update:modelValue', item.value)"
    >
      <component v-if="item.icon" :is="item.icon" class="bme-bar__icon" />
      <span class="bme-bar__label">{{ item.label }}</span>
      <span v-if="item.badge && item.badge > 0" class="bme-bar__badge">{{ item.badge }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUpdated, nextTick, watch } from 'vue'

const props = defineProps({
  /**
   * 选项列表
   * [{ value: 'all', label: '全部', icon: Component, badge?: number }]
   */
  items: { type: Array, required: true },
  modelValue: { type: [String, Number], default: null },
  size: { type: String, default: 'md' },  // sm | md
})

defineEmits(['update:modelValue'])

const barRef = ref(null)
const state = reactive({ hovering: false, x: 0.5, y: 0.5 })
const indicator = reactive({ left: 0, width: 0 })

// 测量选中项的位置，让指示器滑动过去
function measureIndicator() {
  if (!barRef.value) return
  const idx = props.items.findIndex(i => i.value === props.modelValue)
  if (idx < 0) return
  const btn = barRef.value.querySelectorAll('.bme-bar__item')[idx]
  if (!btn) return
  indicator.left = btn.offsetLeft
  indicator.width = btn.offsetWidth
}

onMounted(() => nextTick(measureIndicator))
onUpdated(() => nextTick(measureIndicator))
watch(() => props.modelValue, () => nextTick(measureIndicator))

const indicatorStyle = computed(() => ({
  left: `${indicator.left}px`,
  width: `${indicator.width}px`,
}))

function onEnter() { state.hovering = true }
function onMove(e) {
  if (!barRef.value) return
  const r = barRef.value.getBoundingClientRect()
  state.x = (e.clientX - r.left) / r.width
  state.y = (e.clientY - r.top) / r.height
}
function onLeave() { state.hovering = false; state.x = 0.5; state.y = 0.5 }

const refractionStyle = computed(() => {
  const cx = (state.x * 100).toFixed(1)
  const cy = (state.y * 100).toFixed(1)
  const i = state.hovering ? 0.6 : 0.3
  return {
    background: `radial-gradient(ellipse at ${cx}% ${cy}%, rgba(255,255,255,${(0.4*i).toFixed(2)}) 0%, rgba(180,200,255,${(0.2*i).toFixed(2)}) 30%, rgba(200,160,255,${(0.1*i).toFixed(2)}) 50%, transparent 100%)`,
    opacity: state.hovering ? '0.8' : '0.5',
    transition: state.hovering ? 'opacity 0.1s' : 'opacity 0.4s',
  }
})
</script>

<style scoped>
.bme-bar {
  position: relative;
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.04),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  padding: 3px;
}

/* ── 尺寸 ── */
.bme-bar--sm { gap: 2px; }
.bme-bar--md { gap: 3px; }

/* ── 折射层 ── */
.bme-bar__refraction {
  position: absolute;
  inset: -2px;
  z-index: 1;
  border-radius: inherit;
  mix-blend-mode: overlay;
  pointer-events: none;
}

/* ── 滑动指示器（点亮背景） ── */
.bme-bar__indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  z-index: 2;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.45);
  box-shadow:
    0 0 16px rgba(255, 255, 255, 0.15),
    0 0 32px rgba(255, 255, 255, 0.06),
    inset 0 0 8px rgba(255, 255, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  /* 水滴弹性滑动 */
  transition:
    left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

/* ── 选项按钮 ── */
.bme-bar__item {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: none;
  border-radius: 9999px;
  background: transparent;
  cursor: pointer;
  outline: none;
  white-space: nowrap;
  font-family: inherit;
  font-weight: 500;
  color: rgba(55, 65, 81, 0.6);
  transition: color 0.25s ease;
}

.bme-bar--sm .bme-bar__item {
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
}
.bme-bar--md .bme-bar__item {
  height: 34px;
  padding: 0 16px;
  font-size: 13px;
}

.bme-bar__icon {
  width: 14px;
  height: 14px;
}

.bme-bar__label {
  line-height: 1;
}

/* ── 未读 badge ── */
.bme-bar__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* ── 选中态 ── */
.bme-bar__item--active {
  color: #1f2937;
  font-weight: 600;
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.3);
}

/* ── hover（非选中项） ── */
.bme-bar__item:not(.bme-bar__item--active):hover {
  color: rgba(55, 65, 81, 0.85);
}
</style>
