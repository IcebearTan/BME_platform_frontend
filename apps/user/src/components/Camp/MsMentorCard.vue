<template>
  <DewCard variant="inset" size="sm" class="mentor-card" :class="{ picked: pickedRank > 0, full }">
    <!-- 封面：照片（无照片 → 姓名首字色块，同课程卡哈希色） -->
    <div class="card-photo">
      <img v-if="photoSrc" :src="photoSrc" alt="" loading="lazy" />
      <div v-else class="photo-fallback" :style="{ background: fallbackColor }">
        {{ initial }}
      </div>
      <!-- 剩余名额角标 -->
      <span class="cap-badge" :class="{ 'is-full': full }">
        {{ full ? '已满' : `余 ${mentor.remaining}` }}
      </span>
      <!-- 已入志愿角标 -->
      <span v-if="pickedRank > 0" class="rank-badge">志愿 {{ pickedRank }}</span>
    </div>

    <div class="card-meta">
      <div class="name-row">
        <span class="name">{{ mentor.username }}</span>
        <span class="cap-text">{{ mentor.matched }}/{{ mentor.capacity }} 名额</span>
      </div>
      <div v-if="mentor.tags?.length" class="tag-row">
        <DewTag v-for="t in mentor.tags" :key="t" size="sm" round>{{ t }}</DewTag>
      </div>
      <p class="bio">{{ mentor.bio || '这位导生还没有写介绍。' }}</p>
      <div class="card-actions">
        <DewButton
          v-if="selectable"
          size="sm"
          :type="pickedRank > 0 ? 'ghost' : 'glass'"
          :disabled="full && pickedRank === 0"
          @click="$emit('toggle')"
        >
          {{ pickedRank > 0 ? '移出志愿' : (full ? '已满' : '加入志愿') }}
        </DewButton>
        <slot name="action"></slot>
      </div>
    </div>
  </DewCard>
</template>

<script setup>
import { computed } from 'vue';
import { DewCard, DewButton, DewTag } from '../ui';
import { assetUrl } from '../../services/campService';

const props = defineProps({
  mentor: { type: Object, required: true },
  pickedRank: { type: Number, default: 0 },   // 0 = 未在志愿中
  selectable: { type: Boolean, default: false },
});
defineEmits(['toggle']);

const full = computed(() => !!props.mentor.full);
const photoSrc = computed(() => assetUrl(props.mentor.photo_url));
const initial = computed(() => (props.mentor.username || '?').trim().charAt(0).toUpperCase());

// 无照片回退色块：姓名哈希到固定色板（同课程卡逻辑，同名同色）
const COLOR_PALETTE = ['#b391ff', '#91bdff', '#91ffde', '#ffcc91', '#ff91c0'];
const fallbackColor = computed(() => {
  let hash = 0;
  const s = props.mentor.username || '';
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
});
</script>

<style scoped>
.mentor-card { transition: transform 0.3s var(--dew-bounce, ease); }
.mentor-card:hover { transform: translateY(-3px); }
.mentor-card.picked { outline: 1.5px solid color-mix(in srgb, var(--color-primary) 55%, transparent); }
.mentor-card.full { opacity: 0.72; }
.mentor-card :deep(.dew-card__body) { padding: 0; }

.card-photo {
  position: relative;
  min-height: 128px;
  overflow: hidden;
  border-radius: var(--radius-md, 12px) var(--radius-md, 12px) 0 0;
}
.card-photo img {
  width: 100%;
  height: 128px;
  object-fit: cover;
  display: block;
}
.photo-fallback {
  height: 128px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

.cap-badge, .rank-badge {
  position: absolute;
  top: 8px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(6px);
  color: var(--color-primary);
}
.cap-badge { right: 8px; }
.cap-badge.is-full { color: var(--dew-text-muted); }
.rank-badge {
  left: 8px;
  background: var(--color-primary);
  color: #fff;
}

.card-meta { padding: 12px 14px 14px; }

.name-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.name { font-size: 15px; font-weight: 600; color: var(--dew-text-heading); }
.cap-text { font-size: 11px; color: var(--dew-text-muted); white-space: nowrap; }

.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }

.bio {
  margin: 10px 0 12px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--dew-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 39px;
}

.card-actions { display: flex; gap: 8px; }
</style>
