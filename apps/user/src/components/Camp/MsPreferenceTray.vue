<template>
  <div ref="trayAnchor" class="ms-tray-anchor">
    <div class="ms-tray-wrap" :class="{ 'is-docked': isDocked, 'is-empty': !picks.length }">
      <DewCard
        variant="default"
        size="md"
        :no-hover="true"
        class="tray-card"
        :class="{ 'is-empty': !picks.length }"
      >
      <div class="tray-head">
        <span class="tray-title">我的心仪导生（<span>{{ picks.length }}/3</span>）</span>
      </div>

      <div v-if="!picks.length" class="tray-empty">使用导生卡片上的购物车按钮，按心仪顺序选择导生</div>

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

          <DewButton
            type="ghost"
            size="sm"
            class="tray-remove"
            :disabled="disabled"
            :aria-label="`移除 ${mentorName(pick.mentor_id)}`"
            title="移除"
            @click="$emit('remove', index)"
          >
            <el-icon><Close /></el-icon>
          </DewButton>

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

      <Transition name="compact-tray">
        <div v-if="isDocked" class="compact-summary" aria-label="心仪导生摘要">
          <div class="compact-count"><span>已选</span><strong>{{ picks.length }}/3</strong></div>
          <div class="compact-picks">
            <div v-for="index in 3" :key="index" class="compact-pick" :class="{ 'is-empty': !picks[index - 1] }">
              <span>{{ index }}</span>
              <b>{{ picks[index - 1] ? mentorName(picks[index - 1].mentor_id) : '待选择' }}</b>
            </div>
          </div>
          <button type="button" class="compact-open" @click="showPreferences">查看志愿</button>
        </div>
      </Transition>
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
// 09-12 用户拍板：志愿数放宽为 1-3（不非得选满三个才可提交；后端同口径 1<=n<=3）
const canSubmit = computed(() => props.picks.length >= 1 && props.picks.length <= 3);

const trayAnchor = ref(null);
const isDocked = ref(false);
let layoutObserver;

function showPreferences() {
  trayAnchor.value?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'center',
  });
}

function syncDocking() {
  const anchor = trayAnchor.value;
  if (!anchor) return;
  isDocked.value = anchor.getBoundingClientRect().top > window.innerHeight - 24;
}

onMounted(() => {
  syncDocking();
  window.addEventListener('scroll', syncDocking, { passive: true });
  window.addEventListener('resize', syncDocking);
  layoutObserver = new ResizeObserver(syncDocking);
  if (trayAnchor.value?.parentElement) layoutObserver.observe(trayAnchor.value.parentElement);
});

onUnmounted(() => {
  window.removeEventListener('scroll', syncDocking);
  window.removeEventListener('resize', syncDocking);
  layoutObserver?.disconnect();
});
</script>

<style scoped>
.ms-tray-anchor {
  margin-top: 22px;
}
.ms-tray-wrap {
  position: relative;
  z-index: 5;
}
.compact-summary {
  position: fixed;
  bottom: 12px;
  left: 50%;
  display: grid;
  width: min(920px, calc(100vw - 48px));
  min-height: 64px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 9px 10px 9px 16px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, var(--dew-card-flat-border));
  border-radius: var(--radius-xl);
  color: var(--dew-text-heading);
  background: color-mix(in srgb, var(--dew-card-flat-bg) 94%, transparent);
  box-shadow: 0 16px 38px color-mix(in srgb, var(--dew-text-heading) 16%, transparent);
  box-sizing: border-box;
  z-index: 30;
  transform: translateX(-50%);
  backdrop-filter: blur(20px) saturate(1.25);
  animation: tray-dock-in 0.24s var(--dew-bounce, ease);
}
.compact-count { display: flex; align-items: baseline; gap: 6px; color: var(--dew-text-muted); font-size: 12px; white-space: nowrap; }
.compact-count strong { color: var(--color-primary); font-size: 18px; font-variant-numeric: tabular-nums; }
.compact-picks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.compact-pick { display: flex; min-width: 0; align-items: center; gap: 7px; padding: 7px 9px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-primary) 7%, var(--dew-card-flat-bg)); }
.compact-pick > span { display: grid; width: 19px; height: 19px; flex: none; place-items: center; border-radius: 50%; color: var(--dew-text-on-primary, white); background: var(--color-primary); font-size: 10px; font-weight: 800; }
.compact-pick b { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.compact-pick.is-empty { color: var(--dew-text-faint); background: var(--dew-card-inset-bg); }
.compact-pick.is-empty > span { color: var(--dew-text-muted); background: var(--dew-card-flat-border); }
.compact-open { min-height: 38px; padding: 0 14px; border: 0; border-radius: var(--radius-md); color: var(--dew-text-on-primary, white); background: var(--color-primary); font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.compact-open:hover { background: var(--color-primary-hover); }
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
  top: 3px;
  right: 6px;
  width: 27px;
  min-width: 27px;
  height: 27px;
  padding: 0;
}
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
.compact-tray-enter-active,
.compact-tray-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.compact-tray-enter-from,
.compact-tray-leave-to { opacity: 0; transform: translate(-50%, 8px); }

@keyframes tray-dock-in {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .tray-enter-active,
  .tray-leave-active,
  .tray-move,
  .tray-remove,
  .compact-summary { animation: none; transition: none; }
}
@media (max-width: 900px) {
  .ms-tray-anchor { min-height: 0; margin-top: 18px; }
  .tray-card :deep(.dew-card__body) { display: block; }
  .tray-head { margin-bottom: 10px; }
  .tray-empty { padding: 14px 0; }
  .tray-list { grid-template-columns: 1fr; gap: 10px; }
  .tray-item { min-height: 66px; }
  .tray-foot { margin-top: 9px; }
  .tray-foot :deep(.dew-btn) { width: 100%; }
  .compact-summary { bottom: 10px; width: calc(100vw - 24px); grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; padding: 8px 8px 8px 12px; border-radius: var(--radius-lg); }
  .compact-picks { grid-template-columns: repeat(3, minmax(42px, 1fr)); gap: 4px; }
  .compact-pick { justify-content: center; padding: 7px 5px; }
  .compact-pick > span { display: none; }
  .compact-open { min-height: 36px; padding: 0 10px; font-size: 12px; }
}
@media (max-width: 520px) {
  .compact-summary { grid-template-columns: auto minmax(0, 1fr); }
  .compact-picks { display: flex; min-width: 0; }
  .compact-pick { display: none; }
  .compact-pick:not(.is-empty) { display: block; flex: 1; overflow: hidden; }
  .compact-open { grid-column: 2; grid-row: 1; justify-self: end; }
}
</style>
