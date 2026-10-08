<template>
  <div class="xlab-root plaza-page" :class="{ 'detail-open': selectedId }">
    <div class="xlab-navdock" :class="{ 'nav-open': navOpen }" @mouseenter="navEnter" @mouseleave="navLeave"><MenuComponent /></div>
    <header class="plaza-poster" :style="posterStyle" aria-label="XLAB 工程实验场项目广场"></header>
    <div class="plaza-fade" aria-hidden="true"></div>
    <main class="plaza-body">
      <div class="plaza-layout">
        <section class="plaza-main" aria-label="项目列表">
          <header class="catalog-head">
            <div class="catalog-title"><h2>{{ mineOnly ? '我的项目' : '全部项目' }}</h2><span class="catalog-count"><strong>{{ displayProjects.length }}</strong> 个项目</span></div>
            <div class="catalog-actions"><button v-if="hasFilters || mineOnly" type="button" @click="clearFilters">清除筛选</button><label>排序<span class="sort-select"><DewSelect :model-value="sortMode" :options="sortOptions" size="sm" @update:model-value="(value) => sortMode = value" /></span></label></div>
          </header>
          <DewCard variant="flat" size="md" class="discovery-panel" aria-label="项目搜索与筛选">
            <DewInput v-model="keyword" class="project-search" type="search" :prefix-icon="Search" clearable placeholder="搜索项目名称、简介或关键词，回车检索" @enter="load" />
            <div class="filter-line source-row"><span class="filter-label">来源</span><div class="filter-options"><button v-for="filter in sourceFilters" :key="String(filter.value)" type="button" :class="{ active: filters.source === filter.value }" @click="setFilter('source', filter.value)">{{ filter.label }}</button></div></div>
            <div class="filter-line status-row"><span class="filter-label">状态</span><div class="filter-options"><button v-for="filter in statusFilters" :key="String(filter.value)" type="button" :class="{ active: filters.project_status === filter.value }" @click="setFilter('project_status', filter.value)">{{ filter.label }}</button></div></div>
            <div v-if="allTags.length" class="filter-line tag-line"><span class="filter-label">标签</span><div class="filter-options"><button type="button" :class="{ active: !filters.tag }" @click="setFilter('tag', null)">全部</button><button v-for="tag in allTags" :key="tag" type="button" :class="{ active: filters.tag === tag }" @click="setFilter('tag', tag)">{{ tag }}</button></div></div>
          </DewCard>
          <section class="catalog-results" aria-label="项目列表">
            <div v-if="loading" class="grid-loading"><DewSkeleton v-for="index in 6" :key="index" variant="rect" height="300" rounded="14px" /></div>
            <div v-else-if="!projects.length" class="plaza-empty"><el-icon><Grid /></el-icon><strong>NO PROJECT SIGNAL</strong><p>没有匹配的项目，调整筛选条件或发布第一个项目。</p><DewButton size="sm" type="ghost" @click="clearFilters">查看全部项目</DewButton></div>
            <div v-else-if="!displayProjects.length" class="plaza-empty"><el-icon><Grid /></el-icon><strong>还没有你的项目</strong><p>点右侧「分享我的项目」，把正在做的作品发布到广场。</p><DewButton size="sm" type="ghost" @click="mineOnly = false">查看全部项目</DewButton></div>
            <div v-else class="project-grid">
              <DewCard v-for="project in displayProjects" :key="project.id" class="p-card" :class="{ selected: String(project.id) === selectedId }" interactive @click="openDetail(project.id)">
                <div :class="['p-cover', `cover-${project.source}`]">
                  <DewImage v-if="project.cover_thumb || project.cover" class="cover-img" :src="assetUrl(project.cover_thumb || project.cover)" alt="" />
                  <b v-else class="cover-char" aria-hidden="true">{{ project.title.charAt(0) }}</b>
                  <span :class="['src-badge', `src-${project.source}`]">{{ project.source_text }}</span><span v-if="project.status === 'hidden'" class="hidden-badge">已下架</span>
                </div>
                <div class="p-body">
                  <div class="p-card-topline"><span :class="['p-status', `ps-${project.project_status}`]"><i></i>{{ project.project_status_text }}</span><span>{{ project.track_text || '其他' }}</span></div>
                  <h2>{{ project.title }}</h2>
                  <p>{{ project.summary || project.description || '这个项目正在补充介绍。' }}</p>
                  <div class="p-tags"><span v-for="tag in (project.tags || []).slice(0, 3)" :key="tag">{{ tag }}</span></div>
                  <div class="p-bottom"><div class="creator"><span>{{ (project.owner_name || 'X').charAt(0) }}</span><b>{{ project.owner_name || 'XLAB MEMBER' }}</b></div><div class="engagement"><span><el-icon><View /></el-icon>{{ project.view_count ?? 0 }}</span><span><el-icon><Star /></el-icon>{{ project.favorite_count ?? 0 }}</span></div></div>
                </div>
              </DewCard>
            </div>
          </section>
        </section>
        <aside class="plaza-rail" aria-label="项目功能区">
          <DewCard variant="flat" size="sm" class="rail-actions">
            <DewButton class="rail-secondary" :class="{ on: mineOnly }" block @click="toggleMine"><el-icon><Folder /></el-icon><span>我的项目</span></DewButton>
            <DewButton class="rail-primary" block @click="router.push('/lab/projects/new')"><el-icon><Plus /></el-icon><span>分享我的项目</span></DewButton>
          </DewCard>
          <DewCard variant="flat" size="md" class="plaza-reco">
            <header class="reco-head"><p class="reco-kicker">XLAB PICKS</p><h2>推荐项目</h2></header>
            <ul class="reco-list">
              <li v-for="project in recommendedProjects" :key="project.id">
                <button type="button" class="reco-item" @click="openDetail(project.id)">
                  <span :class="['reco-cover', `cover-${project.source}`]">
                    <DewImage v-if="project.cover_thumb || project.cover" class="reco-img" :src="assetUrl(project.cover_thumb || project.cover)" alt="" />
                    <b v-else class="reco-char" aria-hidden="true">{{ project.title.charAt(0) }}</b>
                  </span>
                  <span class="reco-info">
                    <b class="reco-title">{{ project.title }}</b>
                    <p class="reco-summary">{{ project.summary || project.description || '这个项目正在补充介绍。' }}</p>
                    <small class="reco-meta"><span :class="['p-status', `ps-${project.project_status}`]"><i></i>{{ project.project_status_text }}</span><em>·</em><span>{{ project.source_text }}</span><em>·</em><span class="reco-views"><el-icon><View /></el-icon>{{ project.view_count ?? 0 }}</span></small>
                  </span>
                </button>
              </li>
            </ul>
            <p v-if="!loading && !recommendedProjects.length" class="reco-empty">暂无可推荐的项目</p>
            <footer class="reco-foot">按浏览热度挑选 · 非排名</footer>
          </DewCard>
        </aside>
      </div>
    </main>
    <ProjectDetailDrawer v-if="selectedId" :project-id="selectedId" @close="closeDetail" @updated="syncProject" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { Folder, Grid, Plus, Search, Star, View } from '@element-plus/icons-vue';
import { DewButton, DewCard, DewImage, DewInput, DewSelect, DewSkeleton } from '@bme/dew-ui';
import MenuComponent from '../components/MenuComponent.vue';
import ProjectDetailDrawer from '../components/ProjectDetailDrawer.vue';
import { assetUrl } from '../services/campService';
import { showcaseService } from '../services/showcaseService';
import posterUrl from '../assets/xlab-poster.png.png';
import '../styles/xlab.css';
const router = useRouter(); const route = useRoute(); const store = useStore();
const navOpen = ref(false); const loading = ref(true); const projects = ref([]); const allTags = ref([]); const keyword = ref(''); const sortMode = ref('updated'); const recoPool = ref([]); const mineOnly = ref(false);
const filters = ref({ source: null, project_status: null, tag: null });
let navCloseTimer = null; let loadVersion = 0;
const sourceFilters = [{ label: '全部', value: null }, { label: '营期项目', value: 'camp' }, { label: '自由分享', value: 'community' }];
const statusFilters = [{ label: '全部', value: null }, { label: '构思中', value: 'idea' }, { label: '进行中', value: 'ongoing' }, { label: '已完成', value: 'done' }];
const sortOptions = [{ label: '最近更新', value: 'updated' }, { label: '最多浏览', value: 'popular' }, { label: '最多收藏', value: 'favorites' }];
const hasFilters = computed(() => Boolean(filters.value.source || filters.value.project_status || filters.value.tag || keyword.value.trim()));
const selectedId = computed(() => /^\d+$/.test(String(route.query.project || '')) ? String(route.query.project) : null);
const myUserId = computed(() => {
  const raw = store.state.user?.User_Id;
  const id = Number(raw);
  return raw != null && Number.isSafeInteger(id) && id > 0 ? id : null;
});
const sortedProjects = computed(() => [...projects.value].sort((a, b) => {
  if (sortMode.value === 'popular') return (b.view_count || 0) - (a.view_count || 0);
  if (sortMode.value === 'favorites') return (b.favorite_count || 0) - (a.favorite_count || 0);
  return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
}));
// 「我的项目」：纯前端按 owner_user_id 过滤（列表接口回包自带该字段，无需后端改动）
const displayProjects = computed(() => (mineOnly.value ? sortedProjects.value.filter((project) => myUserId.value !== null && Number(project.owner_user_id) === myUserId.value) : sortedProjects.value));
// 推荐位占位逻辑：仅按浏览量取前 8，不做复杂推荐算法；数据全部来自现有项目接口
const recommendedProjects = computed(() => [...recoPool.value].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 8));
// 海报主视觉：整张设计稿按原始比例（2172×642）展示，双后缀文件名为实际存在名称
const posterStyle = { '--poster-img': `url("${posterUrl}")` };
function navEnter() { clearTimeout(navCloseTimer); navOpen.value = true; }
function navLeave() { clearTimeout(navCloseTimer); navCloseTimer = setTimeout(() => { navOpen.value = Boolean(document.querySelector('.dew-popover')); }, 240); }
function setFilter(key, value) { filters.value = { ...filters.value, [key]: value }; load(); }
function clearFilters() { filters.value = { source: null, project_status: null, tag: null }; keyword.value = ''; mineOnly.value = false; load(); }
function toggleMine() { mineOnly.value = !mineOnly.value; }
function openDetail(id) { router.replace({ query: { ...route.query, project: String(id) } }); }
function closeDetail() { const query = { ...route.query }; delete query.project; router.replace({ query }); }
function syncProject(updated) {
  projects.value = projects.value.map((project) => project.id === updated.id ? { ...project, ...updated } : project);
  recoPool.value = recoPool.value.map((project) => project.id === updated.id ? { ...project, ...updated } : project);
}
async function load() {
  const version = ++loadVersion; loading.value = true;
  try { const params = {}; if (filters.value.source) params.source = filters.value.source; if (filters.value.project_status) params.project_status = filters.value.project_status; if (filters.value.tag) params.tag = filters.value.tag; if (keyword.value.trim()) params.q = keyword.value.trim(); const data = await showcaseService.fetchProjects(params); if (version !== loadVersion) return; projects.value = data.projects || []; allTags.value = data.all_tags || []; if (!Object.keys(params).length) recoPool.value = data.projects || []; }
  catch (error) { if (version === loadVersion) ElMessage.error(error.response?.data?.message || '加载项目列表失败'); }
  finally { if (version === loadVersion) loading.value = false; }
}
 onMounted(load); onBeforeUnmount(() => clearTimeout(navCloseTimer));
</script>

<style scoped>
/* ═══ 基座：浅色内容平台风；框架层复用 DewUI（DewCard/DewInput/DewSelect/DewSkeleton/DewButton），
     XLAB 品牌只通过 --xg-* tokens 和 class 扩展注入，不另造基础组件 ═══ */
.plaza-page{--pq-bg:var(--xg-bg);--pq-card:var(--xg-surface);--pq-line:var(--xg-line);--pq-line-soft:var(--xg-line-soft);--pq-ink:var(--xg-ink);--pq-sub:var(--xg-sub);--pq-faint:var(--xg-faint);--pq-green:var(--xg-green);--pq-green-deep:var(--xg-green-deep);--pq-green-soft:var(--xg-green-soft);--pq-pink:var(--xg-pink);--pq-pink-deep:var(--xg-pink-deep);--pq-pink-soft:var(--xg-pink-soft);position:relative;min-height:100dvh;color:var(--pq-ink);background:var(--pq-bg)}
/* ═══ 海报：整张设计稿原始比例，全宽；下方柔过渡融入浅色主体 ═══ */
.plaza-poster{position:relative;z-index:1;width:100%;aspect-ratio:2172/642;max-height:460px;overflow:hidden;background-color:#eceaf3;background-image:var(--poster-img);background-position:center;background-size:cover;background-repeat:no-repeat}
.plaza-fade{height:56px;background:linear-gradient(180deg,#ebe9f4,var(--pq-bg))}
/* ═══ 主体：居中双栏 ═══ */
.plaza-body{position:relative;z-index:1;box-sizing:border-box;width:100%;max-width:1280px;margin:0 auto;padding:8px clamp(16px,3vw,32px) 96px}
.plaza-layout{display:grid;grid-template-columns:minmax(0,1fr) 292px;gap:28px;align-items:start}
/* ── 左栏标题行 ── */
.catalog-head{display:flex;min-height:44px;margin-bottom:16px;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:12px;border-bottom:1px solid var(--pq-line)}
.catalog-title{display:flex;align-items:baseline;gap:12px}
.catalog-title h2{margin:0;color:var(--pq-ink);font-size:20px;font-weight:700;letter-spacing:.01em}
.catalog-count{color:var(--pq-faint);font-size:12px}.catalog-count strong{color:var(--pq-ink);font-size:14px;font-weight:700}
.catalog-actions{display:flex;flex:0 0 auto;align-items:center;gap:16px}
.catalog-actions>button{padding:0;color:var(--pq-green-deep);background:none;border:0;font-size:12px;cursor:pointer}.catalog-actions>button:hover{color:var(--pq-green)}
.catalog-actions label{display:flex;align-items:center;gap:8px;color:var(--pq-faint);font-size:12px}
.sort-select{width:128px}
/* ── 筛选：DewCard(flat) 容器 + DewInput 搜索 + 轻量胶囊 ── */
.plaza-page .discovery-panel :deep(.dew-card__body){display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center}
.plaza-page .project-search{flex:1 1 230px;min-width:200px;max-width:340px}
.filter-line{display:flex;flex-wrap:wrap;align-items:center;gap:9px}
.filter-label{color:var(--pq-sub);font-size:12.5px;font-weight:500}
.filter-options{display:flex;flex-wrap:wrap;gap:4px}
.filter-options button{min-height:30px;padding:0 13px;color:var(--pq-sub);background:transparent;border:0;border-radius:999px;font-size:12.5px;cursor:pointer;transition:background .15s,color .15s}
.filter-options button:hover{color:var(--pq-ink);background:#ececf2}
.source-row .filter-options button.active{color:var(--pq-green-deep);background:var(--pq-green-soft);font-weight:600}
.status-row .filter-options button.active{color:var(--pq-pink-deep);background:var(--pq-pink-soft);font-weight:600}
.tag-line .filter-options button.active{color:#fff;background:var(--pq-ink);font-weight:600}
/* ── 项目卡：DewCard(interactive) 提供框架/hover/键盘可达；封面贴边，品牌绿 hover ── */
.catalog-results{margin-top:20px}
.grid-loading,.project-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.plaza-page .p-card :deep(.dew-card__body){padding:0!important}
.plaza-page .p-card:hover{border-color:rgba(0,168,118,.45)}
.plaza-page .p-card.selected{border-color:var(--pq-green);box-shadow:0 0 0 2px rgba(0,168,118,.18)}
.p-cover{position:relative;aspect-ratio:16/9;overflow:hidden;background:linear-gradient(135deg,#eef0f5,#e6e9f2)}
.p-cover.cover-community{background:linear-gradient(135deg,#f1eef6,#eadfec)}
.cover-img{position:absolute;inset:0;width:100%;height:100%}
.cover-img :deep(img){width:100%;height:100%;object-fit:cover;transition:transform .3s}
.p-card:hover .cover-img :deep(img){transform:scale(1.025)}
.cover-char{position:absolute;inset:0;display:grid;place-items:center;color:#c9cdd8;font-size:52px;font-weight:800}
.plaza-page .src-badge{position:absolute;top:10px;left:10px;padding:3px 10px;color:var(--pq-green-deep);background:rgba(255,255,255,.92);border-radius:999px;font-family:inherit;font-size:11px;font-weight:600;letter-spacing:normal;box-shadow:0 1px 6px rgba(23,23,28,.08)}
.plaza-page .src-badge.src-community{color:var(--pq-pink-deep)}
.hidden-badge{position:absolute;top:10px;right:10px;padding:3px 10px;color:#fff;background:rgba(23,23,28,.82);border-radius:999px;font-size:11px}
.p-body{display:flex;min-height:148px;padding:14px 15px 13px;flex-direction:column}
.p-card-topline{display:flex;align-items:center;justify-content:space-between;color:var(--pq-faint);font-size:11.5px}
.plaza-page .p-status{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:inherit;font-weight:500}
.plaza-page .p-status i{width:6px;height:6px;background:#b6b6c2;border-radius:50%}
.plaza-page .ps-ongoing{color:var(--pq-green-deep)}.plaza-page .ps-ongoing i{background:var(--pq-green);box-shadow:0 0 0 3px rgba(0,168,118,.15)}
.plaza-page .ps-done{color:var(--pq-pink-deep)}.plaza-page .ps-done i{background:var(--pq-pink)}
.p-card h2{margin:8px 0 0;color:var(--pq-ink);font-size:15.5px;font-weight:650;line-height:1.45;overflow-wrap:anywhere}
.p-card p{display:-webkit-box;margin:6px 0 0;overflow:hidden;color:var(--pq-sub);font-size:12.5px;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.p-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.p-tags span{padding:2px 9px;color:var(--pq-sub);background:var(--pq-line-soft);border-radius:6px;font-size:11px}
.p-bottom{display:flex;margin-top:auto;padding-top:11px;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--pq-line-soft)}
.creator{display:flex;min-width:0;align-items:center;gap:7px}
.creator>span{display:grid;width:24px;height:24px;flex:0 0 auto;place-items:center;color:var(--pq-ink);background:#eef0f5;border-radius:50%;font-size:11px;font-weight:600}
.creator b{overflow:hidden;color:var(--pq-sub);font-size:12px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}
.engagement{display:flex;gap:10px;color:var(--pq-faint);font-size:11.5px}
.engagement span{display:inline-flex;align-items:center;gap:4px}
.engagement .el-icon{font-size:12px}
.plaza-empty{display:grid;min-height:300px;place-items:center;align-content:center;gap:10px;padding:24px;color:var(--pq-faint);border:1px dashed #d9d9e2;border-radius:12px;text-align:center}
.plaza-empty>.el-icon{font-size:26px;color:var(--pq-green)}
.plaza-empty strong{color:var(--pq-ink);font-size:14px;font-weight:650}
.plaza-empty p{margin:0;font-size:12.5px}
/* ── 右栏：DewCard(flat) 动作卡 + 推荐卡；按钮复用 DewButton（品牌色 class 扩展）── */
.plaza-rail{position:sticky;top:20px;display:flex;flex-direction:column;gap:14px}
.plaza-page .rail-actions :deep(.dew-card__body){display:flex;flex-direction:column;gap:10px}
.plaza-page .rail-primary{background:var(--pq-green)!important;border-color:var(--pq-green)!important;color:#fff!important;box-shadow:0 4px 14px rgba(0,168,118,.22)!important}
.plaza-page .rail-primary:hover{background:#009269!important;border-color:#009269!important}
.plaza-page .rail-secondary{background:#fff!important;border-color:#e0e0e8!important;color:var(--pq-ink)!important}
.plaza-page .rail-secondary:hover{border-color:#c9c9d4!important}
.plaza-page .rail-secondary.on{background:var(--pq-ink)!important;border-color:var(--pq-ink)!important;color:#fff!important}
.reco-head{padding:2px 2px 8px}
.reco-kicker{margin:0 0 3px;color:var(--pq-green);font:600 10px var(--xl-mono);letter-spacing:.2em}
.reco-head h2{margin:0;color:var(--pq-ink);font-size:15px;font-weight:700}
.reco-list{margin:0;padding:0 0 2px;list-style:none}
.reco-item{display:flex;width:100%;padding:10px 10px;align-items:flex-start;gap:10px;color:inherit;background:none;border:0;border-radius:10px;cursor:pointer;text-align:left;transition:background .15s}
.reco-item:hover,.reco-item:focus-visible{background:var(--pq-line-soft);outline:none}
.reco-cover{position:relative;box-sizing:border-box;display:grid;width:48px;height:48px;flex:0 0 auto;place-items:center;overflow:hidden;background:linear-gradient(135deg,#eef0f5,#e6e9f2);border-radius:8px}
.reco-cover.cover-community{background:linear-gradient(135deg,#f1eef6,#eadfec)}
.reco-img{position:absolute;inset:0;width:100%;height:100%}
.reco-img :deep(img){width:100%;height:100%;object-fit:cover}
.reco-char{color:#c9cdd8;font-size:19px;font-weight:800}
.reco-info{display:flex;min-width:0;flex:1;flex-direction:column;gap:2px}
.reco-title{overflow:hidden;color:var(--pq-ink);font-size:13px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.reco-summary{display:-webkit-box;margin:0;overflow:hidden;color:var(--pq-faint);font-size:11.5px;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:1}
.reco-meta{display:flex;overflow:hidden;align-items:center;gap:5px;margin-top:2px;color:var(--pq-faint);font-size:11px;white-space:nowrap}
.reco-meta em{font-style:normal;color:#d4d4dd}
.reco-meta .p-status{gap:5px;font-size:11px}
.reco-views{display:inline-flex;align-items:center;gap:3px}
.reco-empty{margin:0;padding:22px 16px;color:var(--pq-faint);font-size:12px;text-align:center}
.reco-foot{padding:10px 2px 0;border-top:1px solid var(--pq-line-soft);color:#b6b6c2;font-size:10.5px}
/* ── 顶部悬停导航 ── */
.xlab-navdock{position:fixed;top:0;right:0;left:0;z-index:999;height:22px}
.xlab-navdock :deep(.el-menu-demo){transform:translateY(-102%);transition:transform .3s cubic-bezier(.2,.85,.25,1)}
.xlab-navdock.nav-open :deep(.el-menu-demo){transform:translateY(0)}
/* ── 响应式 ── */
@media(max-width:1180px){.plaza-layout{grid-template-columns:1fr}.plaza-rail{position:static}.plaza-page .rail-actions :deep(.dew-card__body){flex-direction:row}.plaza-page .rail-actions :deep(.dew-btn){flex:1}.reco-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}.grid-loading,.project-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:740px){.plaza-poster{aspect-ratio:auto;height:clamp(200px,62vw,330px)}.plaza-body{padding:8px 14px 72px}.grid-loading,.project-grid{grid-template-columns:1fr}.catalog-head{align-items:flex-start;flex-direction:column}.catalog-actions{width:100%;justify-content:space-between}.plaza-page .project-search{max-width:none;flex-basis:100%}.reco-list{display:block}.xlab-navdock{height:0}.xlab-navdock :deep(.el-menu-demo){transform:none}}
@media(max-width:560px){.tag-line{display:none}}
@media(prefers-reduced-motion:reduce){.cover-img :deep(img),.reco-item,.xlab-navdock :deep(.el-menu-demo){transition:none}}
</style>
