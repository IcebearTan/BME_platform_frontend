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
import '../../styles/xlab.css'
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
.linked-project-card { display:flex;flex-direction:column;gap:12px;margin:2px 0 16px;padding:16px;color:var(--xg-ink);background:var(--xg-surface);border:1px solid var(--xg-line);border-radius:var(--xg-radius);text-decoration:none;transition:border-color .2s,box-shadow .2s; }
.linked-project-card:hover { border-color:var(--xg-purple);box-shadow:var(--xg-shadow-soft); }
.linked-project-card:focus-visible { outline:2px solid var(--xg-purple);outline-offset:3px; }
.lpc-eyebrow,.lpc-foot { display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--xg-faint);font-size:11px; }
.lpc-body { display:flex;gap:14px;align-items:flex-start; }
.lpc-cover { flex:0 0 132px;overflow:hidden;background:var(--xg-cover-bg);border-radius:var(--xg-radius-sm); }
.lpc-cover__img { display:block;width:132px; }
.lpc-cover__ph { display:grid;width:132px;aspect-ratio:16/9;place-items:center;color:var(--xg-placeholder);font-size:30px;font-weight:800; }
.lpc-info { flex:1;min-width:0;display:flex;flex-direction:column;gap:7px; }
.lpc-title-row { display:flex;align-items:center;gap:10px; }
.lpc-title { flex:1;min-width:0;font-size:15px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.lpc-st { flex-shrink:0;font-size:11px;font-weight:600; }
.lpc-st--ongoing { color:var(--xg-purple-deep); }
.lpc-st--idea { color:var(--xg-faint); }
.lpc-st--done,.lpc-src--community { color:var(--xg-pink-deep); }
.lpc-cat { display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--xg-sub);font-size:11px; }
.lpc-tag { padding:3px 8px;background:var(--xg-surface-2);border-radius:6px; }
.lpc-summary { display:-webkit-box;overflow:hidden;color:var(--xg-sub);font-size:12px;line-height:1.7;-webkit-line-clamp:2;-webkit-box-orient:vertical; }
.lpc-foot { padding-top:10px;border-top:1px solid var(--xg-line-soft); }
.lpc-open { color:var(--xg-purple-deep);font-weight:600; }
@media(max-width:768px) { .lpc-body{flex-direction:column}.lpc-cover,.lpc-cover__img,.lpc-cover__ph{width:100%;flex-basis:auto} }
@media(prefers-reduced-motion:reduce) { .linked-project-card{transition:none} }
</style>
