<template>
  <div class="ms-tray-wrap">
    <DewCard variant="default" size="md" :no-hover="true" class="tray-card">
      <div class="tray-head">
        <span class="tray-title">我的志愿（{{ picks.length }}/3）</span>
        <span class="tray-deadline">{{ deadlineText }}</span>
      </div>

      <div v-if="!picks.length" class="tray-empty">从上方导生卡片点「加入志愿」，按优先级排序，最多 3 个</div>

      <TransitionGroup v-else name="tray" tag="div" class="tray-list">
        <div v-for="(p, i) in picks" :key="p.mentor_id" class="tray-item">
          <span class="item-rank">{{ i + 1 }}</span>
          <span class="item-name">{{ mentorName(p.mentor_id) }}</span>
          <DewInput
            class="item-note"
            :model-value="p.note"
            size="sm"
            placeholder="给导生留一句话（可选）"
            :disabled="disabled"
            @update:model-value="(v) => $emit('update-note', i, v)"
          />
          <DewButton size="sm" type="ghost" :disabled="disabled || i === 0" @click="$emit('move-up', i)">上移</DewButton>
          <DewButton size="sm" type="ghost" :disabled="disabled" @click="$emit('remove', i)">移除</DewButton>
        </div>
      </TransitionGroup>

      <div class="tray-foot">
        <span class="tray-hint">提交后{{ round === 2 ? '二轮' : '' }}截止前仍可修改，整组替换</span>
        <DewButton
          type="glass"
          :disabled="disabled || !picks.length || submitting"
          :loading="submitting"
          @click="$emit('submit')"
        >
          {{ alreadySubmitted ? '修改志愿' : '提交志愿' }}
        </DewButton>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { DewCard, DewButton, DewInput } from '../ui';

const props = defineProps({
  picks: { type: Array, default: () => [] },        // [{mentor_id, note}]
  mentorNames: { type: Object, default: () => ({}) }, // {mentor_id: name}
  deadline: { type: String, default: '' },          // 'YYYY-MM-DD HH:MM'
  round: { type: Number, default: 1 },
  alreadySubmitted: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
defineEmits(['remove', 'move-up', 'update-note', 'submit']);

const mentorName = (id) => props.mentorNames[id] || `导生#${id}`;

// 截止倒计时（分钟级刷新）
const nowTs = ref(Date.now());
let timer = null;
onMounted(() => { timer = setInterval(() => { nowTs.value = Date.now(); }, 30_000); });
onUnmounted(() => clearInterval(timer));

const deadlineText = computed(() => {
  if (!props.deadline) return '';
  const dl = new Date(props.deadline.replace(' ', 'T'));
  if (Number.isNaN(dl.getTime())) return `截止 ${props.deadline}`;
  const diff = dl.getTime() - nowTs.value;
  if (diff <= 0) return '已截止';
  const m = Math.floor(diff / 60_000);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  const left = d > 0 ? `${d} 天 ${h} 小时` : h > 0 ? `${h} 小时 ${mm} 分` : `${mm} 分钟`;
  return `距截止 ${left}`;
});
</script>

<style scoped>
.ms-tray-wrap {
  position: sticky;
  bottom: 12px;
  z-index: 5;
}

.tray-card { width: 100%; }

.tray-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.tray-title { font-size: 14px; font-weight: 600; color: var(--dew-text-heading); }
.tray-deadline { font-size: 12px; color: var(--color-primary); font-weight: 500; }

.tray-empty {
  padding: 14px 0;
  font-size: 13px;
  color: var(--dew-text-muted);
  text-align: center;
}

.tray-list { display: flex; flex-direction: column; gap: 8px; }

.tray-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md, 12px);
  background: var(--dew-card-flat-bg, rgba(0, 0, 0, 0.03));
}

.item-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--color-primary);
  color: #fff;
}

.item-name { font-size: 13px; font-weight: 600; color: var(--dew-text); flex: none; max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-note { flex: 1; min-width: 120px; }

.tray-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.tray-hint { font-size: 12px; color: var(--dew-text-faint); }

/* 列表项增删过渡 */
.tray-enter-active, .tray-leave-active { transition: all 0.25s var(--dew-bounce, ease); }
.tray-enter-from, .tray-leave-to { opacity: 0; transform: translateY(6px); }
.tray-leave-active { position: absolute; width: 100%; }
.tray-move { transition: transform 0.25s var(--dew-bounce, ease); }
</style>
