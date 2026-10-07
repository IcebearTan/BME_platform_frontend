<template>
  <a class="linked-project-card"
     :href="projectHref"
     target="_blank" rel="noopener noreferrer"
     :aria-label="`查看 XLAB 项目：${project.title}`"
     @click.stop
     @keydown.space.prevent="openManual">
    <span class="lpc-eyebrow">
      <span>XLAB // LINKED PROJECT</span>
      <span class="lpc-no">#{{ padNo(project.id) }}</span>
    </span>
    <span class="lpc-body">
      <span class="lpc-cover">
        <DewImage v-if="coverUrl" class="lpc-cover__img"
                  :src="coverUrl" ratio="16/9" alt="项目封面" />
        <span v-else class="lpc-cover__ph" aria-hidden="true">{{ (project.title || '?')[0] }}</span>
      </span>
      <span class="lpc-info">
        <span class="lpc-title-row">
          <span class="lpc-title">{{ project.title }}</span>
          <span :class="['lpc-st', `lpc-st--${project.status}`]">{{ project.status_text }}</span>
        </span>
        <span class="lpc-cat">
          <span v-if="project.source_text" :class="['lpc-src', `lpc-src--${project.source}`]">{{ project.source_text }}</span>
          <span v-for="t in tags" :key="t" class="lpc-tag">{{ t }}</span>
        </span>
        <span v-if="project.summary" class="lpc-summary">{{ project.summary }}</span>
      </span>
    </span>
    <span class="lpc-foot">
      <span class="lpc-views">{{ project.view_count }} VIEWS</span>
      <span class="lpc-open">OPEN &rarr;</span>
    </span>
  </a>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { DewImage } from '@bme/dew-ui'
import { assetUrl } from '../../services/campService'

// 帖子内关联项目大卡（XLab 引流优化方案 §6/§8.2）：只接收 feed 已投影的项目摘要渲染，
// 不自行请求接口；渲染由 project_id 决定（不硬编码招人话题），路由由页面层 openTab 同款行为承载。
const props = defineProps({
  project: {
    type: Object,
    required: true,
    // 期望 shape（feed 投影）：{ id, title, summary, cover_thumb, status, status_text,
    //                          source, source_text, tags[], view_count }
  },
})

const router = useRouter()
const projectHref = computed(() => router.resolve(`/projects/${props.project.id}`).href)
const coverUrl = computed(() => assetUrl(props.project.cover_thumb || ''))
const tags = computed(() => (props.project.tags || []).slice(0, 2).filter(Boolean))
const padNo = (id) => String(id).padStart(4, '0')

// a 元素原生支持 Enter/鼠标；Space 默认是滚动页面，这里接管为打开（方案 §8.2）
const openManual = () => window.open(projectHref.value, '_blank', 'noopener')
</script>

<style scoped>
/* XLab 嵌入视觉（同 CommunityXlabPanel 口径）：黑底 + 直角 + 1px 白透明边 + mono，
   局部 --lpc-* 变量，样式全部限定在 .linked-project-card 后代，不污染社区流。 */
.linked-project-card {
  --lpc-panel: #0b0b0b;
  --lpc-line: rgba(255, 255, 255, 0.14);
  --lpc-line-strong: rgba(255, 255, 255, 0.34);
  --lpc-dim: rgba(255, 255, 255, 0.62);
  --lpc-faint: rgba(255, 255, 255, 0.38);
  --lpc-green: #00ff9c;
  --lpc-pink: #ff2e97;
  --lpc-mono: ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, 'Liberation Mono', monospace;

  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 2px 0 16px;
  padding: 12px 14px 11px;
  background: #050505;
  border: 1px solid var(--lpc-line-strong);
  color: #fff;
  font-family: var(--lpc-mono);
  text-decoration: none;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.linked-project-card:hover {
  border-color: rgba(0, 255, 156, 0.55);
  box-shadow: 4px 4px 0 rgba(0, 255, 156, 0.14);
  transform: translate(-2px, -2px);
}
.linked-project-card:focus-visible {
  outline: 1px solid var(--lpc-green);
  outline-offset: 2px;
}

.lpc-eyebrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--lpc-faint);
}
.lpc-no { color: var(--lpc-faint); font-weight: 600; letter-spacing: 0.08em; }

.lpc-body { display: flex; gap: 12px; align-items: stretch; }
.lpc-cover {
  flex: 0 0 132px;
  position: relative;
  display: block;
  border: 1px solid var(--lpc-line);
  background:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    var(--lpc-panel);
  background-size: 18px 18px, 18px 18px, auto;
  overflow: hidden;
  align-self: flex-start;
}
.lpc-cover__img { display: block; width: 132px; border-radius: 0; }
.lpc-cover :deep(.dew-image) { border-radius: 0; }
.lpc-cover__ph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132px;
  aspect-ratio: 16 / 9;
  font-family: var(--lpc-mono);
  font-size: 30px;
  font-weight: 800;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
  user-select: none;
}
.linked-project-card:hover .lpc-cover__ph { -webkit-text-stroke-color: rgba(0, 255, 156, 0.6); }

.lpc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.lpc-title-row { display: flex; align-items: center; gap: 10px; }
.lpc-title {
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: 15px;
  font-weight: 650;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.linked-project-card:hover .lpc-title {
  text-shadow: 1.5px 0 rgba(0, 255, 156, 0.55), -1.5px 0 rgba(255, 46, 151, 0.55);
}
.lpc-st { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; flex-shrink: 0; }
.lpc-st--ongoing { color: var(--lpc-green); }
.lpc-st--idea { color: var(--lpc-faint); }
.lpc-st--done { color: var(--lpc-pink); }

.lpc-cat { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.lpc-src { font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; color: var(--lpc-dim); }
.lpc-src--community { color: var(--lpc-pink); }
.lpc-tag {
  font-size: 10px;
  letter-spacing: 0.04em;
  padding: 1px 7px;
  border: 1px solid var(--lpc-line);
  color: var(--lpc-dim);
}
.lpc-summary {
  font-size: 12px;
  line-height: 1.6;
  color: var(--lpc-dim);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lpc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--lpc-line);
  font-size: 10.5px;
  letter-spacing: 0.06em;
}
.lpc-views { color: var(--lpc-faint); }
.lpc-open { color: var(--lpc-green); font-weight: 700; }

@media (prefers-reduced-motion: reduce) {
  .linked-project-card { transition: none; }
  .linked-project-card:hover { transform: none; box-shadow: none; }
}

/* 移动端（方案 §10）：封面在上、文字在下，点击区域不受影响 */
@media (max-width: 768px) {
  .lpc-body { flex-direction: column; }
  .lpc-cover, .lpc-cover__img, .lpc-cover__ph { width: 100%; flex-basis: auto; }
}
</style>
