<template>
  <div ref="trayAnchor" class="ms-tray-anchor" :style="anchorStyle">
    <div class="ms-tray-wrap" :class="{ 'is-docked': isDocked, 'is-empty': !picks.length }">
      <DewCard
        ref="trayCard"
        variant="default"
        size="md"
        :no-hover="true"
        class="tray-card"
        :class="{ 'is-empty': !picks.length }"
      >
      <div class="tray-head">
        <span class="tray-title">我的心仪导生（<span>{{ picks.length }}/3</span>）</span>
      </div>

      <div v-if="!picks.length" class="tray-empty">点击导生卡片右下角的“抢”，按心仪顺序选择导生</div>

      <TransitionGroup v-else name="tray" tag="div" class="tray-list">
        <div v-for="(pick, index) in picks" :key="pick.mentor_id" class="tray-item">
          <span class="item-rank">{{ index + 1 }}</span>
          <div class="item-main">
            <span class="item-name">{{ mentorName(pick.mentor_id) }}</span>
            <DewInput
              class="item-note"
              :model-value="pick.note"
              size="sm"
              maxlength="200"
              placeholder="给导生留一句话（可选）"
              :disabled="disabled"
              @update:model-value="(value) => $emit('update-note', index, value)"
            />
          </div>

          <button
            type="button"
            class="tray-remove"
            :disabled="disabled"
            :aria-label="`移除 ${mentorName(pick.mentor_id)}`"
            title="移除"
            @click="$emit('remove', index)"
          >
            <el-icon><Close /></el-icon>
          </button>

          <div class="item-actions">
            <DewButton
              size="sm"
              type="ghost"
              :disabled="disabled || index === 0"
              :aria-label="`将 ${mentorName(pick.mentor_id)} 左移`"
              title="左移"
              @click="$emit('move', index, -1)"
            >
              <el-icon><ArrowLeft /></el-icon>
            </DewButton>
            <DewButton
              size="sm"
              type="ghost"
              :disabled="disabled || index === picks.length - 1"
              :aria-label="`将 ${mentorName(pick.mentor_id)} 右移`"
              title="右移"
              @click="$emit('move', index, 1)"
            >
              <el-icon><ArrowRight /></el-icon>
            </DewButton>
          </div>
        </div>
      </TransitionGroup>

      <div class="tray-foot">
        <DewButton
          type="glass"
          :disabled="disabled || !canSubmit || submitting"
          :loading="submitting"
          @click="$emit('submit')"
        >
          {{ alreadySubmitted ? '修改志愿' : '提交志愿' }}
        </DewButton>
      </div>
      </DewCard>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ArrowLeft, ArrowRight, Close } from '@element-plus/icons-vue';
import { DewCard, DewButton, DewInput } from '@bme/dew-ui';

const props = defineProps({
  picks: { type: Array, default: () => [] },
  mentorNames: { type: Object, default: () => ({}) },
  round: { type: Number, default: 1 },
  alreadySubmitted: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
defineEmits(['remove', 'move', 'update-note', 'submit']);

const mentorName = (id) => props.mentorNames[id] || `导生#${id}`;
const canSubmit = computed(() => props.round === 1
  ? props.picks.length === 3
  : props.picks.length >= 1 && props.picks.length <= 3);

const trayAnchor = ref(null);
const trayCard = ref(null);
const trayHeight = ref(0);
const isDocked = ref(false);
const anchorStyle = computed(() => ({ '--tray-height': `${trayHeight.value}px` }));
let trayResizeObserver = null;

function syncDocking() {
  const anchor = trayAnchor.value;
  const card = trayCard.value?.$el || trayCard.value;
  if (!anchor || !card) return;

  trayHeight.value = card.offsetHeight;
  if (window.matchMedia('(max-width: 900px)').matches) {
    isDocked.value = false;
    return;
  }

  const dockBoundary = window.innerHeight - trayHeight.value - 12;
  isDocked.value = anchor.getBoundingClientRect().top > dockBoundary;
}

onMounted(() => {
  syncDocking();
  window.addEventListener('scroll', syncDocking, { passive: true });
  window.addEventListener('resize', syncDocking);

  const card = trayCard.value?.$el || trayCard.value;
  if (card && typeof ResizeObserver !== 'undefined') {
    trayResizeObserver = new ResizeObserver(syncDocking);
    trayResizeObserver.observe(card);
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', syncDocking);
  window.removeEventListener('resize', syncDocking);
  trayResizeObserver?.disconnect();
});
</script>

<style scoped>
.ms-tray-anchor {
  min-height: var(--tray-height, 0px);
  margin-top: 22px;
}
.ms-tray-wrap {
  position: relative;
  z-index: 5;
}
.ms-tray-wrap.is-docked {
  position: fixed;
  bottom: 12px;
  left: 50%;
  width: min(1280px, calc(100vw - 48px));
  z-index: 30;
  transform: translateX(-50%);
  animation: tray-dock-in 0.24s var(--dew-bounce, ease);
}
.tray-card {
  width: 100%;
  border-radius: var(--radius-xl);
  box-shadow: 0 16px 36px color-mix(in srgb, var(--dew-text-heading) 12%, transparent);
}
.tray-card :deep(.dew-card__body) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}
.tray-head { display: flex; align-items: center; justify-content: space-between; }
.tray-title { color: var(--dew-text-heading); font-size: 14px; font-weight: 700; }
.tray-title span { color: var(--color-primary); font-variant-numeric: tabular-nums; }
.tray-empty { min-width: 0; color: var(--dew-text-muted); font-size: 13px; text-align: center; }
.tray-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.tray-item {
  position: relative;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  min-height: 64px;
  align-items: center;
  gap: 7px;
  padding: 7px 70px 7px 8px;
  border: 1px solid var(--dew-card-flat-border);
  border-radius: var(--radius-md);
  background: var(--dew-card-flat-bg);
}
.item-rank {
  display: flex;
  width: 22px;
  height: 22px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  color: var(--dew-text-on-primary, white);
  background: var(--color-primary);
  font-size: 10px;
  font-weight: 800;
}
.item-main { min-width: 0; }
.item-name {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: var(--dew-text-heading);
  font-size: 12.5px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-note { width: 100%; min-width: 0; margin-top: 2px; }
.item-note :deep(.dew-input__field) { height: 24px; padding-inline: 0; border: 0; border-bottom: 1px solid var(--dew-card-flat-border); border-radius: 0; background: transparent; box-shadow: none; }
.item-note :deep(.dew-input__field:focus-within) { border-color: var(--color-primary); }
.tray-remove {
  position: absolute;
  top: 5px;
  right: 8px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--dew-text-faint);
  background: transparent;
  cursor: pointer;
  transition: color 0.2s ease, transform 0.2s var(--dew-bounce, ease);
}
.tray-remove:hover:not(:disabled) { color: var(--color-danger); transform: scale(1.08); }
.tray-remove:disabled { opacity: 0.42; cursor: not-allowed; }
.tray-remove .el-icon { font-size: 16px; }
.item-actions { position: absolute; right: 8px; bottom: 7px; display: flex; align-items: center; gap: 2px; }
.item-actions :deep(.dew-btn) { width: 27px; min-width: 27px; height: 27px; padding: 0; }
.tray-foot { display: flex; justify-content: flex-end; }

.tray-enter-active,
.tray-leave-active { transition: opacity 0.25s var(--dew-bounce, ease), transform 0.25s var(--dew-bounce, ease); }
.tray-enter-from,
.tray-leave-to { opacity: 0; transform: translateY(6px); }
.tray-leave-active { position: absolute; }
.tray-move { transition: transform 0.25s var(--dew-bounce, ease); }

@keyframes tray-dock-in {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .tray-enter-active,
  .tray-leave-active,
  .tray-move,
  .tray-remove,
  .ms-tray-wrap.is-docked { animation: none; transition: none; }
}
@media (max-width: 900px) {
  .ms-tray-anchor { min-height: 0; margin-top: 18px; }
  .ms-tray-wrap,
  .ms-tray-wrap.is-docked { position: static; width: auto; transform: none; }
  .tray-card :deep(.dew-card__body) { display: block; }
  .tray-head { margin-bottom: 10px; }
  .tray-empty { padding: 14px 0; }
  .tray-list { grid-template-columns: 1fr; gap: 10px; }
  .tray-item { min-height: 66px; }
  .tray-foot { margin-top: 9px; }
  .tray-foot :deep(.dew-btn) { width: 100%; }
}
</style>
