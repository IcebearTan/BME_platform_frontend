<template>
  <!-- XLab（原项目广场，功能扩展轮 §五）：全站项目展示/交流/数字资产板块。
       双来源=营期项目发布投影 + 用户自由分享；视觉为页面级定制（黑白 + 荧光绿/粉，扁平失真风），
       共享主题在 ../styles/xlab.css，豁免 DewUI。 -->
  <div class="xlab-root">
    <div style="height: 60px;"></div>
    <MenuComponent />

    <!-- HERO：大幅宣传区（蓝图网格 + 扫描线 + RGB 分流 glitch） -->
    <header class="xlab-hero">
      <div class="hero-inner">
        <div class="hero-eyebrow">// BME_PLATFORM :: PROJECT_LAB — SIGNAL.ACQUIRED</div>
        <h1 class="glitch" data-text="XLAB">XLAB</h1>
        <p class="hero-cn">工程实验场<span class="cursor">_</span></p>
        <p class="hero-sub">营期项目 × 自由分享，双源汇聚的数字资产库——正在做与已经做完的项目，都在这里。</p>

        <div class="hero-stats">
          <span class="stat"><b>{{ projects.length }}</b>&nbsp;PROJECTS</span>
          <span class="stat"><b>{{ allTags.length }}</b>&nbsp;TAGS</span>
          <span class="stat"><b>2</b>&nbsp;SOURCES</span>
          <span class="stat live"><i class="dot"></i>LIVE</span>
        </div>

        <div class="hero-actions">
          <div class="xl-search">
            <el-icon :size="14"><Search /></el-icon>
            <input v-model="keyword" type="text" placeholder="搜索项目名 / 简介，回车检索" @keyup.enter="load" />
          </div>
          <button type="button" class="xl-btn primary" @click="openCreate">分享我的项目</button>
        </div>
      </div>

      <div class="ticker" aria-hidden="true">
        <div class="ticker-track">
          <span v-for="i in 2" :key="i" class="ticker-seg">EXPERIMENT&nbsp;//&nbsp;BUILD&nbsp;//&nbsp;BREAK&nbsp;//&nbsp;REBUILD&nbsp;//&nbsp;SHIP&nbsp;//&nbsp;DOCUMENT&nbsp;//&nbsp;营期项目&nbsp;×&nbsp;自由分享&nbsp;//&nbsp;DIGITAL_ASSETS.LAB&nbsp;//&nbsp;</span>
        </div>
      </div>
    </header>

    <!-- 主体：筛选 + 卡片网格 -->
    <main class="xlab-main">
      <div class="filter-bar">
        <div class="sec-row">
          <div class="xl-sec-label">// INDEX — 项目索引</div>
          <div class="sec-count">{{ projects.length }} ITEMS</div>
        </div>
        <div class="xl-chip-row">
          <button v-for="f in sourceFilters" :key="f.value" type="button"
                  :class="['xl-chip', { on: filters.source === f.value }]" @click="setFilter('source', f.value)">
            {{ f.label }}
          </button>
        </div>
        <div class="xl-chip-row">
          <button v-for="f in statusFilters" :key="f.value" type="button"
                  :class="['xl-chip', { on: filters.project_status === f.value }]" @click="setFilter('project_status', f.value)">
            {{ f.label }}
          </button>
        </div>
        <div v-if="allTags.length" class="xl-chip-row">
          <button type="button" :class="['xl-chip', 'tag', { on: !filters.tag }]" @click="setFilter('tag', null)">全部标签</button>
          <button v-for="t in allTags" :key="t" type="button"
                  :class="['xl-chip', 'tag', { on: filters.tag === t }]" @click="setFilter('tag', t)">{{ t }}</button>
        </div>
      </div>

      <!-- 卡片网格 -->
      <div v-if="loading" class="grid-loading">
        <div v-for="i in 4" :key="i" class="xl-skel"></div>
      </div>
      <div v-else-if="!projects.length" class="xl-empty">
        <div class="xl-empty-code">// NO_SIGNAL</div>
        <div class="xl-empty-hint">还没有项目。点上方「分享我的项目」发第一个；营期项目由负责人在营期工作台发布。</div>
      </div>
      <div v-else class="project-grid">
        <div v-for="p in projects" :key="p.id" class="p-card" @click="goDetail(p.id)">
          <!-- 封面兜底色块（MVP 无上传，用标题首字描边） -->
          <div :class="['p-cover', `cover-${p.source}`]">
            <span class="cover-char">{{ p.title.charAt(0) }}</span>
            <span :class="['src-badge', `src-${p.source}`]">{{ p.source_text }}</span>
            <span v-if="p.status === 'hidden'" class="hidden-badge">已下架</span>
            <span class="p-id">#{{ String(p.id).padStart(4, '0') }}</span>
          </div>
          <div class="p-body">
            <div class="p-title-row">
              <span class="p-title">{{ p.title }}</span>
              <span :class="['p-status', `ps-${p.project_status}`]">{{ p.project_status_text }}</span>
            </div>
            <p class="p-summary">{{ p.summary || p.description || '暂无简介' }}</p>
            <div class="p-meta">
              <span v-if="p.camp_name" class="p-camp">{{ p.camp_name }}</span>
              <span v-for="t in p.tags.slice(0, 3)" :key="t" class="p-tag">{{ t }}</span>
              <span class="p-views">{{ p.view_count }} VIEWS</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="xlab-foot">
      <div class="xlab-foot-inner">
        <span>XLAB // BME_PLATFORM</span>
        <span>EXPERIMENT · DOCUMENT · SHIP</span>
      </div>
    </footer>

    <!-- 分享我的项目（community 免审上架）——XLab 定制扁平弹层 -->
    <Teleport to="body">
      <div v-if="dlg" class="xdlg-overlay" @click.self="dlg = false">
        <div class="xlab-dialog">
          <div class="xdlg-head">
            <span class="xdlg-title">// SHARE_NEW_PROJECT — 分享我的项目</span>
            <button type="button" class="xdlg-close" @click="dlg = false"><el-icon><Close /></el-icon></button>
          </div>
          <div class="create-form">
            <div class="xl-field"><span class="xl-no">01</span>项目名称<em class="xl-req">*REQ</em></div>
            <input v-model="form.title" class="xl-input" placeholder="如：宿舍智能门锁" />
            <div class="xl-field"><span class="xl-no">02</span>一句话简介</div>
            <input v-model="form.summary" class="xl-input" placeholder="列表页展示（300 字内）" />
            <div class="xl-field"><span class="xl-no">03</span>详细介绍</div>
            <textarea v-model="form.description" class="xl-input" rows="4" placeholder="做了什么、怎么做的、给谁用"></textarea>
            <div class="xl-field"><span class="xl-no">04</span>状态</div>
            <div class="xl-chip-row">
              <button v-for="s in statusFilters.filter((x) => x.value)" :key="s.value" type="button"
                      :class="['xl-chip', { on: form.project_status === s.value }]"
                      @click="form.project_status = s.value">{{ s.label }}</button>
            </div>
            <div class="xl-field"><span class="xl-no">05</span>标签<em class="xl-opt">逗号分隔，最多 6 个</em></div>
            <input v-model="form.tagsText" class="xl-input" placeholder="硬件, 物联网" />
            <div class="xl-field"><span class="xl-no">06</span>成员<em class="xl-opt">可选公开，逗号分隔</em></div>
            <input v-model="form.membersText" class="xl-input" placeholder="展示项目成员昵称" />
            <div class="xl-field"><span class="xl-no">07</span>资料链接<em class="xl-opt">每行一条：名称 空格 链接，最多 10 条</em></div>
            <textarea v-model="form.linksText" class="xl-input" rows="2" placeholder="开源仓库 https://github.com/..."></textarea>
            <div class="xl-note">自由分享免审上架；管理员可下架违规内容。营期项目请由负责人在营期工作台发布。</div>
            <div class="xl-actions">
              <button type="button" class="xl-btn ghost" @click="dlg = false">取消</button>
              <button type="button" class="xl-btn primary" :disabled="!form.title.trim() || saving" @click="save">
                {{ saving ? 'TRANSMITTING…' : '发布' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search, Close } from '@element-plus/icons-vue';
import MenuComponent from '../components/MenuComponent.vue';
import { showcaseService } from '../services/showcaseService';
import '../styles/xlab.css';

const router = useRouter();

const loading = ref(true);
const projects = ref([]);
const allTags = ref([]);
const keyword = ref('');
const filters = ref({ source: null, project_status: null, tag: null });

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

function setFilter(key, value) {
  filters.value = { ...filters.value, [key]: value };
  load();
}
function goDetail(id) {
  router.push(`/projects/${id}`);
}

async function load() {
  loading.value = true;
  try {
    const params = {};
    if (filters.value.source) params.source = filters.value.source;
    if (filters.value.project_status) params.project_status = filters.value.project_status;
    if (filters.value.tag) params.tag = filters.value.tag;
    const kw = keyword.value.trim();
    if (kw) params.q = kw;
    const d = await showcaseService.fetchProjects(params);
    projects.value = d.projects || [];
    allTags.value = d.all_tags || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载项目列表失败');
  } finally {
    loading.value = false;
  }
}
onMounted(load);

// ── community 分享 ──
const dlg = ref(false);
const saving = ref(false);
const form = ref({ title: '', summary: '', description: '', project_status: 'ongoing', tagsText: '', membersText: '', linksText: '' });

function openCreate() {
  form.value = { title: '', summary: '', description: '', project_status: 'ongoing', tagsText: '', membersText: '', linksText: '' };
  dlg.value = true;
}
const parseList = (text) => text.split(/[,，]/).map((x) => x.trim()).filter(Boolean);
function parseLinks(text) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\S+)\s+(https?:\/\/\S+)$/);
      return m ? { label: m[1], url: m[2] } : { label: line.slice(0, 40), url: line };
    });
}
async function save() {
  if (saving.value || !form.value.title.trim()) return;
  saving.value = true;
  try {
    const r = await showcaseService.createProject({
      title: form.value.title.trim(),
      summary: form.value.summary.trim() || null,
      description: form.value.description.trim() || null,
      project_status: form.value.project_status,
      tags: parseList(form.value.tagsText),
      members: parseList(form.value.membersText),
      links: parseLinks(form.value.linksText),
    });
    ElMessage.success(r.message || '已发布');
    dlg.value = false;
    load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发布失败');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
/* XLab 列表页专属布局；共享 tokens/按钮/输入/chips/弹层见 ../styles/xlab.css */

/* ── HERO ── */
.xlab-hero {
  position: relative;
  border-bottom: 1px solid var(--xl-line);
  background:
    radial-gradient(80% 60% at 78% 8%, rgba(0, 255, 156, 0.06), transparent 62%),
    radial-gradient(55% 55% at 12% 95%, rgba(255, 46, 151, 0.05), transparent 65%),
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    var(--xl-bg);
  background-size: auto, auto, 44px 44px, 44px 44px, auto;
  overflow: hidden;
}
/* 扫描线：叠在内容之上，极低透明度不糊字 */
.xlab-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, transparent 0 2px, rgba(255, 255, 255, 0.02) 2px 4px);
  pointer-events: none;
}
.hero-inner { position: relative; max-width: 1280px; margin: 0 auto; padding: 64px 20px 48px; }
.hero-eyebrow {
  font-family: var(--xl-mono); font-size: 12px; letter-spacing: 0.12em;
  color: var(--xl-green); margin-bottom: 18px;
}

/* 大标题：常态带 RGB 色散描边，周期性 glitch 切片 */
.glitch {
  position: relative; display: inline-block; margin: 0;
  font-family: var(--xl-mono); font-weight: 800;
  font-size: clamp(76px, 13vw, 164px); line-height: 0.95; letter-spacing: 0.04em; color: #fff;
  text-shadow: 2px 0 rgba(0, 255, 156, 0.35), -2px 0 rgba(255, 46, 151, 0.35);
}
.glitch::before, .glitch::after {
  content: attr(data-text); position: absolute; inset: 0;
  text-shadow: none; opacity: 0; pointer-events: none;
}
.glitch::before { color: var(--xl-green); animation: glitch-a 4.2s infinite steps(1); }
.glitch::after { color: var(--xl-pink); animation: glitch-b 3.6s infinite steps(1); }
@keyframes glitch-a {
  0%, 84%, 100% { opacity: 0; clip-path: inset(50% 0 50% 0); transform: translate(0, 0); }
  85% { opacity: 0.9; clip-path: inset(8% 0 74% 0); transform: translate(-5px, -2px); }
  88% { opacity: 0.9; clip-path: inset(62% 0 20% 0); transform: translate(4px, 1px); }
  91% { opacity: 0.9; clip-path: inset(34% 0 52% 0); transform: translate(-4px, 2px); }
  94% { opacity: 0.9; clip-path: inset(80% 0 4% 0); transform: translate(5px, -1px); }
  97% { opacity: 0; clip-path: inset(50% 0 50% 0); }
}
@keyframes glitch-b {
  0%, 78%, 100% { opacity: 0; clip-path: inset(50% 0 50% 0); transform: translate(0, 0); }
  79% { opacity: 0.9; clip-path: inset(70% 0 12% 0); transform: translate(5px, 2px); }
  83% { opacity: 0.9; clip-path: inset(18% 0 66% 0); transform: translate(-4px, -2px); }
  87% { opacity: 0.9; clip-path: inset(48% 0 38% 0); transform: translate(4px, -1px); }
  92% { opacity: 0; clip-path: inset(50% 0 50% 0); }
}

.hero-cn { font-size: 21px; font-weight: 600; color: #fff; margin: 10px 0 8px; letter-spacing: 0.06em; }
.cursor { color: var(--xl-green); animation: xlab-blink 1.1s steps(1) infinite; }
@keyframes xlab-blink { 50% { opacity: 0; } }
.hero-sub { font-size: 13.5px; color: var(--xl-dim); max-width: 560px; line-height: 1.7; margin: 0; }

.hero-stats {
  display: flex; align-items: center; gap: 26px; flex-wrap: wrap; margin-top: 26px;
  font-family: var(--xl-mono); font-size: 11.5px; letter-spacing: 0.1em; color: var(--xl-faint);
}
.stat b { color: #fff; font-size: 14px; margin-right: 2px; }
.stat.live { color: var(--xl-green); display: inline-flex; align-items: center; gap: 7px; }
.stat.live .dot { width: 7px; height: 7px; background: var(--xl-green); animation: xlab-pulse 1.6s ease-in-out infinite; }
@keyframes xlab-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }

.hero-actions { display: flex; align-items: stretch; gap: 14px; flex-wrap: wrap; margin-top: 30px; }

/* 跑马灯分隔带 */
.ticker { position: relative; border-top: 1px solid var(--xl-line); background: rgba(0, 0, 0, 0.55); overflow: hidden; }
.ticker-track { display: flex; width: max-content; animation: xlab-ticker 30s linear infinite; }
.ticker-seg {
  font-family: var(--xl-mono); font-size: 11.5px; letter-spacing: 0.14em;
  color: var(--xl-green); opacity: 0.75; padding: 9px 0; white-space: nowrap;
}
@keyframes xlab-ticker { to { transform: translateX(-50%); } }

/* ── 主体 ── */
.xlab-main { max-width: 1280px; margin: 0 auto; padding: 30px 20px 64px; }
.sec-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.sec-count { font-family: var(--xl-mono); font-size: 11px; letter-spacing: 0.1em; color: var(--xl-faint); }
.filter-bar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; }

/* 搜索框（hero 内） */
.xl-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--xl-panel-2); border: 1px solid var(--xl-line);
  padding: 0 12px; height: 41px; width: min(380px, 100%); color: var(--xl-faint);
  transition: border-color 0.15s, box-shadow 0.15s, color 0.15s;
}
.xl-search:focus-within { border-color: var(--xl-green); box-shadow: 3px 3px 0 rgba(0, 255, 156, 0.14); color: var(--xl-green); }
.xl-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: #fff; font-size: 13px; font-family: inherit; }
.xl-search input::placeholder { color: var(--xl-faint); }

/* ── 卡片网格 ── */
.grid-loading, .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.p-card {
  position: relative; display: flex; flex-direction: column;
  background: var(--xl-panel); border: 1px solid var(--xl-line); cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.p-card:hover { border-color: rgba(0, 255, 156, 0.55); box-shadow: 6px 6px 0 rgba(0, 255, 156, 0.13); }
.p-card::before, .p-card::after {
  content: ''; position: absolute; width: 12px; height: 12px;
  opacity: 0; transition: opacity 0.15s; pointer-events: none;
}
.p-card::before { top: -1px; left: -1px; border-top: 2px solid var(--xl-green); border-left: 2px solid var(--xl-green); }
.p-card::after { bottom: -1px; right: -1px; border-bottom: 2px solid var(--xl-green); border-right: 2px solid var(--xl-green); }
.p-card:hover::before, .p-card:hover::after { opacity: 1; }

.p-cover {
  height: 112px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden;
  border-bottom: 1px solid var(--xl-line);
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 18px 18px;
  background-color: var(--xl-panel-2);
}
.cover-camp { background-color: #0c1914; }
.cover-community { background-color: #190e14; }
.cover-char {
  font-family: var(--xl-mono); font-size: 46px; font-weight: 800;
  color: transparent; -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3); user-select: none;
}
.p-card:hover .cover-char { -webkit-text-stroke-color: rgba(0, 255, 156, 0.6); }
.hidden-badge {
  position: absolute; top: 8px; right: 8px;
  font-family: var(--xl-mono); font-size: 10.5px; padding: 2px 8px;
  color: var(--xl-pink); background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 46, 151, 0.5);
}
.p-id { position: absolute; bottom: 6px; right: 10px; font-family: var(--xl-mono); font-size: 10px; letter-spacing: 0.08em; color: var(--xl-faint); }

.p-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.p-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.p-title {
  font-size: 15.5px; font-weight: 650; color: #fff;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.p-card:hover .p-title { text-shadow: 1.5px 0 rgba(0, 255, 156, 0.55), -1.5px 0 rgba(255, 46, 151, 0.55); }
.p-summary {
  font-size: 12.5px; color: var(--xl-dim); line-height: 1.65; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.p-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: auto; }
.p-camp { font-family: var(--xl-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; color: var(--xl-green); }
.p-tag { font-family: var(--xl-mono); font-size: 10.5px; padding: 1px 7px; border: 1px solid var(--xl-line); color: var(--xl-dim); }
.p-views { font-family: var(--xl-mono); font-size: 10.5px; letter-spacing: 0.06em; color: var(--xl-faint); margin-left: auto; }

.create-form { padding: 16px; display: flex; flex-direction: column; gap: 10px; }

@media (prefers-reduced-motion: reduce) {
  .glitch::before, .glitch::after, .ticker-track, .cursor, .stat.live .dot { animation: none; }
}
</style>
