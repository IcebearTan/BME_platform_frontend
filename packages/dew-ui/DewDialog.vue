<template>
  <Teleport to="body">
    <!-- 遮罩：半透明深色 + backdrop-blur -->
    <Transition name="dew-dialog-scrim">
      <div v-if="modelValue" class="dew-dialog-scrim"></div>
    </Transition>

    <!-- 弹窗面板：居中容器 + 点击空白关闭 -->
    <Transition name="dew-dialog-panel">
      <div v-if="modelValue" class="dew-dialog-panel" @click.self="onBackdropClick">
        <div class="dew-dialog" :class="{ 'dew-dialog--glass': glass }" :style="dialogStyle">
          <!-- 标题栏 -->
          <div class="dew-dialog__header">
            <slot name="header">
              <h3 class="dew-dialog__title">{{ title }}</h3>
            </slot>
            <button v-if="showClose" class="dew-dialog__close" @click="close" aria-label="关闭">
              <el-icon><Close /></el-icon>
            </button>
          </div>

          <!-- 正文 -->
          <div class="dew-dialog__body">
            <slot />
          </div>

          <!-- 底部操作 -->
          <div v-if="$slots.footer" class="dew-dialog__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, watch, onBeforeUnmount } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
  /** 显隐（v-model） */
  modelValue: { type: Boolean, default: false },
  /** 标题 */
  title: { type: String, default: '' },
  /** 宽度（number → px） */
  width: { type: [String, Number], default: 500 },
  /** 点遮罩关闭 */
  closeOnClickModal: { type: Boolean, default: true },
  /** Esc 关闭 */
  closeOnPressEscape: { type: Boolean, default: true },
  /** 显示右上角关闭按钮 */
  showClose: { type: Boolean, default: true },
  /** 液态玻璃表面（默认开） */
  glass: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'close'])

const dialogStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onBackdropClick() {
  if (props.closeOnClickModal) close()
}

function onKeydown(e) {
  if (e.key === 'Escape' && props.closeOnPressEscape) close()
}

// 打开时锁 body 滚动 + 监听 Esc
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown)
    } else {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeydown)
    }
  }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
/* 遮罩 */
.dew-dialog-scrim {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* 居中容器（点击空白=点遮罩） */
.dew-dialog-panel {
  position: fixed;
  inset: 0;
  z-index: 2001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* 弹窗表面 */
.dew-dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 40px);
  overflow: hidden;
  border-radius: var(--radius-xl);
  border: 1px solid var(--dew-card-border);
  background: var(--dew-card-bg);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
  color: var(--dew-text);
  font-family: var(--dew-font, inherit);
}

.dew-dialog--glass {
  background: var(--dew-card-glass-bg);
  border-color: var(--dew-card-glass-border);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25), inset 0 0 0 0.5px rgba(255, 255, 255, 0.2);
}

/* 标题栏 */
.dew-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px 12px;
  flex-shrink: 0;
}

.dew-dialog__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--dew-text-heading);
  margin: 0;
}

.dew-dialog__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  margin-left: 12px;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--dew-text-muted);
  font-size: 18px;
  transition: background 0.2s ease, color 0.2s ease;
}

.dew-dialog__close:hover {
  background: var(--dew-popover-item-hover);
  color: var(--dew-text-heading);
}

/* 正文 */
.dew-dialog__body {
  padding: 0 24px 20px;
  overflow-y: auto;
  flex: 1;
  font-size: 14px;
  line-height: 1.6;
}

/* 底部 */
.dew-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 24px 18px;
  flex-shrink: 0;
}

/* ── 过渡动画 ── */
/* 遮罩：淡入淡出 */
.dew-dialog-scrim-enter-active,
.dew-dialog-scrim-leave-active {
  transition: opacity 0.3s ease;
}
.dew-dialog-scrim-enter-from,
.dew-dialog-scrim-leave-to {
  opacity: 0;
}

/* 面板：弹性缩放进场 */
.dew-dialog-panel-enter-active {
  transition: opacity 0.3s ease, transform 0.35s var(--dew-bounce);
}
.dew-dialog-panel-leave-active {
  transition: opacity 0.2s ease-in, transform 0.2s ease-in;
}
.dew-dialog-panel-enter-from {
  opacity: 0;
  transform: scale(0.92);
}
.dew-dialog-panel-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
