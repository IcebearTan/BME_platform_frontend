<template>
  <DewCard
    variant="elevated"
    size="sm"
    class="mentor-card"
    :class="[
      fallbackTheme,
      { picked: pickedRank > 0, full, 'is-lg': size === 'lg' },
    ]"
    :style="{ '--reveal-index': index }"
  >
    <div class="card-photo">
      <button
        v-if="photoSrc"
        type="button"
        class="photo-preview-button"
        :aria-label="`查看 ${mentor.username} 的展示图片`"
        title="查看大图"
        @click="previewVisible = true"
      >
        <img
          :src="photoSrc"
          :alt="`${mentor.username} 的展示图片`"
          loading="lazy"
        />
        <span class="preview-glyph" aria-hidden="true">
          <el-icon><ZoomIn /></el-icon>
        </span>
      </button>
      <div v-else class="photo-fallback" aria-hidden="true">
        <span>{{ initial }}</span>
      </div>

      <span v-if="pickedRank > 0" class="rank-badge">志愿 {{ pickedRank }}</span>
    </div>

    <el-image-viewer
      v-if="previewVisible"
      :url-list="[photoSrc]"
      :initial-index="0"
      :hide-on-click-modal="true"
      :teleported="true"
      @close="previewVisible = false"
    />

    <div class="card-meta">
      <div class="name-row">
        <h3 class="name">{{ mentor.username }}</h3>
        <span class="capacity-total">可带 {{ capacity }} 人</span>
      </div>

      <p class="bio" :class="{ 'is-multiline': bioMultiline }">
        <span class="bio-text">“{{ displayBio }}”</span>
      </p>

      <div v-if="visibleTags.length" class="tag-row" aria-label="导生方向">
        <span v-for="tag in visibleTags" :key="tag" class="tag">{{ tag }}</span>
        <span v-if="hiddenTagCount" class="tag tag-more">+{{ hiddenTagCount }}</span>
      </div>

      <div class="card-actions" :class="{ 'has-action': selectable && pickedRank === 0 }">
        <span class="price-pair" aria-label="当前价格零元，原价九万九千九百九十九元">
          <span class="price-now">￥0</span>
          <span class="price-old">￥99999</span>
        </span>
        <button
          v-if="selectable && pickedRank === 0"
          type="button"
          class="grab-button"
          :disabled="full || selectionDisabled"
          :aria-label="full ? `${mentor.username} 名额已满` : `加入心仪导生 ${mentor.username}`"
          :title="full ? '名额已满' : '加入心仪导生'"
          @click="$emit('add')"
        >
          <img :src="grabSticker" alt="" aria-hidden="true" />
        </button>
        <slot name="action"></slot>
      </div>
    </div>
  </DewCard>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ZoomIn } from '@element-plus/icons-vue';
import { DewCard } from '@bme/dew-ui';
import { assetUrl } from '../../services/campService';
import grabSticker from '../../assets/mentor-market-grab.png';

const props = defineProps({
  mentor: { type: Object, required: true },
  pickedRank: { type: Number, default: 0 },
  selectable: { type: Boolean, default: false },
  selectionDisabled: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
  size: { type: String, default: 'md' },
});
defineEmits(['add']);

const previewVisible = ref(false);
const fallbackThemes = ['fallback-primary', 'fallback-success', 'fallback-warning', 'fallback-info'];
const full = computed(() => !!props.mentor.full);
const photoSrc = computed(() => assetUrl(props.mentor.photo_url));
const initial = computed(() => (props.mentor.username || '?').trim().charAt(0).toUpperCase());
const capacity = computed(() => Math.max(0, Number(props.mentor.capacity) || 0));
const visibleTags = computed(() => (props.mentor.tags || []).slice(0, 3));
const hiddenTagCount = computed(() => Math.max(0, (props.mentor.tags?.length || 0) - visibleTags.value.length));
const fallbackTheme = computed(() => fallbackThemes[Math.abs(props.index) % fallbackThemes.length]);
const hasBio = computed(() => Boolean(String(props.mentor.bio || '').trim()));
const displayBio = computed(() => {
  const bio = String(props.mentor.bio || '').trim();
  if (!bio) return '这位导生有点神秘，先看看标签吧~~';
  return bio.length > 30 ? `${bio.slice(0, 30)}…` : bio;
});
const bioMultiline = computed(() => hasBio.value && displayBio.value.length > 15);
</script>

<style scoped>
.mentor-card {
  height: 100%;
  overflow: hidden;
  border-radius: 22px;
  transition: transform 0.3s var(--dew-bounce, ease), border-color 0.25s ease, opacity 0.25s ease;
  animation: card-reveal 0.45s var(--dew-bounce, ease) both;
  animation-delay: calc(min(var(--reveal-index, 0), 8) * 45ms);
}
@keyframes card-reveal {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.mentor-card:hover { transform: translateY(-3px); }
.mentor-card.picked {
  border-color: color-mix(in srgb, var(--color-primary) 72%, transparent);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--color-primary) 14%, transparent);
}
.mentor-card.full { opacity: 0.68; }
.mentor-card :deep(.dew-card__body) {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  padding: 0;
}

.card-photo {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-primary) 24%, var(--dew-card-flat-bg));
}
.photo-preview-button {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}
.card-photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s var(--dew-bounce, ease);
}
.mentor-card:hover .card-photo img { transform: scale(1.035); }
.mentor-card.full .card-photo img { filter: saturate(0.72); }
.preview-glyph {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid color-mix(in srgb, white 70%, transparent);
  border-radius: var(--radius-full);
  color: white;
  background: color-mix(in srgb, var(--dew-text-heading) 62%, transparent);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--dew-text-heading) 20%, transparent);
  opacity: 0.78;
  transition: opacity 0.2s ease, transform 0.2s var(--dew-bounce, ease);
}
.photo-preview-button:hover .preview-glyph,
.photo-preview-button:focus-visible .preview-glyph { opacity: 1; transform: scale(1.06); }
.photo-preview-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.photo-fallback {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--dew-text-heading);
  background: color-mix(in srgb, var(--fallback-color) 25%, var(--dew-card-flat-bg));
}
.photo-fallback span { font-size: 68px; font-weight: 800; line-height: 1; }
.fallback-primary { --fallback-color: var(--color-primary); }
.fallback-success { --fallback-color: var(--color-success); }
.fallback-warning { --fallback-color: var(--color-warning); }
.fallback-info { --fallback-color: var(--color-info); }

.rank-badge {
  position: absolute;
  top: 9px;
  left: 9px;
  display: inline-flex;
  min-height: 25px;
  align-items: center;
  padding: 0 10px;
  border-radius: var(--radius-full);
  color: var(--dew-text-on-primary, white);
  background: var(--color-primary);
  box-shadow: 0 4px 13px color-mix(in srgb, var(--color-primary) 24%, transparent);
  font-size: 12px;
  font-weight: 700;
}

.card-meta { display: flex; flex: 1; flex-direction: column; padding: 15px 16px 14px; }
.name-row { display: flex; min-width: 0; align-items: baseline; justify-content: space-between; gap: 10px; }
.name {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--dew-text-heading);
  font-size: 17px;
  font-weight: 750;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.capacity-total {
  flex: none;
  color: var(--dew-text-faint);
  font-size: 11px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.bio {
  display: flex;
  height: 44px;
  align-items: center;
  margin: 10px 0 0;
  overflow: hidden;
  color: var(--color-warning);
  font-size: 12.5px;
  font-style: italic;
  font-weight: 650;
  line-height: 1.55;
}
.bio.is-multiline { align-items: flex-start; }
.bio-text {
  display: -webkit-box;
  width: 100%;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
.bio.is-multiline .bio-text { text-align: justify; }
.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; margin-bottom: 12px; }
.tag {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  padding: 0 8px;
  border-radius: var(--radius-full);
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 11%, transparent);
  font-size: 12.5px;
  font-weight: 650;
}
.tag:nth-child(2) { color: var(--color-info); background: color-mix(in srgb, var(--color-info) 11%, transparent); }
.tag:nth-child(3) { color: var(--color-success); background: color-mix(in srgb, var(--color-success) 11%, transparent); }
.tag-more { color: var(--dew-text-muted); background: color-mix(in srgb, var(--dew-text-muted) 10%, transparent); }

.card-actions { display: flex; min-height: 30px; align-items: center; justify-content: flex-start; gap: 8px; margin-top: auto; }
.card-actions.has-action { min-height: 50px; justify-content: space-between; }
.price-pair { display: inline-flex; align-items: baseline; gap: 5px; line-height: 1; white-space: nowrap; }
.price-now { color: var(--color-danger); font-size: 18px; font-weight: 850; }
.price-old { color: var(--dew-text-faint); font-size: 11px; text-decoration: line-through; }
.grab-button {
  width: 50px;
  min-width: 50px;
  height: 50px;
  padding: 0;
  border: 0;
  outline-offset: 2px;
  background: transparent;
  cursor: pointer;
  transition: transform 0.2s var(--dew-bounce, ease), opacity 0.2s ease;
}
.grab-button img { display: block; width: 50px; height: 50px; object-fit: contain; }
.grab-button:hover:not(:disabled) { transform: scale(1.06) rotate(-2deg); }
.grab-button:disabled { opacity: 0.38; cursor: not-allowed; }

.is-lg .card-meta { padding: 15px 16px 16px; }

@media (prefers-reduced-motion: reduce) {
  .mentor-card { animation: none; }
  .mentor-card,
  .card-photo img,
  .grab-button,
  .preview-glyph { transition: none; }
}
@media (max-width: 680px) {
  .card-meta { padding: 11px; }
  .name { font-size: 15px; }
  .capacity-total { font-size: 10px; }
  .bio { height: 40px; font-size: 11.5px; }
  .tag { min-height: 22px; font-size: 11.5px; }
}
</style>
