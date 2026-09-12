<template>
  <!-- 项目广场·详情：溯源行（营期项目带营期名/周期）+ 简介/详情 + 资料区 + 成员 + 收藏
       + 讨论区（discussion scope=project）+ 管理操作（创建人/发布人/admin：编辑/上下架）。 -->
  <div :class="['square-view', 'dew-page-background', isDarkMode ? 'theme-dark' : 'theme-light']">
    <div style="height: 60px;"></div>
    <MenuComponent />
    <div class="detail-wrap">
      <button type="button" class="back" @click="router.push('/projects')">
        <el-icon><ArrowLeft /></el-icon><span>项目广场</span>
      </button>

      <div v-if="loading" class="d-loading"><DewSkeleton variant="rect" width="100%" height="240" rounded="12px" /></div>
      <DewCard v-else-if="!p" variant="flat" class="empty-card">
        <div class="empty-text">项目不存在或已下架</div>
      </DewCard>

      <template v-else>
        <!-- 头部 -->
        <header class="d-hero">
          <div class="d-title-row">
            <h1 class="d-title">{{ p.title }}</h1>
            <span :class="['src-badge', `src-${p.source}`]">{{ p.source_text }}</span>
            <span :class="['p-status', `ps-${p.project_status}`]">{{ p.project_status_text }}</span>
            <span v-if="p.status === 'hidden'" class="hidden-mark">已下架</span>
          </div>
          <div class="d-meta">
            <span v-if="p.camp_name" class="d-camp">来自营期「{{ p.camp_name }}」<template v-if="p.camp_cycle"> · {{ p.camp_cycle }}</template></span>
            <span class="dot">·</span>
            <span>{{ p.owner_name }}</span>
            <span class="dot">·</span>
            <span>{{ p.view_count }} 浏览</span>
            <span class="dot">·</span>
            <span>{{ (p.created_at || '').slice(0, 10) }}</span>
          </div>
          <div class="d-actions">
            <DewButton :type="p.favorited ? 'glass' : 'ghost'" size="sm" @click="toggleFav">
              {{ p.favorited ? '已收藏' : '收藏' }}
            </DewButton>
            <template v-if="p.can_manage">
              <DewButton type="ghost" size="sm" @click="openEdit">编辑</DewButton>
              <DewButton type="ghost" size="sm" @click="toggleStatus">
                {{ p.status === 'visible' ? '下架' : '恢复上架' }}
              </DewButton>
            </template>
          </div>
        </header>

        <!-- 正文两栏：主内容 + 侧栏 -->
        <div class="d-layout">
          <div class="d-main">
            <DewCard variant="flat" class="sec-card">
              <div class="sec-label">简介</div>
              <p class="sec-text">{{ p.summary || '—' }}</p>
            </DewCard>
            <DewCard v-if="p.description" variant="flat" class="sec-card">
              <div class="sec-label">详细介绍</div>
              <p class="sec-text pre">{{ p.description }}</p>
            </DewCard>

            <!-- 讨论区（discussion scope=project；MVP=平铺帖列表+发帖框） -->
            <DewCard variant="flat" class="sec-card">
              <div class="sec-label">讨论区（{{ threads.length }}）</div>
              <div v-if="!threads.length" class="sec-empty">还没有讨论，抢沙发</div>
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
                <DewInput v-model="threadForm.title" placeholder="标题（至少 4 字）" />
                <DewInput v-model="threadForm.content" type="textarea" :rows="2" placeholder="说点什么（至少 10 字）" />
                <DewButton type="glass" size="sm" :loading="posting"
                           :disabled="threadForm.title.trim().length < 4 || threadForm.content.trim().length < 10"
                           @click="postThread">发一条</DewButton>
              </div>
            </DewCard>
          </div>

          <!-- 侧栏：资料区 + 成员 -->
          <aside class="d-aside">
            <DewCard v-if="p.links?.length" variant="flat" class="sec-card">
              <div class="sec-label">资料区</div>
              <a v-for="(l, i) in p.links" :key="i" :href="l.url" target="_blank" rel="noopener" class="link-item">
                {{ l.label || l.url }}
              </a>
            </DewCard>
            <DewCard v-if="p.members?.length" variant="flat" class="sec-card">
              <div class="sec-label">项目成员</div>
              <div class="member-wrap">
                <span v-for="(m, i) in p.members" :key="i" class="member-chip">{{ m }}</span>
              </div>
            </DewCard>
            <DewCard v-if="p.tags?.length" variant="flat" class="sec-card">
              <div class="sec-label">标签</div>
              <div class="member-wrap">
                <span v-for="t in p.tags" :key="t" class="tag-chip">{{ t }}</span>
              </div>
            </DewCard>
          </aside>
        </div>

        <!-- 编辑弹窗（覆盖字段：camp 条目编辑不回写营期） -->
        <DewDialog v-model="editDlg" title="编辑项目" width="560px">
          <div class="edit-form">
            <div class="field-label">名称</div>
            <DewInput v-model="editForm.title" size="lg" />
            <div class="field-label">一句话简介</div>
            <DewInput v-model="editForm.summary" type="textarea" :rows="2" />
            <div class="field-label">详细介绍</div>
            <DewInput v-model="editForm.description" type="textarea" :rows="4" />
            <div v-if="p.source === 'community'" class="field-label">状态</div>
            <div v-if="p.source === 'community'" class="chip-row">
              <button v-for="s in STATUS_OPTS" :key="s.value" type="button"
                      :class="['f-chip', { on: editForm.project_status === s.value }]"
                      @click="editForm.project_status = s.value">{{ s.label }}</button>
            </div>
            <div class="form-actions">
              <DewButton type="ghost" @click="editDlg = false">取消</DewButton>
              <DewButton type="glass" :loading="savingEdit" :disabled="!editForm.title.trim()" @click="saveEdit">保存</DewButton>
            </div>
          </div>
        </DewDialog>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import MenuComponent from '../components/MenuComponent.vue';
import { DewButton, DewCard, DewDialog, DewInput, DewSkeleton } from '@bme/dew-ui';
import api from '../api';
import { showcaseService } from '../services/showcaseService';

const store = useStore();
const route = useRoute();
const router = useRouter();
const isDarkMode = computed(() => store.getters.isDarkMode);

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

async function toggleStatus() {
  const next = p.value.status === 'visible' ? 'hidden' : 'visible';
  try {
    if (next === 'hidden') {
      await ElMessageBox.confirm('下架后其他用户将看不到这个项目（可恢复）', '下架项目', {
        confirmButtonText: '下架', cancelButtonText: '取消', type: 'warning',
      });
    }
    const r = await showcaseService.setProjectStatus(p.value.id, next);
    ElMessage.success(r.message || '已处理');
    p.value = { ...p.value, status: next };
  } catch (e) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
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
.square-view { min-height: 100vh; }
.detail-wrap { max-width: 1080px; margin: 0 auto; padding: 24px 20px 48px; }
.back {
  display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent;
  padding: 0; margin-bottom: 14px; cursor: pointer; font-size: 12.5px; color: var(--dew-text-muted);
  transition: color 0.2s ease;
}
.back:hover { color: var(--color-primary); }
.d-loading { padding: 4px 0; }
.empty-card { padding: 48px 0; }
.empty-text { font-size: 13px; color: var(--dew-text-faint); text-align: center; }

.d-hero { margin-bottom: 18px; }
.d-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.d-title { font-size: 25px; font-weight: 700; color: var(--dew-text-heading); margin: 0; letter-spacing: 0.5px; }
.src-badge { font-size: 11.5px; padding: 2px 12px; border-radius: 999px; font-weight: 600;
  color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent); }
.src-camp { color: var(--color-success); background: color-mix(in srgb, var(--color-success) 12%, transparent);
  border-color: color-mix(in srgb, var(--color-success) 30%, transparent); }
.p-status { font-size: 12.5px; font-weight: 600; }
.ps-idea { color: var(--dew-text-faint); }
.ps-ongoing { color: var(--color-primary); }
.ps-done { color: var(--color-success); }
.hidden-mark { font-size: 12px; color: var(--color-warning); font-weight: 600; }
.d-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12.5px; color: var(--dew-text-muted); margin-top: 8px; }
.d-meta .dot { color: var(--dew-text-faint); }
.d-camp { color: var(--color-success); font-weight: 600; }
.d-actions { display: flex; gap: 8px; margin-top: 12px; }

.d-layout { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; }
@media (max-width: 900px) { .d-layout { grid-template-columns: 1fr; } }
.d-main, .d-aside { display: flex; flex-direction: column; gap: 14px; }

.sec-card { display: flex; flex-direction: column; gap: 10px; }
.sec-label { font-size: 13px; font-weight: 650; color: var(--dew-text-heading); }
.sec-text { font-size: 13.5px; color: var(--dew-text-muted); line-height: 1.8; margin: 0; }
.sec-text.pre { white-space: pre-wrap; }
.sec-empty { font-size: 12.5px; color: var(--dew-text-faint); }

.link-item { font-size: 13px; color: var(--color-primary); text-decoration: none; word-break: break-all; }
.link-item:hover { text-decoration: underline; }
.member-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
.member-chip { font-size: 12px; padding: 2px 10px; border-radius: 999px;
  background: color-mix(in srgb, var(--dew-text-muted) 8%, transparent); color: var(--dew-text-muted); }
.tag-chip { font-size: 11.5px; padding: 1px 9px; border-radius: 999px;
  border: 1px solid var(--dew-card-border); color: var(--dew-text-muted); }

.thread-list { display: flex; flex-direction: column; gap: 10px; }
.thread-item { border-top: 1px solid var(--dew-card-border); padding-top: 10px; display: flex; flex-direction: column; gap: 4px; }
.thread-item:first-child { border-top: none; padding-top: 0; }
.thread-head { display: flex; align-items: center; justify-content: space-between; }
.thread-author { font-size: 12.5px; font-weight: 600; color: var(--dew-text-heading); }
.thread-time { font-size: 11.5px; color: var(--dew-text-faint); }
.thread-title { font-size: 13.5px; font-weight: 600; color: var(--dew-text-heading); }
.thread-content { font-size: 13px; color: var(--dew-text-muted); line-height: 1.7; margin: 0; white-space: pre-wrap; }
.thread-form { display: flex; flex-direction: column; gap: 8px; margin-top: 6px;
  border-top: 1px solid var(--dew-card-border); padding-top: 12px; }

.edit-form { display: flex; flex-direction: column; gap: 10px; }
.field-label { font-size: 13px; font-weight: 600; color: var(--dew-text-heading); }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.f-chip { border: 1px solid var(--dew-card-border); border-radius: 999px; background: transparent;
  padding: 4px 14px; font-size: 12.5px; color: var(--dew-text-muted); cursor: pointer; }
.f-chip.on { color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent); font-weight: 600; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
</style>
