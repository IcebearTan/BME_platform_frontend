<template>
  <div :style="cardStyle">
    <div v-if="$slots.header" :style="headerStyle">
      <slot name="header" />
    </div>
    <div :style="bodyStyle">
      <slot />
    </div>
    <div v-if="$slots.footer" :style="footerStyle">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  glass: { type: Boolean, default: false },   // 毛玻璃效果
  hoverable: { type: Boolean, default: false }, // hover 上浮
  padding: { type: String, default: '20px' },
})

const cardStyle = computed(() => ({
  background: props.glass ? 'var(--glass-bg)' : 'var(--color-bg)',
  border: `1px solid ${props.glass ? 'var(--glass-border)' : 'var(--color-border)'}`,
  borderRadius: 'var(--radius-lg)',
  boxShadow: props.glass ? 'var(--shadow-md)' : 'var(--shadow-sm)',
  backdropFilter: props.glass ? 'var(--glass-blur)' : 'none',
  WebkitBackdropFilter: props.glass ? 'var(--glass-blur)' : 'none',
  overflow: 'hidden',
  transition: 'all var(--transition-base)',
}))

const headerStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--color-border)',
  fontWeight: '600',
  fontSize: 'var(--text-base)',
  color: 'var(--color-text)',
}

const bodyStyle = computed(() => ({
  padding: props.padding,
}))

const footerStyle = {
  padding: '12px 20px',
  borderTop: '1px solid var(--color-border)',
}
</script>
