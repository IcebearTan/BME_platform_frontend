<template>
  <!-- XLab·详情（原项目广场·详情）：溯源行（营期项目带营期名/周期）+ 简介/详情 + 资料区 + 成员 + 收藏
       + 讨论区（discussion scope=project）+ 管理操作（创建人/发布人/admin：编辑/上下架）。
       视觉沿用 XLab 主题，共享 tokens 见 ../styles/xlab.css。 -->
  <div class="xlab-root">
    <div style="height: 60px;"></div>
    <MenuComponent />
    <div class="detail-wrap">
      <button type="button" class="back" @click="router.push('/projects')">
        <el-icon><ArrowLeft /></el-icon><span>XLAB // INDEX</span>
      </button>

      <div v-if="loading" class="d-loading"><div class="xl-skel d-skel"></div></div>
      <div v-else-if="!p" class="xl-empty">
        <div class="xl-empty-code">// SIGNAL_LOST</div>
        <div class="xl-empty-hint">项目不存在或已下架</div>
      </div>

      <template v-else>
        <!-- 头部（09-16v2 档案层语法：黑顶条+白体+黑 hairline 页脚条；徽标独立成行，按钮沉底条） -->
        <header class="d-hero">
          <div class="d-hero-body">
            <div class="d-hero-main">
              <div class="d-eyebrow">// PROJECT_FILE</div>
              <h1 class="d-title">{{ p.title }}</h1>
              <div class="d-chips">
                <span :class="['hero-chip', p.source === 'camp' ? 'hc-solid' : 'hc-outline']">{{ p.source_text }}</span>
                <span :class="['st-line', `st-${p.project_status}`]"><i class="st-dot"></i>{{ p.project_status_text }}</span>
                <span v-if="p.status === 'hidden'" class="hero-chip hidden-tag">已下架</span>
              </div>
            </div>
            <div class="d-file-no" aria-hidden="true">#{{ String(p.id).padStart(4, '0') }}</div>
          </div>
          <div class="d-hero-foot">
            <div class="d-meta">
              <span v-if="p.camp_name" class="d-camp">来自营期「{{ p.camp_name }}」<template v-if="p.camp_cycle"> · {{ p.camp_cycle }}</template></span>
              <span v-if="p.camp_name" class="m-sep">//</span>
              <span>{{ p.view_count }} VIEWS</span>
              <span class="m-sep">//</span>
              <span>{{ p.favorite_count || 0 }} FAVS</span>
              <span class="m-sep">//</span>
              <span>{{ (p.created_at || '').slice(0, 10) }}</span>
              <template v-if="p.updated_at && p.updated_at.slice(0, 10) !== (p.created_at || '').slice(0, 10)">
                <span class="m-sep">//</span>
                <span>UPDATED {{ p.updated_at.slice(0, 10) }}</span>
              </template>
            </div>
            <div class="d-actions">
              <button type="button" :class="['xl-btn', 'sm', 'ghost', 'fav-btn', { 'is-faved': p.favorited }]" @click="toggleFav">
                <span v-if="p.favorited" class="fav-dot"></span>{{ p.favorited ? '已收藏' : '收藏' }}
              </button>
              <template v-if="p.can_manage">
                <button type="button" class="xl-btn sm ghost" @click="openEdit">编辑</button>
                <button type="button" :class="['xl-btn', 'sm', 'ghost', p.status === 'visible' ? 'danger' : '']" @click="toggleStatus">
                  {{ p.status === 'visible' ? '下架' : '恢复上架' }}
                </button>
              </template>
            </div>
          </div>
        </header>

        <!-- 正文两栏：主内容 + 侧栏 -->
        <div class="d-layout">
          <div class="d-main">
            <section class="sec-card">
              <div class="xl-sec-label">// SYNOPSIS — 简介</div>
              <p class="sec-text">{{ p.summary || '—' }}</p>
            </section>
            <section v-if="p.description" class="sec-card">
              <div class="xl-sec-label">// DETAILS — 详细介绍</div>
              <p class="sec-text pre">{{ p.description }}</p>
            </section>

            <!-- 讨论区（discussion scope=project；MVP=平铺帖列表+发帖框） -->
            <section class="sec-card">
              <div class="xl-sec-label">// DISCUSSION — 讨论区（{{ threads.length }}）</div>
              <div v-if="!threads.length" class="sec-empty">// NO_SIGNAL — 还没有讨论，抢沙发</div>
              <div v-else class="thread-list">
                <div v-for="t in threads" :key="t.id" class="thread-item">
                  <div class="thread-head">
                    <span class="thread-author">{{ t.author_name || `#${t.author_id}` }}</span>
                    <span class="thread-time">{{ (t.created_at || '').slice(0, 16).replace('T', ' ') }}</span>
                  </div>
                  <div class="thread-title">{{ t.title }}</div>
                  <p class="thread-content">{{ t.content }}</p>
                </div>
              </div>
              <div class="thread-form">
                <input v-model="threadForm.title" class="xl-input" placeholder="标题（至少 4 字）" />
                <textarea v-model="threadForm.content" class="xl-input" rows="2" placeholder="说点什么（至少 10 字）"></textarea>
                <div class="xl-actions">
                  <button type="button" class="xl-btn sm primary"
                          :disabled="posting || threadForm.title.trim().length < 4 || threadForm.content.trim().length < 10"
                          @click="postThread">{{ posting ? 'TRANSMITTING…' : '发一条' }}</button>
                </div>
              </div>
            </section>
          </div>

          <!-- 侧栏：创建者卡（白·档案层）+ 档案合一卡（资料/成员/标签，09-16v2 合并空壳卡） -->
          <aside class="d-aside">
            <section class="sec-card creator-card">
              <div class="xl-sec-label">// CREATOR — 创建者</div>
              <div class="creator-row">
                <div class="creator-avatar">{{ (p.owner_name || '?')[0] }}</div>
                <div class="creator-info">
                  <div class="creator-name">{{ p.owner_name || '—' }}</div>
                  <div class="creator-sub">{{ p.source_text }}发布</div>
                </div>
              </div>
            </section>
            <section v-if="p.links?.length || p.members?.length || p.tags?.length" class="sec-card">
              <div class="xl-sec-label">// INDEX — 档案</div>
              <div v-if="p.links?.length" class="idx-group">
                <div class="idx-key">ASSETS · 资料</div>
                <a v-for="(l, i) in p.links" :key="i" :href="l.url" target="_blank" rel="noopener" class="link-item">
                  {{ l.label || l.url }}
                </a>
              </div>
              <div v-if="p.members?.length" class="idx-group">
                <div class="idx-key">CREW · 成员</div>
                <div class="chip-wrap">
                  <span v-for="(m, i) in p.members" :key="i" class="member-chip">{{ m }}</span>
                </div>
              </div>
              <div v-if="p.tags?.length" class="idx-group">
                <div class="idx-key">TAGS · 标签</div>
                <div class="chip-wrap">
                  <span v-for="t in p.tags" :key="t" class="member-chip">{{ t }}</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <!-- 编辑弹窗（覆盖字段：camp 条目编辑不回写营期） -->
        <Teleport to="body">
          <div v-if="editDlg" class="xdlg-overlay" @click.self="editDlg = false">
            <div class="xlab-dialog">
              <div class="xdlg-head">
                <span class="xdlg-title">// EDIT_FILE — 编辑项目</span>
                <button type="button" class="xdlg-close" @click="editDlg = false"><el-icon><Close /></el-icon></button>
              </div>
              <div class="edit-form">
                <div class="xl-field"><span class="xl-no">01</span>名称<em class="xl-req">*REQ</em></div>
                <input v-model="editForm.title" class="xl-input" />
                <div class="xl-field"><span class="xl-no">02</span>一句话简介</div>
                <textarea v-model="editForm.summary" class="xl-input" rows="2"></textarea>
                <div class="xl-field"><span class="xl-no">03</span>详细介绍</div>
                <textarea v-model="editForm.description" class="xl-input" rows="4"></textarea>
                <template v-if="p.source === 'community'">
                  <div class="xl-field"><span class="xl-no">04</span>状态</div>
                  <div class="xl-chip-row">
                    <button v-for="s in STATUS_OPTS" :key="s.value" type="button"
                            :class="['xl-chip', { on: editForm.project_status === s.value }]"
                            @click="editForm.project_status = s.value">{{ s.label }}</button>
                  </div>
                </template>
                <div v-if="p.source === 'camp'" class="xl-note">营期项目的条目编辑不回写营期工作台。</div>
                <div class="xl-actions">
                  <button type="button" class="xl-btn ghost" @click="editDlg = false">取消</button>
                  <button type="button" class="xl-btn primary" :disabled="!editForm.title.trim() || savingEdit" @click="saveEdit">
                    {{ savingEdit ? 'TRANSMITTING…' : '保存' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- 下架确认（09-16：XLab 白色确认弹层，替代裸 ELP MessageBox） -->
        <Teleport to="body">
          <div v-if="confirmDlg" class="xdlg-overlay" @click.self="confirmDlg = false">
            <div class="xlab-dialog xdlg-narrow">
              <div class="xdlg-head">
                <span class="xdlg-title">// CONFIRM — 下架项目</span>
                <button type="button" class="xdlg-close" @click="confirmDlg = false"><el-icon><Close /></el-icon></button>
              </div>
              <div class="confirm-body">
                <p class="confirm-text">下架后其他用户将看不到「{{ p.title }}」，可随时恢复上架。</p>
                <div class="xl-actions">
                  <button type="button" class="xl-btn ghost" @click="confirmDlg = false">取消</button>
                  <button type="button" class="xl-btn pink" :disabled="statusBusy" @click="applyStatus('hidden')">
                    {{ statusBusy ? 'TRANSMITTING…' : '确认下架' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Teleport>
      </template>
    </div>

    <footer class="xlab-foot">
      <div class="xlab-foot-inner">
        <span>XLAB // BME_PLATFORM</span>
        <span>EXPERIMENT · DOCUMENT · SHIP</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Close } from '@element-plus/icons-vue';
import MenuComponent from '../components/MenuComponent.vue';
import api from '../api';
import { showcaseService } from '../services/showcaseService';
import '../styles/xlab.css';

const route = useRoute();
const router = useRouter();

const STATUS_OPTS = [
  { label: '构思中', value: 'idea' }, { label: '进行中', value: 'ongoing' }, { label: '已完成', value: 'done' },
];

const loading = ref(true);
const p = ref(null);
const threads = ref([]);
const threadForm = ref({ title: '', content: '' });
const posting = ref(false);

async function load() {
  loading.value = true;
  try {
    const d = await showcaseService.fetchProject(route.params.id);
    p.value = d.project;
    loadThreads();
  } catch (e) {
    if (e.response?.status !== 404) ElMessage.error(e.response?.data?.message || '加载失败');
    p.value = null;
  } finally {
    loading.value = false;
  }
}
async function loadThreads() {
  try {
    const r = await api.get('/discussions/threads', {
      params: { scope_type: 'project', scope_id: p.value.id, per_page: 50 },
    });
    const data = r.data?.data ?? r.data?.threads ?? [];
    threads.value = Array.isArray(data) ? data : [];
  } catch { /* 讨论区静默空态 */ }
}
onMounted(load);

async function postThread() {
  if (posting.value) return;
  posting.value = true;
  try {
    await api.post('/discussions/threads', {
      title: threadForm.value.title.trim(), content: threadForm.value.content.trim(),
      scope_type: 'project', scope_id: p.value.id,
    });
    ElMessage.success('已发布');
    threadForm.value = { title: '', content: '' };
    loadThreads();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发布失败');
  } finally {
    posting.value = false;
  }
}

async function toggleFav() {
  try {
    const r = await showcaseService.favorite(p.value.id, !p.value.favorited);
    p.value = { ...p.value, favorited: r.favorited };
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

// ── 上下架：下架走 XLab 白色确认弹层（confirmDlg），恢复上架直接执行 ──
const confirmDlg = ref(false);
const statusBusy = ref(false);

async function applyStatus(next) {
  if (statusBusy.value) return;
  statusBusy.value = true;
  try {
    const r = await showcaseService.setProjectStatus(p.value.id, next);
    ElMessage.success(r.message || '已处理');
    p.value = { ...p.value, status: next };
    confirmDlg.value = false;
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  } finally {
    statusBusy.value = false;
  }
}

function toggleStatus() {
  const next = p.value.status === 'visible' ? 'hidden' : 'visible';
  if (next === 'hidden') {
    confirmDlg.value = true;
    return;
  }
  applyStatus(next);
}

// ── 编辑 ──
const editDlg = ref(false);
const savingEdit = ref(false);
const editForm = ref({ title: '', summary: '', description: '', project_status: 'ongoing' });
function openEdit() {
  editForm.value = {
    title: p.value.title, summary: p.value.summary || '',
    description: p.value.description || '', project_status: p.value.project_status,
  };
  editDlg.value = true;
}
async function saveEdit() {
  if (savingEdit.value || !editForm.value.title.trim()) return;
  savingEdit.value = true;
  try {
    const body = {
      title: editForm.value.title.trim(),
      summary: editForm.value.summary.trim() || null,
      description: editForm.value.description.trim() || null,
    };
    if (p.value.source === 'community') body.project_status = editForm.value.project_status;
    const r = await showcaseService.updateProject(p.value.id, body);
    ElMessage.success(r.message || '已保存');
    editDlg.value = false;
    p.value = { ...p.value, ...r.project };
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    savingEdit.value = false;
  }
}
</script>

<style scoped>
/* XLab 详情页专属布局；共享 tokens/按钮/输入/chips/弹层/徽标见 ../styles/xlab.css */
.detail-wrap { max-width: 1080px; margin: 0 auto; padding: 24px 20px 48px; }
.back {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid transparent; background: transparent; padding: 6px 10px 6px 6px;
  margin-bottom: 14px; cursor: pointer;
  font-family: var(--xl-mono); font-size: 12px; letter-spacing: 0.08em; color: var(--xl-dim);
  transition: color 0.15s, border-color 0.15s;
}
.back:hover { color: #fff; border-color: var(--xl-line-strong); }
.d-skel { height: 360px; }

/* 09-16v2 档案层语法：白=档案层（黑顶条 4px + 白体 + 黑 hairline 页脚条），
   hero 与创建者卡同构；黑卡统一提亮拉层次。绿粉只留语义身份的小面积使用。 */
.d-hero { margin-bottom: 18px; background: #fff; color: #111; border-top: 4px solid #111; }
.d-hero-body {
  padding: 20px 22px 20px;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 18px;
}
.d-hero-main { min-width: 0; }
.d-eyebrow { font-family: var(--xl-mono); font-size: 12.5px; letter-spacing: 0.12em; color: #8a8a8a; }
.d-title { font-size: 30px; font-weight: 800; color: #111; margin: 10px 0 10px; letter-spacing: 0.5px; line-height: 1.15; }
/* 右侧档案编号大字（浅灰实心水印，填充 hero 右留白、强化档案感） */
.d-file-no {
  font-family: var(--xl-mono); font-size: 64px; font-weight: 800; line-height: 1;
  color: #dedede; user-select: none;
  letter-spacing: 0.04em; flex-shrink: 0; margin-top: 8px;
}
/* 徽标独立成行：来源=黑白 chips（身份），状态=弱化文字+色点（不与操作色打架） */
.d-chips { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 4px; }
.hero-chip {
  font-family: var(--xl-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
  height: 24px; display: inline-flex; align-items: center; padding: 0 12px;
}
.hc-solid { background: #111; color: #fff; }
.hc-outline { border: 1px solid #111; color: #111; }
.st-line { font-family: var(--xl-mono); font-size: 11.5px; letter-spacing: 0.08em; color: #888; display: inline-flex; align-items: center; gap: 8px; height: 24px; }
.st-dot { width: 8px; height: 8px; display: inline-block; }
.st-ongoing .st-dot { background: #00915d; }
.st-done .st-dot { background: #e2137f; }
.st-idea .st-dot { background: #999; }
.hidden-tag { border: 1px solid #e2137f; color: #e2137f; }
/* 页脚条：meta 与按钮同条内居中对齐——按钮不再悬空 */
.d-hero-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
  border-top: 1px solid #111; padding: 15px 22px;
}
.d-meta {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  font-family: var(--xl-mono); font-size: 11.5px; letter-spacing: 0.05em; color: #555;
}
.m-sep { color: #b3b3b3; }
.d-camp { color: #111; font-weight: 700; }
.d-actions { display: flex; gap: 10px; }
.d-hero .xl-btn { display: inline-flex; align-items: center; }
.d-hero .xl-btn.ghost { color: #111; border-color: #111; }
.d-hero .xl-btn.ghost:hover { background: #111; color: #fff; }
.d-hero .xl-btn.danger { color: #e2137f; border-color: #e2137f; }
.d-hero .xl-btn.danger:hover { background: #e2137f; color: #fff; }
.fav-dot { width: 7px; height: 7px; background: #e2137f; display: inline-block; margin-right: 7px; }

.d-layout { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; }
@media (max-width: 900px) { .d-layout { grid-template-columns: 1fr; } }
@media (max-width: 640px) {
  .d-file-no { font-size: 40px; -webkit-text-stroke-width: 1px; }
  .d-title { font-size: 24px; }
}
.d-main, .d-aside { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.sec-card {
  background: #101010; border: 1px solid rgba(255, 255, 255, 0.14);
  border-top: 3px solid rgba(255, 255, 255, 0.5);
  padding: 15px 18px 17px; display: flex; flex-direction: column; gap: 10px;
}
.sec-text { font-size: 13.5px; color: var(--xl-dim); line-height: 1.8; margin: 0; }
.sec-text.pre { white-space: pre-wrap; }
.sec-empty { font-family: var(--xl-mono); font-size: 12px; letter-spacing: 0.06em; color: var(--xl-faint); }

.link-item { font-family: var(--xl-mono); font-size: 12px; letter-spacing: 0.04em; color: #fff; text-decoration: none; word-break: break-all; }
.link-item::before { content: '>> '; color: var(--xl-faint); }
.link-item:hover { text-decoration: underline; }
.chip-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
.member-chip { font-family: var(--xl-mono); font-size: 11px; padding: 2px 8px; border: 1px solid var(--xl-line); color: var(--xl-dim); }

.thread-list { display: flex; flex-direction: column; gap: 10px; }
.thread-item { border-top: 1px solid var(--xl-line); padding-top: 10px; display: flex; flex-direction: column; gap: 4px; }
.thread-item:first-child { border-top: none; padding-top: 0; }
.thread-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.thread-author { font-size: 12.5px; font-weight: 600; color: #fff; }
.thread-time { font-family: var(--xl-mono); font-size: 10.5px; color: var(--xl-faint); }
.thread-title { font-size: 13.5px; font-weight: 600; color: #fff; }
.thread-content { font-size: 13px; color: var(--xl-dim); line-height: 1.7; margin: 0; white-space: pre-wrap; }
.thread-form { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--xl-line); padding-top: 12px; margin-top: 2px; }
.thread-form .xl-input::placeholder { color: rgba(255, 255, 255, 0.5); }

.edit-form { padding: 16px; display: flex; flex-direction: column; gap: 10px; }

/* 下架确认弹层（窄版） */
.xdlg-narrow { width: min(420px, 100%); }
.confirm-body { padding: 18px 16px 16px; display: flex; flex-direction: column; gap: 18px; }
.confirm-text { margin: 0; font-size: 13.5px; color: #333; line-height: 1.75; }

/* 创建者卡：与 hero 同构的白色档案层（黑顶条 4px），内边距对齐 sec-card 卡层级 */
.creator-card { background: #fff; border: none; border-top: 4px solid #111; padding: 15px 18px; }
.creator-card .xl-sec-label { color: #8a8a8a; }
.creator-row { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.creator-avatar {
  width: 40px; height: 40px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #111; color: #fff;
  font-family: var(--xl-mono); font-size: 19px; font-weight: 800;
}
.creator-name { font-size: 14.5px; font-weight: 700; color: #111; }
.creator-sub { font-family: var(--xl-mono); font-size: 10.5px; color: #8a8a8a; margin-top: 3px; letter-spacing: 0.06em; }

/* 档案合一卡：资料/成员/标签分组，hairline 分隔 */
.idx-group { display: flex; flex-direction: column; gap: 8px; padding-top: 10px; border-top: 1px solid var(--xl-line); }
.idx-group:first-of-type { border-top: none; padding-top: 2px; }
.idx-key { font-family: var(--xl-mono); font-size: 10.5px; letter-spacing: 0.1em; color: var(--xl-faint); }
</style>
