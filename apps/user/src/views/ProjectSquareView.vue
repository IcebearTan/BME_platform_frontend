<template>
  <div class="xlab-root plaza-page">
    <div class="xlab-navdock" :class="{ 'nav-open': navOpen }" @mouseenter="navEnter" @mouseleave="navLeave">
      <MenuComponent />
    </div>

    <main class="plaza-shell">
      <header class="plaza-header">
        <div class="plaza-header-copy">
          <router-link class="back-link" to="/lab" aria-label="返回 XLAB 首页">
            <el-icon><ArrowLeft /></el-icon><span>XLAB HOME</span>
          </router-link>
          <div class="plaza-kicker"><span></span> PROJECT DIRECTORY / 2026</div>
          <h1 aria-label="XLAB"><span>PROJECT</span> PLAZA</h1>
          <p>把正在发生的实验、已经完成的作品和开放协作的想法放在同一个坐标系里。</p>
        </div>

        <div class="plaza-header-side">
          <div class="plaza-metrics" aria-label="项目广场统计">
            <div><strong>{{ projects.length }}</strong><span>PROJECTS</span></div>
            <div><strong>{{ activeCount }}</strong><span>IN PROGRESS</span></div>
            <div><strong>{{ allTags.length }}</strong><span>FIELDS</span></div>
          </div>
          <button type="button" class="publish-button" @click="router.push('/lab/projects/new')">
            <el-icon><Plus /></el-icon><span>分享我的项目</span>
          </button>
        </div>
      </header>

      <section v-if="featuredProject" class="featured-project" aria-label="精选项目">
        <div class="featured-visual">
          <DewImage v-if="featuredProject.cover_thumb || featuredProject.cover" :src="assetUrl(featuredProject.cover_thumb || featuredProject.cover)" alt="" />
          <div v-else class="featured-fallback" aria-hidden="true"><span class="fallback-grid"></span><b>{{ featuredProject.title.charAt(0) }}</b></div>
          <span class="featured-index">FEATURED / {{ String(featuredProject.id).padStart(4, '0') }}</span>
        </div>
        <div class="featured-copy">
          <div class="featured-meta">
            <span :class="['source-mark', `src-${featuredProject.source}`]">{{ featuredProject.source_text }}</span>
            <span>{{ featuredProject.project_status_text }}</span>
            <span v-if="featuredProject.camp_name">{{ featuredProject.camp_name }}</span>
          </div>
          <h2>{{ featuredProject.title }}</h2>
          <p>{{ featuredProject.summary || featuredProject.description || '这个项目正在补充完整的展示档案。' }}</p>
          <div class="featured-tags"><span v-for="tag in featuredProject.tags.slice(0, 4)" :key="tag">{{ tag }}</span></div>
          <button type="button" class="featured-open" @click="openDetail(featuredProject.id)">查看项目档案 <el-icon><ArrowRight /></el-icon></button>
        </div>
      </section>

      <div class="catalog-layout">
        <aside class="catalog-filters" aria-label="项目筛选">
          <div class="filter-heading"><span>FILTER INDEX</span><button v-if="hasFilters" type="button" @click="clearFilters">清除</button></div>
          <section>
            <h2>来源</h2>
            <div class="filter-options">
              <button v-for="filter in sourceFilters" :key="String(filter.value)" type="button" :aria-label="filter.label" :class="{ active: filters.source === filter.value }" @click="setFilter('source', filter.value)">
                <span>{{ filter.label }}</span><b>{{ sourceCount(filter.value) }}</b>
              </button>
            </div>
          </section>
          <section>
            <h2>状态</h2>
            <div class="filter-options">
              <button v-for="filter in statusFilters" :key="String(filter.value)" type="button" :aria-label="filter.label" :class="{ active: filters.project_status === filter.value }" @click="setFilter('project_status', filter.value)">
                <span>{{ filter.label }}</span>
              </button>
            </div>
          </section>
          <section v-if="allTags.length">
            <h2>领域</h2>
            <div class="tag-filter-list">
              <button type="button" aria-label="全部标签" :class="{ active: !filters.tag }" @click="setFilter('tag', null)">全部</button>
              <button v-for="tag in allTags" :key="tag" type="button" :aria-label="tag" :class="{ active: filters.tag === tag }" @click="setFilter('tag', tag)">{{ tag }}</button>
            </div>
          </section>
        </aside>

        <section class="catalog-results" aria-label="项目列表">
          <div class="catalog-toolbar">
            <label class="project-search">
              <el-icon><Search /></el-icon>
              <input v-model="keyword" type="search" placeholder="搜索项目名 / 简介，回车检索" @keyup.enter="load" />
              <span>ENTER</span>
            </label>
            <div class="result-count"><b>{{ projects.length }}</b> RESULTS</div>
          </div>

          <div v-if="loading" class="grid-loading"><div v-for="index in 6" :key="index" class="project-skeleton"></div></div>
          <div v-else-if="!projects.length" class="xl-empty">
            <el-icon><Grid /></el-icon><div class="xl-empty-code">NO PROJECT SIGNAL</div>
            <div class="xl-empty-hint">没有匹配的项目。调整筛选条件，或发布第一个项目。</div>
            <button type="button" @click="clearFilters">查看全部项目</button>
          </div>

          <div v-else class="project-grid">
            <button v-for="project in projects" :key="project.id" type="button" class="p-card" @click="openDetail(project.id)">
              <div :class="['p-cover', `cover-${project.source}`]">
                <DewImage v-if="project.cover_thumb || project.cover" class="cover-img" :src="assetUrl(project.cover_thumb || project.cover)" alt="" />
                <div v-else class="cover-fallback" aria-hidden="true"><span></span><b class="cover-char">{{ project.title.charAt(0) }}</b></div>
                <span :class="['src-badge', `src-${project.source}`]">{{ project.source_text }}</span>
                <span class="p-id">{{ String(project.id).padStart(4, '0') }}</span>
                <span v-if="project.status === 'hidden'" class="hidden-badge">已下架</span>
              </div>
              <div class="p-body">
                <div class="p-card-topline"><span :class="['p-status', `ps-${project.project_status}`]">{{ project.project_status_text }}</span><span>{{ formatDate(project.updated_at || project.created_at) }}</span></div>
                <h2 class="p-title">{{ project.title }}</h2>
                <p class="p-summary">{{ project.summary || project.description || '暂无简介' }}</p>
                <div class="p-meta"><span v-if="project.camp_name" class="p-camp">{{ project.camp_name }}</span><span v-for="tag in project.tags.slice(0, 3)" :key="tag" class="p-tag">{{ tag }}</span></div>
                <div class="p-bottom">
                  <div class="p-members"><span v-for="(member, index) in (project.members || []).slice(0, 3)" :key="index" :title="member">{{ member.charAt(0) }}</span><span v-if="!project.members?.length && project.owner_name" :title="project.owner_name">{{ project.owner_name.charAt(0) }}</span></div>
                  <div class="p-engagement"><span><el-icon><View /></el-icon>{{ project.view_count ?? 0 }}</span><span><el-icon><Star /></el-icon>{{ project.favorite_count ?? 0 }}</span></div>
                </div>
              </div>
            </button>
          </div>
        </section>
      </div>
    </main>

    <footer class="plaza-footer"><span>XLAB / PROJECT PLAZA</span><span>DISCOVER · BUILD · DOCUMENT</span></footer>
    <ProjectDetailDrawer v-if="selectedId" :project-id="selectedId" @close="closeDetail" @updated="syncProject" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, ArrowRight, Grid, Plus, Search, Star, View } from '@element-plus/icons-vue';
import DewImage from '@bme/dew-ui/DewImage.vue';
import MenuComponent from '../components/MenuComponent.vue';
import ProjectDetailDrawer from '../components/ProjectDetailDrawer.vue';
import { assetUrl } from '../services/campService';
import { showcaseService } from '../services/showcaseService';
import '../styles/xlab.css';

const router = useRouter();
const route = useRoute();
const navOpen = ref(false);
const loading = ref(true);
const projects = ref([]);
const allTags = ref([]);
const keyword = ref('');
const filters = ref({ source: null, project_status: null, tag: null });
const selectedId = ref(null);
let navCloseTimer = null;
let loadVersion = 0;

const sourceFilters = [
  { label: '全部来源', value: null },
  { label: '营期项目', value: 'camp' },
  { label: '自由分享', value: 'community' },
];
const statusFilters = [
  { label: '全部状态', value: null },
  { label: '构思中', value: 'idea' },
  { label: '进行中', value: 'ongoing' },
  { label: '已完成', value: 'done' },
];

const featuredProject = computed(() => projects.value.find((project) => project.project_status === 'ongoing') || projects.value[0] || null);
const activeCount = computed(() => projects.value.filter((project) => project.project_status === 'ongoing').length);
const hasFilters = computed(() => Boolean(filters.value.source || filters.value.project_status || filters.value.tag || keyword.value.trim()));

function navEnter() { clearTimeout(navCloseTimer); navOpen.value = true; }
function navLeave() { clearTimeout(navCloseTimer); navCloseTimer = setTimeout(() => { navOpen.value = Boolean(document.querySelector('.dew-popover')); }, 240); }
function sourceCount(value) { return value ? projects.value.filter((project) => project.source === value).length : projects.value.length; }
function formatDate(value) {
  if (!value) return 'NOW';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'NOW' : new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date);
}
function setFilter(key, value) { filters.value = { ...filters.value, [key]: value }; load(); }
function clearFilters() { filters.value = { source: null, project_status: null, tag: null }; keyword.value = ''; load(); }
function openDetail(id) { router.replace({ query: { ...route.query, project: String(id) } }); }
function closeDetail() { const query = { ...route.query }; delete query.project; router.replace({ query }); }
function syncProject(updated) { projects.value = projects.value.map((project) => project.id === updated.id ? { ...project, ...updated } : project); }

watch(() => route.query.project, (id) => { selectedId.value = /^\d+$/.test(String(id || '')) ? String(id) : null; }, { immediate: true });

async function load() {
  const version = ++loadVersion;
  loading.value = true;
  try {
    const params = {};
    if (filters.value.source) params.source = filters.value.source;
    if (filters.value.project_status) params.project_status = filters.value.project_status;
    if (filters.value.tag) params.tag = filters.value.tag;
    if (keyword.value.trim()) params.q = keyword.value.trim();
    const data = await showcaseService.fetchProjects(params);
    if (version !== loadVersion) return;
    projects.value = data.projects || [];
    allTags.value = data.all_tags || [];
  } catch (error) {
    if (version !== loadVersion) return;
    ElMessage.error(error.response?.data?.message || '加载项目列表失败');
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}

onMounted(load);
onBeforeUnmount(() => clearTimeout(navCloseTimer));
</script>

<style scoped>
.plaza-page{--plaza-bg:#030913;--plaza-panel:#071321;--plaza-line:rgba(137,190,225,.2);--plaza-blue:#73c9ff;--plaza-cyan:#73eadb;--plaza-gold:#f0c97a;min-height:100dvh;color:#eef8ff;background:var(--plaza-bg)}
.plaza-shell{box-sizing:border-box}
.plaza-shell{width:min(1480px,100%);margin:0 auto;padding:54px clamp(18px,3vw,44px) 72px}.plaza-header{display:grid;padding:34px 0 30px;grid-template-columns:minmax(0,1fr) auto;gap:48px;border-bottom:1px solid var(--plaza-line)}.plaza-header-copy{max-width:720px}.back-link{display:inline-flex;align-items:center;gap:8px;color:rgba(210,232,246,.56);font:10px var(--xl-mono);text-decoration:none}.back-link:hover,.back-link:focus-visible{color:#fff;outline:none}.plaza-kicker{display:flex;margin-top:32px;align-items:center;gap:10px;color:var(--plaza-blue);font:10px var(--xl-mono)}.plaza-kicker span{display:block;width:46px;height:1px;background:var(--plaza-blue);box-shadow:0 0 8px rgba(115,201,255,.72)}.plaza-header h1{margin:12px 0 0;font:900 clamp(44px,6.2vw,88px)/.9 Arial Black,Arial,sans-serif;letter-spacing:0}.plaza-header h1 span{color:transparent;-webkit-text-stroke:1px rgba(211,237,255,.7)}.plaza-header-copy>p{max-width:620px;margin:20px 0 0;color:rgba(212,230,241,.66);font-size:13px;line-height:1.8}.plaza-header-side{display:flex;min-width:350px;flex-direction:column;align-items:flex-end;justify-content:flex-end;gap:22px}.plaza-metrics{display:grid;width:100%;grid-template-columns:repeat(3,minmax(86px,1fr));border:1px solid var(--plaza-line)}.plaza-metrics div{padding:16px 14px;border-left:1px solid var(--plaza-line)}.plaza-metrics div:first-child{border-left:0}.plaza-metrics strong{display:block;font:700 22px var(--xl-mono)}.plaza-metrics span{display:block;margin-top:5px;color:rgba(189,215,232,.44);font:8px var(--xl-mono);white-space:nowrap}.publish-button{display:inline-flex;min-height:44px;padding:0 18px;align-items:center;gap:10px;color:#07111b;background:#f3f9fc;border:1px solid #fff;font-size:12px;font-weight:700;cursor:pointer}.publish-button:hover,.publish-button:focus-visible{background:var(--plaza-gold);border-color:var(--plaza-gold);outline:none}
.featured-project{display:grid;min-height:320px;margin-top:30px;grid-template-columns:minmax(0,1.45fr) minmax(340px,.8fr);background:#06101c;border:1px solid var(--plaza-line)}.featured-visual{position:relative;min-height:320px;overflow:hidden;background-image:linear-gradient(90deg,transparent 55%,rgba(6,16,28,.9)),url('../assets/xlab-space-hero.png');background-position:center;background-size:cover}.featured-visual :deep(.dew-image){position:absolute;inset:0;width:100%;height:100%}.featured-visual :deep(img){width:100%;height:100%;object-fit:cover}.featured-visual::after{position:absolute;inset:0;content:'';pointer-events:none;background:linear-gradient(0deg,rgba(3,9,19,.78),transparent 55%)}.featured-fallback{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden}.fallback-grid{position:absolute;inset:0;opacity:.28;background:repeating-linear-gradient(0deg,transparent 0 27px,rgba(135,204,246,.18) 28px),repeating-linear-gradient(90deg,transparent 0 27px,rgba(135,204,246,.18) 28px)}.featured-fallback b{position:relative;color:rgba(213,240,255,.16);font:900 clamp(120px,18vw,260px)/1 Arial Black,Arial,sans-serif;-webkit-text-stroke:1px rgba(166,219,251,.36)}.featured-index{position:absolute;bottom:18px;left:20px;z-index:2;color:rgba(224,241,250,.72);font:9px var(--xl-mono)}.featured-copy{display:flex;min-width:0;padding:clamp(26px,4vw,52px);flex-direction:column;justify-content:center}.featured-meta{display:flex;flex-wrap:wrap;gap:8px 14px;color:rgba(198,222,236,.5);font:9px var(--xl-mono)}.source-mark{color:var(--plaza-cyan)}.source-mark.src-community{color:var(--plaza-gold)}.featured-copy h2{margin:17px 0 0;font-size:clamp(28px,3.2vw,46px);line-height:1.05;overflow-wrap:anywhere}.featured-copy>p{margin:16px 0 0;color:rgba(215,233,243,.68);font-size:13px;line-height:1.75}.featured-tags{display:flex;margin-top:18px;flex-wrap:wrap;gap:6px}.featured-tags span{padding:4px 7px;color:rgba(209,232,244,.7);font:9px var(--xl-mono);border:1px solid rgba(141,190,219,.24)}.featured-open{display:inline-flex;margin-top:25px;padding:0;align-items:center;gap:8px;align-self:flex-start;color:#fff;background:none;border:0;font:700 11px var(--xl-mono);cursor:pointer}.featured-open:hover,.featured-open:focus-visible{color:var(--plaza-blue);outline:none}
.catalog-layout{display:grid;margin-top:42px;grid-template-columns:210px minmax(0,1fr);gap:clamp(28px,4vw,58px)}.catalog-filters{min-width:0}.filter-heading{display:flex;min-height:38px;align-items:center;justify-content:space-between;color:rgba(215,235,247,.7);font:10px var(--xl-mono);border-bottom:1px solid var(--plaza-line)}.filter-heading button{padding:0;color:var(--plaza-blue);background:none;border:0;font:9px var(--xl-mono);cursor:pointer}.catalog-filters section{padding:22px 0;border-bottom:1px solid var(--plaza-line)}.catalog-filters h2{margin:0 0 12px;color:rgba(189,214,230,.42);font:9px var(--xl-mono)}.filter-options{display:grid;gap:4px}.filter-options button{display:flex;min-height:34px;padding:0 10px;align-items:center;justify-content:space-between;color:rgba(223,238,247,.68);background:transparent;border:1px solid transparent;font-size:12px;text-align:left;cursor:pointer}.filter-options button b{color:rgba(179,210,229,.36);font:9px var(--xl-mono)}.filter-options button:hover,.filter-options button.active{color:#fff;background:rgba(112,190,239,.07);border-color:rgba(115,201,255,.28)}.tag-filter-list{display:flex;flex-wrap:wrap;gap:5px}.tag-filter-list button{padding:5px 7px;color:rgba(207,227,239,.56);background:transparent;border:1px solid rgba(132,177,204,.18);font:9px var(--xl-mono);cursor:pointer}.tag-filter-list button:hover,.tag-filter-list button.active{color:#04101a;background:var(--plaza-cyan);border-color:var(--plaza-cyan)}
.catalog-results{min-width:0}.catalog-toolbar{display:flex;min-height:52px;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid var(--plaza-line)}.project-search{display:flex;width:min(520px,100%);align-items:center;gap:10px;color:rgba(185,215,232,.45)}.project-search input{width:100%;min-width:0;padding:10px 0;color:#fff;background:transparent;border:0;outline:0;font-size:12px}.project-search input::placeholder{color:rgba(183,210,226,.38)}.project-search span,.result-count{color:rgba(179,208,226,.38);font:8px var(--xl-mono)}.result-count b{color:var(--plaza-blue)}.grid-loading,.project-grid{display:grid;margin-top:18px;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.project-skeleton{min-height:350px;border:1px solid var(--plaza-line);background:linear-gradient(100deg,#071321 20%,#0c1d2e 48%,#071321 74%);background-size:240% 100%;animation:plaza-loading 1.2s linear infinite}@keyframes plaza-loading{to{background-position:-240% 0}}
.p-card{display:flex;min-width:0;padding:0;flex-direction:column;color:#fff;text-align:left;background:#06111d;border:1px solid var(--plaza-line);cursor:pointer;transition:transform .2s,border-color .2s,box-shadow .2s}.p-card:hover,.p-card:focus-visible{z-index:2;border-color:rgba(126,211,255,.64);box-shadow:0 16px 38px rgba(0,0,0,.34);transform:translateY(-4px);outline:none}.p-cover{position:relative;aspect-ratio:16/10;overflow:hidden;background:#071728;border-bottom:1px solid var(--plaza-line)}.cover-community{background:#18170f}.cover-img{position:absolute;inset:0;width:100%;height:100%}.cover-img :deep(img){width:100%;height:100%;object-fit:cover;transition:transform .35s}.p-card:hover .cover-img :deep(img){transform:scale(1.025)}.cover-fallback{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden}.cover-fallback span{position:absolute;inset:0;background:linear-gradient(120deg,transparent 0 46%,rgba(117,209,255,.14) 46% 47%,transparent 47%),repeating-linear-gradient(0deg,transparent 0 23px,rgba(159,208,236,.08) 24px),repeating-linear-gradient(90deg,transparent 0 23px,rgba(159,208,236,.08) 24px)}.cover-community .cover-fallback span{background:linear-gradient(120deg,transparent 0 46%,rgba(240,201,122,.18) 46% 47%,transparent 47%),repeating-linear-gradient(0deg,transparent 0 23px,rgba(240,211,153,.07) 24px),repeating-linear-gradient(90deg,transparent 0 23px,rgba(240,211,153,.07) 24px)}.cover-fallback b{position:relative;color:rgba(182,226,251,.14);font:900 88px Arial Black,Arial,sans-serif;-webkit-text-stroke:1px rgba(169,220,250,.38)}.cover-community .cover-fallback b{color:rgba(240,201,122,.1);-webkit-text-stroke-color:rgba(240,201,122,.36)}.src-badge{position:absolute;top:10px;left:10px;z-index:2}.plaza-page :deep(.src-badge){color:var(--plaza-cyan);background:rgba(3,10,17,.84);border-color:rgba(115,234,219,.42)}.plaza-page :deep(.src-community){color:var(--plaza-gold);border-color:rgba(240,201,122,.48)}.p-id{position:absolute;right:11px;bottom:9px;color:rgba(220,237,247,.42);font:8px var(--xl-mono)}.hidden-badge{position:absolute;top:10px;right:10px;padding:3px 7px;color:#fff;background:rgba(145,45,58,.88);font-size:9px}.p-body{display:flex;min-height:190px;padding:16px;flex-direction:column}.p-card-topline{display:flex;align-items:center;justify-content:space-between;color:rgba(181,209,226,.38);font:8px var(--xl-mono)}.plaza-page :deep(.ps-ongoing){color:var(--plaza-cyan)}.plaza-page :deep(.ps-done){color:var(--plaza-gold)}.plaza-page :deep(.ps-idea){color:rgba(197,220,233,.58)}.p-title{margin:12px 0 0;font-size:17px;line-height:1.35;overflow-wrap:anywhere}.p-summary{display:-webkit-box;margin:9px 0 0;overflow:hidden;color:rgba(207,226,237,.58);font-size:11px;line-height:1.65;-webkit-box-orient:vertical;-webkit-line-clamp:2}.p-meta{display:flex;margin-top:15px;flex-wrap:wrap;gap:5px}.p-camp,.p-tag{padding:3px 6px;color:rgba(211,232,243,.52);font:8px var(--xl-mono);border:1px solid rgba(135,181,208,.16)}.p-camp{color:var(--plaza-cyan);border-color:rgba(115,234,219,.25)}.p-bottom{display:flex;margin-top:auto;padding-top:15px;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--plaza-line)}.p-members{display:flex;padding-left:5px}.p-members span{display:grid;width:25px;height:25px;margin-left:-5px;place-items:center;color:#eaf8ff;background:#10263a;border:1px solid rgba(142,205,239,.48);border-radius:50%;font-size:9px}.p-engagement{display:flex;align-items:center;gap:10px;color:rgba(187,213,229,.48);font:8px var(--xl-mono)}.p-engagement span{display:inline-flex;align-items:center;gap:4px}.xl-empty{display:grid;min-height:360px;margin-top:18px;place-items:center;align-content:center;gap:12px;color:rgba(192,218,233,.45);border-color:var(--plaza-line)}.xl-empty>.el-icon{font-size:28px}.xl-empty button{margin-top:4px;padding:8px 12px;color:var(--plaza-blue);background:transparent;border:1px solid rgba(115,201,255,.35);cursor:pointer}.plaza-footer{display:flex;padding:18px clamp(18px,3vw,44px) 28px;justify-content:space-between;gap:16px;color:rgba(165,196,214,.32);border-top:1px solid var(--plaza-line);font:8px var(--xl-mono)}
.plaza-header{grid-template-columns:minmax(0,1fr) minmax(280px,350px)}
.xlab-navdock{position:fixed;top:0;right:0;left:0;z-index:999;height:24px}.xlab-navdock :deep(.el-menu-demo){transform:translateY(-102%);transition:transform .3s cubic-bezier(.2,.85,.25,1)}.xlab-navdock.nav-open :deep(.el-menu-demo){transform:translateY(0)}
@media(max-width:1120px){.grid-loading,.project-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.featured-project{grid-template-columns:1.1fr .9fr}}
@media(max-width:820px){.plaza-shell{padding-top:64px}.plaza-header{grid-template-columns:1fr;gap:24px}.plaza-header-side{min-width:0;align-items:stretch}.publish-button{justify-content:center}.featured-project{grid-template-columns:1fr}.featured-visual{min-height:230px}.catalog-layout{grid-template-columns:1fr}.catalog-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 22px}.filter-heading{grid-column:1/-1}.catalog-filters section:last-child{grid-column:1/-1}.xlab-navdock{height:0}.xlab-navdock :deep(.el-menu-demo){transform:none}}
@media(max-width:600px){.plaza-shell{padding-right:14px;padding-left:14px}.plaza-header h1{font-size:46px}.plaza-metrics{grid-template-columns:repeat(3,1fr)}.plaza-metrics div{padding:12px 8px}.plaza-metrics strong{font-size:18px}.featured-copy{padding:24px 18px}.catalog-filters{grid-template-columns:1fr}.catalog-filters section:last-child{grid-column:auto}.catalog-toolbar{align-items:flex-start;flex-direction:column;gap:8px;padding-bottom:12px}.grid-loading,.project-grid{grid-template-columns:1fr}.plaza-footer{flex-direction:column}}
@media(prefers-reduced-motion:reduce){.project-skeleton{animation:none}.p-card,.cover-img :deep(img),.xlab-navdock :deep(.el-menu-demo){transition:none}}
</style>
