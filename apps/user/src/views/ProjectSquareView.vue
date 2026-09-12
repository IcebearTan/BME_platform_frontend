<template>
  <!-- 项目广场（功能扩展轮 §五 MVP）：全站项目展示/交流/数字资产板块。
       双来源=营期项目发布投影 + 用户自由分享；DewUI 框架级 MVP，视觉升格后置。 -->
  <div :class="['square-view', 'dew-page-background', isDarkMode ? 'theme-dark' : 'theme-light']">
    <div style="height: 60px;"></div>
    <MenuComponent />
    <div class="square-wrap">
      <!-- 页头：标题 + 搜索 + 分享入口 -->
      <header class="square-hero">
        <div class="hero-left">
          <h1 class="hero-title">项目广场</h1>
          <p class="hero-sub">同学们正在做与已经做完的项目——营期项目与自由分享都在这里</p>
        </div>
        <div class="hero-right">
          <DewInput v-model="keyword" size="lg" placeholder="搜索项目名/简介" :prefix-icon="Search"
                    style="width: 240px;" @keyup.enter="load" />
          <DewButton type="glass" size="lg" @click="openCreate">分享我的项目</DewButton>
        </div>
      </header>

      <!-- 筛选条：来源 + 状态 + 标签 -->
      <div class="filter-bar">
        <div class="chip-row">
          <button v-for="f in sourceFilters" :key="f.value" type="button"
                  :class="['f-chip', { on: filters.source === f.value }]" @click="setFilter('source', f.value)">
            {{ f.label }}
          </button>
        </div>
        <div class="chip-row">
          <button v-for="f in statusFilters" :key="f.value" type="button"
                  :class="['f-chip', { on: filters.project_status === f.value }]" @click="setFilter('project_status', f.value)">
            {{ f.label }}
          </button>
        </div>
        <div v-if="allTags.length" class="chip-row">
          <button type="button" :class="['f-chip', { on: !filters.tag }]" @click="setFilter('tag', null)">全部标签</button>
          <button v-for="t in allTags" :key="t" type="button"
                  :class="['f-chip tag', { on: filters.tag === t }]" @click="setFilter('tag', t)">{{ t }}</button>
        </div>
      </div>

      <!-- 卡片网格 -->
      <div v-if="loading" class="grid-loading">
        <DewSkeleton v-for="i in 4" :key="i" variant="rect" width="100%" height="180" rounded="12px" />
      </div>
      <DewCard v-else-if="!projects.length" variant="flat" class="empty-card">
        <div class="empty-title">还没有项目</div>
        <div class="empty-hint">点右上「分享我的项目」发第一个；营期项目由负责人在营期工作台发布。</div>
      </DewCard>
      <div v-else class="project-grid">
        <DewCard v-for="p in projects" :key="p.id" variant="default" class="p-card"
                 @click="goDetail(p.id)">
          <!-- 封面兜底色块（MVP 无上传，用标题首字） -->
          <div :class="['p-cover', `cover-${p.source}`]">
            <span class="cover-char">{{ p.title.charAt(0) }}</span>
            <span :class="['src-badge', `src-${p.source}`]">{{ p.source_text }}</span>
            <span v-if="p.status === 'hidden'" class="hidden-badge">已下架</span>
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
              <span class="p-views">{{ p.view_count }} 浏览</span>
            </div>
          </div>
        </DewCard>
      </div>

      <!-- 分享我的项目（community 免审上架） -->
      <DewDialog v-model="dlg" title="分享我的项目" width="560px">
        <div class="create-form">
          <div class="field-label">项目名称 <span class="field-req">必填</span></div>
          <DewInput v-model="form.title" size="lg" placeholder="如：宿舍智能门锁" />
          <div class="field-label">一句话简介</div>
          <DewInput v-model="form.summary" type="textarea" :rows="2" placeholder="列表页展示（300 字内）" />
          <div class="field-label">详细介绍</div>
          <DewInput v-model="form.description" type="textarea" :rows="4" placeholder="做了什么、怎么做的、给谁用" />
          <div class="field-label">状态</div>
          <div class="chip-row">
            <button v-for="s in statusFilters.filter((x) => x.value)" :key="s.value" type="button"
                    :class="['f-chip', { on: form.project_status === s.value }]"
                    @click="form.project_status = s.value">{{ s.label }}</button>
          </div>
          <div class="field-label">标签（逗号分隔，最多 6 个）</div>
          <DewInput v-model="form.tagsText" placeholder="硬件, 物联网" />
          <div class="field-label">成员（可选公开，逗号分隔）</div>
          <DewInput v-model="form.membersText" placeholder="展示项目成员昵称" />
          <div class="field-label">资料链接（每行一条：名称 空格 链接，最多 10 条）</div>
          <DewInput v-model="form.linksText" type="textarea" :rows="2" placeholder="开源仓库 https://github.com/..." />
          <div class="form-note">自由分享免审上架；管理员可下架违规内容。营期项目请由负责人在营期工作台发布。</div>
          <div class="form-actions">
            <DewButton type="ghost" @click="dlg = false">取消</DewButton>
            <DewButton type="glass" :loading="saving" :disabled="!form.title.trim()" @click="save">发布</DewButton>
          </div>
        </div>
      </DewDialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import MenuComponent from '../components/MenuComponent.vue';
import { DewButton, DewCard, DewDialog, DewInput, DewSkeleton } from '@bme/dew-ui';
import { showcaseService } from '../services/showcaseService';

const store = useStore();
const router = useRouter();
const isDarkMode = computed(() => store.getters.isDarkMode);

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
.square-view { min-height: 100vh; }
.square-wrap { max-width: 1280px; margin: 0 auto; padding: 24px 20px 48px; }

.square-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.hero-title { font-size: 26px; font-weight: 700; color: var(--dew-text-heading); margin: 0 0 6px; letter-spacing: 0.5px; }
.hero-sub { font-size: 13px; color: var(--dew-text-muted); margin: 0; }
.hero-right { display: flex; align-items: center; gap: 10px; }

.filter-bar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.f-chip {
  border: 1px solid var(--dew-card-border); border-radius: 999px; background: transparent;
  padding: 4px 14px; font-size: 12.5px; color: var(--dew-text-muted); cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.f-chip:hover { border-color: var(--dew-text-faint); }
.f-chip.on {
  color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent); font-weight: 600;
}

.grid-loading { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.empty-card { padding: 48px 0; }
.empty-title { font-size: 15px; font-weight: 600; color: var(--dew-text-heading); text-align: center; margin-bottom: 6px; }
.empty-hint { font-size: 12.5px; color: var(--dew-text-faint); text-align: center; }

.project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.p-card { cursor: pointer; padding: 0 !important; overflow: hidden; transition: transform 0.2s var(--dew-bounce, ease); }
.p-card:hover { transform: translateY(-3px); }
.p-cover {
  height: 110px; position: relative; display: flex; align-items: center; justify-content: center;
  background:
    radial-gradient(120% 140% at 20% 0%, color-mix(in srgb, var(--color-primary) 16%, transparent) 0%, transparent 55%),
    color-mix(in srgb, var(--dew-text-muted) 10%, transparent);
}
.cover-camp { background:
  radial-gradient(120% 140% at 20% 0%, color-mix(in srgb, var(--color-success) 18%, transparent) 0%, transparent 55%),
  color-mix(in srgb, var(--dew-text-muted) 10%, transparent); }
.cover-char { font-size: 40px; font-weight: 800; color: color-mix(in srgb, var(--dew-text-heading) 55%, transparent); }
.src-badge {
  position: absolute; top: 10px; left: 12px;
  font-size: 11px; padding: 2px 10px; border-radius: 999px;
  color: var(--color-primary); font-weight: 600;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
}
.src-camp { color: var(--color-success); background: color-mix(in srgb, var(--color-success) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-success) 30%, transparent); }
.hidden-badge {
  position: absolute; top: 10px; right: 12px;
  font-size: 11px; padding: 2px 10px; border-radius: 999px;
  color: var(--color-warning); background: color-mix(in srgb, var(--color-warning) 12%, transparent);
}
.p-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 8px; }
.p-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.p-title { font-size: 15.5px; font-weight: 650; color: var(--dew-text-heading);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p-status { font-size: 11.5px; font-weight: 600; flex-shrink: 0; }
.ps-idea { color: var(--dew-text-faint); }
.ps-ongoing { color: var(--color-primary); }
.ps-done { color: var(--color-success); }
.p-summary { font-size: 12.5px; color: var(--dew-text-muted); line-height: 1.6; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.p-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: auto; }
.p-camp { font-size: 11.5px; color: var(--color-success); font-weight: 600; }
.p-tag { font-size: 11px; padding: 1px 8px; border-radius: 999px;
  border: 1px solid var(--dew-card-border); color: var(--dew-text-muted); }
.p-views { font-size: 11px; color: var(--dew-text-faint); margin-left: auto; }

.create-form { display: flex; flex-direction: column; gap: 10px; }
.field-label { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); }
.field-req { font-size: 11px; font-weight: 400; color: var(--color-warning); margin-left: 4px; }
.form-note { font-size: 12px; color: var(--dew-text-faint); line-height: 1.6; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
</style>
