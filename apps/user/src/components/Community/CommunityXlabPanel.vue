<template>
  <section class="community-xlab-panel" aria-label="XLAB 项目推荐">
    <!-- 容器复用 DewCard(flat)：与社区右栏其他卡片同一视觉基座 -->
    <DewCard variant="flat" size="md" class="cxp-card">
      <template #header>
        <div class="cxp-head">
          <!-- 品牌行：点击整行进 XLAB 广场（沿用 §5.2 交互） -->
          <button type="button" class="cxp-brand" @click="emit('open-xlab')">
            <span class="cxp-brand__dot" aria-hidden="true"></span>
            <span class="cxp-brand__name">XLAB</span>
            <span class="cxp-brand__sub">PROJECT PICKS</span>
            <span class="cxp-brand__more" aria-hidden="true">查看更多 →</span>
          </button>
          <!-- 排序切换复用 DewButtonBar（segmented，sm 拉满） -->
          <DewButtonBar :items="sortItems" :model-value="sortMode" size="sm" stretch @update:model-value="setSort" />
        </div>
      </template>

      <!-- 初次加载 / 切换排序：骨架复用 DewSkeleton（不显示「0 项目」，方案 §5.5） -->
      <div v-if="loading" class="cxp-loading" aria-busy="true">
        <DewSkeleton variant="rect" height="128" rounded="8px" />
        <DewSkeleton variant="text" width="72%" />
        <DewSkeleton variant="text" width="46%" />
        <DewSkeleton class="cxp-skel-row" variant="rect" height="40" rounded="8px" />
      </div>

      <!-- 错误：面板内错误态 + 重试，不用全局 Toast（方案 §5.5） -->
      <div v-else-if="error" class="cxp-state">
        <span class="cxp-state__text">项目推荐暂时无法加载</span>
        <DewButton size="sm" @click="load">重试</DewButton>
      </div>

      <!-- 空态：保留进入 XLAB 入口（方案 §5.5） -->
      <div v-else-if="!projects.length" class="cxp-state">
        <span class="cxp-state__text">暂无进行中的项目</span>
        <DewButton size="sm" @click="emit('open-xlab')">进入 XLAB</DewButton>
      </div>

      <template v-else>
        <!-- 主项目：封面为主视觉 + 状态/来源/浏览（XLAB 业务卡，跟随全站主题） -->
        <button type="button" class="cxp-main" @click="emit('open-project', main.id)">
          <span class="cxp-main__cover">
            <DewImage v-if="main.cover_thumb || main.cover" class="cxp-main__img"
                      :src="assetUrl(main.cover_thumb || main.cover)" ratio="16/9" alt="项目封面" />
            <span v-else class="cxp-main__ph" aria-hidden="true">{{ (main.title || '?')[0] }}</span>
          </span>
          <span class="cxp-main__meta">
            <span :class="['cxp-st', `cxp-st--${main.project_status}`]"><i aria-hidden="true"></i>{{ main.project_status_text }}</span>
            <span v-if="main.source_text" :class="['cxp-src', `cxp-src--${main.source}`]">{{ main.source_text }}</span>
            <span class="cxp-main__views">{{ main.view_count }} 浏览</span>
          </span>
          <span class="cxp-main__title">{{ main.title }}</span>
          <span class="cxp-main__cat">{{ catLine(main) }}</span>
        </button>

        <!-- 其他推荐：小封面 + 名称 + 状态/浏览（无排名数字；移动端隐藏，方案 §10） -->
        <ul v-if="rest.length" class="cxp-rest">
          <li v-for="p in rest" :key="p.id">
            <button type="button" class="cxp-rest__btn" @click="emit('open-project', p.id)">
              <span :class="['cxp-rest__thumb', `src-${p.source}`]">
                <DewImage v-if="p.cover_thumb || p.cover" class="cxp-rest__img"
                          :src="assetUrl(p.cover_thumb || p.cover)" alt="" />
                <b v-else aria-hidden="true">{{ (p.title || '?')[0] }}</b>
              </span>
              <span class="cxp-rest__info">
                <span class="cxp-rest__name">{{ p.title }}</span>
                <small :class="['cxp-rest__meta', `st-${p.project_status}`]"><i aria-hidden="true"></i>{{ p.project_status_text }} · {{ p.view_count }} 浏览</small>
              </span>
            </button>
          </li>
        </ul>
      </template>
    </DewCard>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { DewButton, DewButtonBar, DewCard, DewImage, DewSkeleton } from '@bme/dew-ui'
import { assetUrl } from '../../services/campService'
import { showcaseService } from '../../services/showcaseService'
import '../../styles/xlab.css'

// 右栏 XLAB 推荐面板（XLab 引流优化方案 §5/§8.1 的轻量化改版）：只负责发现项目——
// 请求最多 3 个进行中项目、管理排序选中态与 loading/empty/error/retry；
// 路由行为交页面层（emit open-project / open-xlab），不承担发帖候选与 feed 排序。
// 视觉：复用 DewUI（DewCard/DewButtonBar/DewButton/DewSkeleton），XLAB 品牌只保留
// 紫色点、PROJECT PICKS 小字和状态点（--xg-* tokens 来自 xlab.css）。
const emit = defineEmits(['open-project', 'open-xlab'])

const PANEL_LIMIT = 3
const sortItems = [{ value: 'latest', label: '最新' }, { value: 'popular', label: '最多浏览' }]
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

// 分类行：来源已在上行展示，这里收敛为标签（最多 2 个）+ 营期名
const catLine = (p) => {
  const tags = (p.tags || []).slice(0, 2).filter(Boolean)
  const parts = p.camp_name ? [p.camp_name, ...tags] : tags
  return parts.length ? parts.join(' · ') : 'XLAB PROJECT'
}

onMounted(load)
</script>

<style scoped>
/* 社区右栏 XLAB 推荐面板（轻量化）：白卡融入社区，XLAB 身份只靠绿点/PROJECT PICKS/
   状态色表达；颜色全部走 xlab.css 的 --xg-* tokens，与项目广场三页同一体系。 */
.community-xlab-panel { --cxp-mono: ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace; }

/* ── 头部：品牌行 + 排序 segmented ── */
.cxp-head { display: flex; flex-direction: column; gap: 10px; }
.cxp-brand {
  display: flex; align-items: center; gap: 7px;
  width: 100%; padding: 0; border: 0; background: transparent;
  cursor: pointer; text-align: left; font-family: inherit;
}
.cxp-brand__dot {
  width: 7px; height: 7px; flex-shrink: 0; border-radius: 50%;
  background: var(--xg-purple); box-shadow: 0 0 0 3px rgb(var(--xg-purple-rgb) / 0.15);
  animation: cxp-pulse 2.4s ease-in-out infinite;
}
.cxp-brand__name { font-size: 14px; font-weight: 800; color: var(--xg-ink); letter-spacing: 0.02em; }
.cxp-brand__sub { font-family: var(--cxp-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.16em; color: var(--xg-purple-deep); }
.cxp-brand__more { margin-left: auto; font-size: 12px; font-weight: 500; color: var(--xg-purple-deep); transition: color 0.15s, transform 0.15s; }
.cxp-brand:hover .cxp-brand__more { color: var(--xg-purple); transform: translateX(2px); }

/* ── 加载骨架（DewSkeleton 排版） ── */
.cxp-loading { display: flex; flex-direction: column; gap: 8px; }

/* ── 状态区（empty / error） ── */
.cxp-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 8px; text-align: center; }
.cxp-state__text { font-size: 12px; color: var(--xg-faint); }

/* ── 主项目（XLAB 业务卡，跟随全站主题） ── */
.cxp-main {
  display: flex; flex-direction: column; gap: 7px;
  width: 100%; padding: 10px;
  border: 1px solid var(--xg-line); border-radius: 10px;
  background: var(--xg-surface);
  cursor: pointer; text-align: left; font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.cxp-main:hover, .cxp-main:focus-visible {
  border-color: rgb(var(--xg-purple-rgb) / 0.45);
  box-shadow: var(--xg-shadow-soft);
  transform: translateY(-1px);
  outline: none;
}
.cxp-main__cover {
  display: block; overflow: hidden; border-radius: 7px;
  background: var(--xg-cover-bg);
}
.cxp-main__img { display: block; width: 100%; }
.cxp-main__ph {
  display: flex; align-items: center; justify-content: center;
  aspect-ratio: 16 / 9; font-size: 34px; font-weight: 800; color: var(--xg-placeholder);
  user-select: none;
}
.cxp-main__meta { display: flex; align-items: center; gap: 9px; font-size: 11px; color: var(--xg-faint); }
.cxp-st { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; }
.cxp-st i, .cxp-rest__meta i { width: 5px; height: 5px; flex-shrink: 0; border-radius: 50%; background: var(--xg-faint); }
.cxp-st--ongoing { color: var(--xg-purple-deep); } .cxp-st--ongoing i { background: var(--xg-purple); }
.cxp-st--done { color: var(--xg-pink-deep); } .cxp-st--done i { background: var(--xg-pink); }
.cxp-src { color: var(--xg-sub); }
.cxp-src--community { color: var(--xg-pink-deep); }
.cxp-main__views { margin-left: auto; }
.cxp-main__title {
  font-size: 14px; font-weight: 650; color: var(--xg-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cxp-main__cat {
  font-size: 11px; color: var(--xg-faint);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── 其他推荐（小封面列表，无排名数字） ── */
.cxp-rest { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.cxp-rest__btn {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 6px 7px; border: 0; border-radius: 8px;
  background: transparent; cursor: pointer; text-align: left; font-family: inherit;
  transition: background 0.15s;
}
.cxp-rest__btn:hover, .cxp-rest__btn:focus-visible { background: var(--xg-bg); outline: none; }
.cxp-rest__thumb {
  position: relative; display: grid; place-items: center;
  width: 42px; height: 42px; flex-shrink: 0; overflow: hidden;
  border-radius: 7px; background: var(--xg-cover-bg);
}
.cxp-rest__thumb.src-community { background: var(--xg-cover-community-bg); }
.cxp-rest__img, .cxp-rest__img :deep(img) { width: 100%; height: 100%; object-fit: cover; }
.cxp-rest__thumb b { font-size: 15px; font-weight: 800; color: var(--xg-placeholder); }
.cxp-rest__info { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.cxp-rest__name {
  font-size: 12.5px; font-weight: 600; color: var(--xg-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cxp-rest__meta { display: flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--xg-faint); }
.cxp-rest__meta.st-ongoing { color: var(--xg-purple-deep); } .cxp-rest__meta.st-ongoing i { background: var(--xg-purple); }
.cxp-rest__meta.st-done { color: var(--xg-pink-deep); } .cxp-rest__meta.st-done i { background: var(--xg-pink); }

/* ── 动效白名单 + reduced-motion（方案 §5.4 沿用） ── */
@keyframes cxp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@media (prefers-reduced-motion: reduce) {
  .cxp-brand__dot { animation: none; }
  .cxp-main, .cxp-brand__more, .cxp-rest__btn { transition: none; }
  .cxp-main:hover { transform: none; box-shadow: none; }
}

/* ── 移动端（方案 §10）：右栏上移后只展示主项目，降低首屏高度 ── */
@media (max-width: 900px) {
  .cxp-rest, .cxp-skel-row { display: none; }
}

/* focus-visible（键盘可达） */
.community-xlab-panel button:focus-visible,
.community-xlab-panel :deep(.dew-bar__item:focus-visible) {
  outline: 2px solid var(--xg-purple);
  outline-offset: 2px;
}
</style>
