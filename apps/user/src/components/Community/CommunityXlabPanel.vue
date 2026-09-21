<template>
  <section class="community-xlab-panel" aria-label="XLAB 项目信号面板">
    <!-- 头部：品牌 + 排序切换（整个标题区域点击进 XLAB，方案 §5.2） -->
    <header class="cxp-head">
      <button type="button" class="cxp-brand" @click="emit('open-xlab')">
        <span class="cxp-brand__dot" aria-hidden="true"></span>
        <span class="cxp-brand__label">XLAB // LIVE SIGNAL</span>
        <span class="cxp-brand__arrow" aria-hidden="true">&rarr;</span>
      </button>
      <div class="cxp-tabs" role="tablist" aria-label="项目排序方式">
        <button type="button" role="tab" :aria-selected="sortMode === 'latest'"
                :class="['cxp-tab', { on: sortMode === 'latest' }]" @click="setSort('latest')">
          最新
        </button>
        <button type="button" role="tab" :aria-selected="sortMode === 'popular'"
                :class="['cxp-tab', { on: sortMode === 'popular' }]" @click="setSort('popular')">
          最多浏览
        </button>
      </div>
    </header>
    <div class="cxp-scan" aria-hidden="true"></div>

    <!-- 初次加载 / 切换排序：主项目骨架 + 两行次项目骨架（不显示「0 项目」，方案 §5.5） -->
    <div v-if="loading" class="cxp-body" aria-busy="true">
      <div class="cxp-skel cxp-skel--cover"></div>
      <div class="cxp-skel cxp-skel--line"></div>
      <div class="cxp-skel cxp-skel--line cxp-skel--w60"></div>
      <div class="cxp-skel cxp-skel--row"></div>
      <div class="cxp-skel cxp-skel--row"></div>
    </div>

    <!-- 错误：面板内错误态 + 重试，不用全局 Toast（方案 §5.5） -->
    <div v-else-if="error" class="cxp-state">
      <span class="cxp-state__code">// SIGNAL_LOST</span>
      <span class="cxp-state__text">信号暂时中断</span>
      <button type="button" class="cxp-state__act" @click="load">重试</button>
    </div>

    <!-- 空态：保留品牌入口 + 进入 XLAB（方案 §5.5） -->
    <div v-else-if="!projects.length" class="cxp-state">
      <span class="cxp-state__code">// NO_SIGNAL</span>
      <span class="cxp-state__text">暂无进行中的项目</span>
      <button type="button" class="cxp-state__act" @click="emit('open-xlab')">进入 XLAB</button>
    </div>

    <template v-else>
      <!-- 主项目：完整封面 + 摘要信息（方案 §5.1/§5.2） -->
      <button type="button" class="cxp-main" @click="emit('open-project', main.id)">
        <span class="cxp-main__cover">
          <DewImage v-if="main.cover_thumb || main.cover" class="cxp-main__img"
                    :src="assetUrl(main.cover_thumb || main.cover)" ratio="16/9" alt="项目封面" />
          <span v-else class="cxp-main__ph" aria-hidden="true">{{ (main.title || '?')[0] }}</span>
          <span class="cxp-main__no">#{{ padNo(main.id) }}</span>
        </span>
        <span class="cxp-main__meta">
          <span :class="['cxp-st', `cxp-st--${main.project_status}`]">{{ main.project_status_text }}</span>
          <span v-if="main.source_text" :class="['cxp-src', `cxp-src--${main.source}`]">{{ main.source_text }}</span>
        </span>
        <span class="cxp-main__title">{{ main.title }}</span>
        <span class="cxp-main__cat">{{ catLine(main) }}</span>
        <span class="cxp-main__foot">
          <span class="cxp-views">{{ main.view_count }} VIEWS</span>
          <span class="cxp-open">OPEN &rarr;</span>
        </span>
      </button>

      <!-- 次项目：排名 + 名称 + 浏览量（移动端隐藏，方案 §10） -->
      <ul v-if="rest.length" class="cxp-rest">
        <li v-for="(p, i) in rest" :key="p.id">
          <button type="button" class="cxp-rest__btn" @click="emit('open-project', p.id)">
            <span class="cxp-rest__no">0{{ i + 2 }}</span>
            <span class="cxp-rest__name">{{ p.title }}</span>
            <span class="cxp-rest__views">{{ p.view_count }} VIEW</span>
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { DewImage } from '@bme/dew-ui'
import { assetUrl } from '../../services/campService'
import { showcaseService } from '../../services/showcaseService'

// 右栏 XLAB 信号面板（XLab 引流优化方案 §5/§8.1）：只负责发现项目——
// 请求最多 3 个进行中项目、管理排序选中态与 loading/empty/error/retry；
// 路由行为交页面层（emit open-project / open-xlab），不承担发帖候选与 feed 排序。
const emit = defineEmits(['open-project', 'open-xlab'])

const PANEL_LIMIT = 3
const sortMode = ref('latest')            // latest=created_at DESC / popular=view_count DESC（§5.3）
const projects = ref([])
const loading = ref(true)
const error = ref(false)

const main = computed(() => projects.value[0])
const rest = computed(() => projects.value.slice(1, PANEL_LIMIT))

// 竞态守卫（§5.5）：切换排序后旧请求晚返回不得覆盖新排序结果
let reqSeq = 0
async function load() {
  const seq = ++reqSeq
  loading.value = true
  error.value = false
  try {
    const res = await showcaseService.fetchProjects({
      project_status: 'ongoing',
      sort: sortMode.value,
      limit: PANEL_LIMIT,
    })
    if (seq !== reqSeq) return
    projects.value = (res.projects || []).slice(0, PANEL_LIMIT)
  } catch (e) {
    if (seq !== reqSeq) return
    error.value = true
  } finally {
    if (seq === reqSeq) loading.value = false
  }
}

function setSort(mode) {
  if (sortMode.value === mode) return
  sortMode.value = mode
  load()
}

const padNo = (id) => String(id).padStart(4, '0')
// 分类行：来源已在上行展示，这里收敛为标签（最多 2 个）+ 营期名
const catLine = (p) => {
  const tags = (p.tags || []).slice(0, 2).filter(Boolean)
  const parts = p.camp_name ? [p.camp_name, ...tags] : tags
  return parts.length ? parts.join(' · ') : 'XLAB PROJECT'
}

onMounted(load)
</script>

<style scoped>
/* XLab 嵌入视觉（方案 §5.4）：社区内的局部 XLab 区域——不挂 .xlab-root、
   不改共享 DewUI；变量走组件局部 --cxp-*，样式全部限定在 .community-xlab-panel 后代。
   黑色实底 + 直角 + 1px 白透明边 + mono 字体；荧光绿只表达进行中/主操作/hover。 */
.community-xlab-panel {
  --cxp-bg: #050505;
  --cxp-panel: #0b0b0b;
  --cxp-line: rgba(255, 255, 255, 0.14);
  --cxp-line-strong: rgba(255, 255, 255, 0.34);
  --cxp-dim: rgba(255, 255, 255, 0.62);
  --cxp-faint: rgba(255, 255, 255, 0.38);
  --cxp-green: #00ff9c;
  --cxp-pink: #ff2e97;
  --cxp-mono: ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, 'Liberation Mono', monospace;

  background: var(--cxp-bg);
  border: 1px solid var(--cxp-line-strong);
  color: #fff;
  font-family: var(--cxp-mono);
  overflow: hidden;
}

/* ── 头部：品牌行（点击进 XLAB）+ 排序 tab ── */
.cxp-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 14px 12px;
}
.cxp-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: #fff;
  font-family: var(--cxp-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: color 0.15s;
}
.cxp-brand:hover { color: var(--cxp-green); }
.cxp-brand__dot {
  width: 6px;
  height: 6px;
  background: var(--cxp-green);
  flex-shrink: 0;
  animation: cxp-pulse 2s ease-in-out infinite;
}
.cxp-brand__label { flex: 1; min-width: 0; }
.cxp-brand__arrow { color: var(--cxp-faint); transition: color 0.15s, transform 0.15s; }
.cxp-brand:hover .cxp-brand__arrow { color: var(--cxp-green); transform: translateX(2px); }

.cxp-tabs { display: flex; gap: 0; border: 1px solid var(--cxp-line); }
.cxp-tab {
  flex: 1;
  padding: 6px 0;
  border: none;
  background: transparent;
  font-family: var(--cxp-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--cxp-dim);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.cxp-tab + .cxp-tab { border-left: 1px solid var(--cxp-line); }
.cxp-tab:hover { color: #fff; }
.cxp-tab.on { background: var(--cxp-green); color: #000; font-weight: 700; }

/* 扫描线：头部下沿的常驻信号装饰（动效白名单内，reduced-motion 关停） */
.cxp-scan {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 255, 156, 0.55) 50%, transparent 100%);
  background-size: 50% 100%;
  background-repeat: no-repeat;
  animation: cxp-scan 3.2s linear infinite;
}

.cxp-body, .cxp-state { padding: 14px; }

/* ── 状态区（empty / error）── */
.cxp-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 26px 14px;
  text-align: center;
}
.cxp-state__code { font-size: 11px; letter-spacing: 0.14em; color: var(--cxp-faint); }
.cxp-state__text { font-size: 12.5px; color: var(--cxp-dim); }
.cxp-state__act {
  margin-top: 6px;
  padding: 5px 16px;
  border: 1px solid var(--cxp-line-strong);
  background: transparent;
  color: #fff;
  font-family: var(--cxp-mono);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.cxp-state__act:hover { background: var(--cxp-green); border-color: var(--cxp-green); color: #000; }

/* ── 主项目 ── */
.cxp-main {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
  padding: 14px;
  border: none;
  border-top: 1px solid var(--cxp-line);
  background: transparent;
  color: #fff;
  font-family: var(--cxp-mono);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
}
.cxp-main:hover {
  background: var(--cxp-panel);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 rgba(0, 255, 156, 0.16);
}
.cxp-main__cover {
  position: relative;
  display: block;
  border: 1px solid var(--cxp-line);
  background:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    var(--cxp-panel);
  background-size: 18px 18px, 18px 18px, auto;
  overflow: hidden;
}
.cxp-main__img { display: block; width: 100%; border-radius: 0; }
/* DewImage 根为 span：直角红线覆盖（非玻璃语言内不借用 DewUI 圆角） */
.cxp-main__cover :deep(.dew-image) { border-radius: 0; }
.cxp-main__ph {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
  font-family: var(--cxp-mono);
  font-size: 40px;
  font-weight: 800;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
  user-select: none;
}
.cxp-main:hover .cxp-main__ph { -webkit-text-stroke-color: rgba(0, 255, 156, 0.6); }
.cxp-main__no {
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--cxp-faint);
  background: rgba(0, 0, 0, 0.62);
  padding: 1px 6px;
}
.cxp-main__meta { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; }
.cxp-st--ongoing { color: var(--cxp-green); }
.cxp-st--idea { color: var(--cxp-faint); }
.cxp-st--done { color: var(--cxp-pink); }
.cxp-src { color: var(--cxp-dim); }
.cxp-src--community { color: var(--cxp-pink); }
.cxp-main__title {
  font-family: inherit;
  font-size: 15.5px;
  font-weight: 650;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cxp-main:hover .cxp-main__title {
  text-shadow: 1.5px 0 rgba(0, 255, 156, 0.55), -1.5px 0 rgba(255, 46, 151, 0.55);
}
.cxp-main__cat {
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--cxp-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cxp-main__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  letter-spacing: 0.06em;
}
.cxp-views { color: var(--cxp-faint); }
.cxp-open { color: var(--cxp-green); font-weight: 700; }

/* ── 次项目（排名 + 名称 + 浏览量）── */
.cxp-rest { list-style: none; margin: 0; padding: 0 14px 12px; border-top: 1px solid var(--cxp-line); }
.cxp-rest li + li { border-top: 1px solid var(--cxp-line); }
.cxp-rest__btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 2px;
  border: none;
  background: transparent;
  color: #fff;
  font-family: var(--cxp-mono);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.cxp-rest__btn:hover { background: rgba(255, 255, 255, 0.05); }
.cxp-rest__no { font-size: 10.5px; color: var(--cxp-faint); flex-shrink: 0; }
.cxp-rest__name {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cxp-rest__btn:hover .cxp-rest__name { color: var(--cxp-green); }
.cxp-rest__views { font-size: 10.5px; letter-spacing: 0.04em; color: var(--cxp-faint); flex-shrink: 0; }

/* ── 骨架 ── */
.cxp-skel {
  background: linear-gradient(90deg, var(--cxp-panel) 25%, #141414 50%, var(--cxp-panel) 75%);
  background-size: 200% 100%;
  animation: cxp-shimmer 1.3s linear infinite;
}
.cxp-skel--cover { height: 150px; border: 1px solid var(--cxp-line); }
.cxp-skel--line { height: 13px; margin-top: 10px; }
.cxp-skel--w60 { width: 60%; }
.cxp-skel--row { height: 34px; margin-top: 10px; border: 1px solid var(--cxp-line); }

/* ── 动效白名单 + reduced-motion 关停（方案 §5.4）── */
@keyframes cxp-shimmer { to { background-position: -200% 0; } }
@keyframes cxp-scan { from { background-position: -50% 0; } to { background-position: 150% 0; } }
@keyframes cxp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

@media (prefers-reduced-motion: reduce) {
  .cxp-skel, .cxp-scan, .cxp-brand__dot { animation: none; }
  .cxp-main, .cxp-brand__arrow, .cxp-brand, .cxp-tab, .cxp-state__act, .cxp-rest__btn { transition: none; }
  .cxp-main:hover { transform: none; box-shadow: none; }
}

/* ── 移动端（方案 §10）：右栏上移后只展示主项目，降低首屏高度 ── */
@media (max-width: 900px) {
  .cxp-rest { display: none; }
  .cxp-skel--row { display: none; }
}

/* focus-visible（键盘可达） */
.community-xlab-panel button:focus-visible {
  outline: 1px solid var(--cxp-green);
  outline-offset: 2px;
}
</style>
