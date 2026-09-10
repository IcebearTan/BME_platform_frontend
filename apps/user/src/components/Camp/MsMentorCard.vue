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
      <button v-if="favoriteEnabled" type="button" class="favorite-button" :class="{ 'is-favorite': favorited }"
        :aria-pressed="favorited" :aria-label="`${favorited ? '取消收藏' : '收藏'} ${mentor.username}`"
        :title="favorited ? '取消收藏' : '收藏导生'" :disabled="favoriteDisabled" @click="$emit('favorite')">
        <el-icon aria-hidden="true"><StarFilled v-if="favorited" /><Star v-else /></el-icon>
      </button>
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

      <div v-if="visibleTags.length" class="tag-row" aria-label="导生方向">
        <DewTag v-for="(tag, index) in visibleTags" :key="tag" :type="index === 1 ? 'warning' : 'success'" size="sm" round class="mentor-tag" :title="tag"><span class="mentor-tag-text">{{ tag }}</span></DewTag>
        <DewTag v-if="hiddenTagCount" type="neutral" size="sm" round>+{{ hiddenTagCount }}</DewTag>
      </div>

      <p class="bio" :class="{ 'is-multiline': bioMultiline }">
        <span class="bio-text">“{{ displayBio }}”</span>
      </p>

      <button class="detail-link" type="button" :aria-label="`查看 ${mentor.username} 的完整介绍`" @click="detailVisible = true">
        查看介绍 <el-icon><ArrowRight /></el-icon>
      </button>

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
          <el-icon aria-hidden="true"><ShoppingCart /></el-icon>
        </button>
        <slot name="action"></slot>
      </div>
    </div>
    <el-dialog
      v-model="detailVisible"
      :title="mentor.username + ' 的导生名片'"
      width="min(680px, 94vw)"
      top="5vh"
      :style="{ background: 'var(--dew-card-flat-bg)' }"
      append-to-body
      class="mentor-detail-dialog"
    >
      <div class="mentor-detail">
        <div class="detail-heading">
          <h3>{{ mentor.username }}</h3>
          <span>可带 {{ capacity }} 人</span>
        </div>
        <div v-if="mentor.tags?.length" class="detail-tags">
          <DewTag v-for="(tag, index) in mentor.tags" :key="tag" :type="index === 1 ? 'warning' : 'success'" size="sm" round class="mentor-tag" :title="tag"><span class="mentor-tag-text">{{ tag }}</span></DewTag>
        </div>
        <p class="detail-bio">{{ displayBio }}</p>
        <img v-if="photoSrc" class="detail-photo" :src="photoSrc" :alt="`${mentor.username} 的展示图片`" />
      </div>
      <template #footer>
        <div class="detail-footer">
          <span class="price-pair"><span class="price-now">￥0</span><span class="price-old">￥99999</span></span>
          <span v-if="pickedRank > 0" class="detail-picked">已选为第 {{ pickedRank }} 志愿</span>
          <button v-else-if="selectable" class="grab-button" type="button" :disabled="full || selectionDisabled"
            :aria-label="full ? `${mentor.username} 名额已满` : `加入心仪导生 ${mentor.username}`"
            :title="full ? '名额已满' : '加入心仪导生'" @click="$emit('add')">
            <el-icon aria-hidden="true"><ShoppingCart /></el-icon>
          </button>
        </div>
      </template>
    </el-dialog>
  </DewCard>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ZoomIn, ArrowRight, ShoppingCart, Star, StarFilled } from '@element-plus/icons-vue';
import { DewCard, DewTag } from '@bme/dew-ui';
import { assetUrl } from '../../services/campService';

const props = defineProps({
  mentor: { type: Object, required: true },
  pickedRank: { type: Number, default: 0 },
  selectable: { type: Boolean, default: false },
  selectionDisabled: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
  size: { type: String, default: 'md' },
  favoriteEnabled: { type: Boolean, default: false },
  favorited: { type: Boolean, default: false },
  favoriteDisabled: { type: Boolean, default: false },
});
defineEmits(['add', 'favorite']);

const previewVisible = ref(false);
const detailVisible = ref(false);
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
  return bio;
});
const bioMultiline = computed(() => hasBio.value && displayBio.value.length > 15);
</script>

<style scoped>
.mentor-card {
  height: 100%;
  overflow: hidden;
  border-radius: var(--radius-xl, 16px);
  box-shadow: 0 3px 12px color-mix(in srgb, var(--dew-text-heading) 5%, transparent);
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
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--dew-card-border));
}
.mentor-card.full { opacity: 0.68; }
.favorite-button { position: absolute; top: 9px; right: 9px; display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--dew-card-border); border-radius: var(--radius-full); background: var(--dew-card-flat-bg); color: var(--dew-text-muted); cursor: pointer; font-size: 21px; }
.favorite-button.is-favorite { color: var(--color-warning); }
.favorite-button:focus-visible { outline: 2px solid var(--color-warning); outline-offset: 2px; }
.favorite-button:disabled { opacity: 0.5; cursor: not-allowed; }
.mentor-card :deep(.dew-card__body) {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  padding: 0;
}

.card-photo {
  position: relative;
  height: 104px;
  flex: none;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-primary) 4%, var(--dew-card-flat-bg));
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
  object-fit: contain;
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
  background: color-mix(in srgb, var(--fallback-color) 16%, var(--dew-card-flat-bg));
}
.photo-fallback span { display: grid; place-items: center; width: 52px; height: 52px; border-radius: var(--radius-full); background: color-mix(in srgb, var(--fallback-color) 14%, var(--dew-card-flat-bg)); font-size: 26px; font-weight: 700; line-height: 1; }
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

.card-meta { display: flex; flex: 1; flex-direction: column; padding: 18px; }
.name-row { display: flex; min-width: 0; align-items: baseline; justify-content: space-between; gap: 10px; }
.name {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--dew-text-heading);
  font-size: 19px;
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
  --bio-gold: color-mix(in srgb, var(--color-warning) 65%, var(--dew-text-heading));
  position: relative;
  display: flex;
  height: 72px;
  flex: none;
  align-items: center;
  margin: 10px 0 12px;
  overflow: hidden;
  color: var(--bio-gold);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 24px;
}
.bio-text {
  display: -webkit-box;
  width: 100%;
  box-sizing: border-box;
  border-left: 2px solid var(--bio-gold);
  padding-left: 10px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow-wrap: anywhere;
  white-space: pre-line;
  text-align: center;
}
.bio.is-multiline .bio-text { text-align: start; }
.tag-row { display: flex; flex: none; flex-wrap: wrap; align-items: flex-start; gap: 8px 6px; margin-top: 10px; margin-bottom: 4px; }
.mentor-tag { flex: none; max-width: 100%; box-sizing: border-box; }
.mentor-tag-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card-actions { display: flex; min-height: 58px; align-items: center; justify-content: flex-start; gap: 8px; margin-top: auto; border-top: 1px solid var(--dew-card-border); padding-top: 8px; }
.card-actions.has-action { justify-content: space-between; }
.price-pair { display: inline-flex; align-items: baseline; gap: 5px; line-height: 1; white-space: nowrap; }
.price-now { color: var(--color-danger); font-size: 24px; font-weight: 850; }
.price-old { color: var(--dew-text-faint); font-size: 11px; text-decoration: line-through; }
.grab-button {
  display: grid;
  place-items: center;
  width: 42px;
  min-width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--color-danger) 24%, transparent);
  border-radius: var(--radius-full);
  outline-offset: 2px;
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, var(--dew-card-flat-bg));
  cursor: pointer;
  transition: transform 0.2s var(--dew-bounce, ease), opacity 0.2s ease;
}
.grab-button .el-icon { font-size: 22px; }
.grab-button:hover:not(:disabled) { transform: translateY(-2px); background: color-mix(in srgb, var(--color-danger) 18%, var(--dew-card-flat-bg)); }
.grab-button:focus-visible { outline: 2px solid var(--color-danger); }
.grab-button:disabled { opacity: 0.45; cursor: not-allowed; }

.is-lg .card-meta { padding: 15px 16px 16px; }
.is-lg .card-photo { height: 168px; }

.detail-link { display: inline-flex; align-items: center; align-self: flex-start; gap: 6px; padding: 0; margin: 0 0 14px; min-height: 28px; border: 0; background: transparent; color: var(--color-primary); font: inherit; font-size: 13px; cursor: pointer; }
.detail-link:hover { text-decoration: underline; }
.mentor-detail { max-height: 65vh; overflow-y: auto; color: var(--dew-text-heading); }
.detail-heading { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.detail-heading h3 { margin: 0; font-size: 22px; overflow-wrap: anywhere; }
.detail-heading > span { color: var(--dew-text-muted); }
.detail-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.detail-bio { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 16px; line-height: 1.9; margin: 24px 0; }
.detail-photo { display: block; width: 100%; height: auto; border-radius: 6px; }
.detail-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 50px; }
.detail-picked { color: var(--color-primary); }

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
  .bio { height: 72px; font-size: 14px; }
}
</style>
