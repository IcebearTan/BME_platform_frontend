<template>
  <DewPopover v-model="open" placement="top" :show-arrow="false" width="min(304px, calc(100vw - 24px))" :disabled="disabled">
    <template #trigger>
      <DewButton ref="trigger" type="ghost" size="sm" :disabled="disabled" :aria-expanded="open" aria-label="插入表情" @mousedown.prevent>
        <el-icon><Sunny /></el-icon><span>表情</span>
      </DewButton>
    </template>
    <div ref="panel" class="emoji-picker" data-dew-focus-scope role="group" aria-label="常用表情" @keydown="onKeydown">
      <div class="emoji-picker__heading"><span>常用表情</span><button type="button" aria-label="关闭表情" @click="close"><el-icon><Close /></el-icon></button></div>
      <div class="emoji-picker__grid">
        <button v-for="(item, index) in communityEmoji" :key="item.label" type="button" :aria-label="item.label" :title="item.label" :tabindex="index === active ? 0 : -1" @focus="active = index" @click="select(item.value)">{{ item.value }}</button>
      </div>
      <p>点选后插入正文，与文字一起发布</p>
    </div>
  </DewPopover>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { Sunny, Close } from '@element-plus/icons-vue'
import { DewPopover, DewButton } from '@bme/dew-ui'
import { communityEmoji } from './communityEmoji'

const props = defineProps({ disabled: Boolean })
const emit = defineEmits(['select'])
const open = ref(false), active = ref(0), panel = ref(), trigger = ref()
watch(open, async value => {
  if (!value) return
  active.value = 0
  await nextTick()
  panel.value?.querySelector('.emoji-picker__grid button')?.focus({ preventScroll: true })
})
watch(() => props.disabled, value => { if (value) open.value = false })
function close() {
  open.value = false
  trigger.value?.$el.focus({ preventScroll: true })
}
function select(value) {
  if (props.disabled) return
  open.value = false
  emit('select', value)
}
function onKeydown(event) {
  if (event.key === 'Escape' || event.key === 'Tab') {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }
  const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }
  if (!(event.key in offsets) && event.key !== 'Home' && event.key !== 'End') return
  event.preventDefault()
  const total = communityEmoji.length
  active.value = event.key === 'Home' ? 0 : event.key === 'End' ? total - 1 : (active.value + offsets[event.key] + total) % total
  panel.value?.querySelectorAll('.emoji-picker__grid button')[active.value]?.focus()
}
</script>

<style scoped>
.emoji-picker { padding: 12px; color: var(--dew-text-heading); }
.emoji-picker__heading { display: flex; align-items: center; justify-content: space-between; margin: 0 2px 9px; font-size: 12px; font-weight: 600; }
.emoji-picker__heading button { width: 24px; height: 24px; padding: 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--dew-text-muted); cursor: pointer; }
.emoji-picker__grid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 2px; }
.emoji-picker__grid button { display: grid; place-items: center; min-width: 0; height: 36px; padding: 0; border: 0; border-radius: var(--radius-sm); background: transparent; cursor: pointer; font: 24px/1 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; }
.emoji-picker button:hover, .emoji-picker button:focus-visible { background: var(--dew-ghost-hover-bg); outline: 1px solid var(--dew-card-flat-border); outline-offset: -1px; }
.emoji-picker p { margin: 10px 2px 0; font-size: 11px; line-height: 1.5; color: var(--dew-text-faint); }
:global(.dew-popover:has(> .emoji-picker)) { padding: 0; border: 1px solid var(--dew-card-flat-border); border-radius: var(--radius-lg); }
</style>
