<template>
  <Teleport to="body">
    <div class="xl-drawer-backdrop" @click.self="emitClose">
      <aside ref="panel" class="xl-drawer" :class="{ expanded }" role="dialog" aria-modal="true" :aria-label="project?.title || '项目详情'">
        <header class="drawer-head" @touchstart.passive="dragStart" @touchend.passive="dragEnd">
          <span class="drawer-grip" aria-hidden="true"></span>
          <div><small>XLAB · 项目档案</small><b v-if="project">#{{ String(project.id).padStart(4, '0') }}</b></div>
          <button type="button" class="drawer-expand" :aria-label="expanded ? '收起详情' : '展开详情'" @click="expanded = !expanded"><el-icon><Bottom v-if="expanded" /><Top v-else /></el-icon></button>
          <button ref="closeButton" type="button" class="drawer-close" aria-label="关闭详情" @click="emitClose"><el-icon><Close /></el-icon></button>
        </header>

        <div v-if="loading" class="drawer-state">正在读取项目档案</div>
        <div v-else-if="error" class="drawer-state">{{ error }}<button type="button" @click="load">重试</button></div>
        <div v-else-if="project" class="drawer-content">
          <div class="drawer-cover">
            <DewImage v-if="project.cover" :src="assetUrl(project.cover)" alt="项目封面" />
            <div v-else class="drawer-placeholder"><span>{{ project.title?.charAt(0) }}</span></div>
            <span :class="['cover-source', `cs-${project.source}`]">{{ project.source_text }}</span>
          </div>

          <div class="drawer-body">
            <div class="title-meta"><span :class="`tm-${project.project_status}`">{{ project.project_status_text }}</span><span>{{ project.track_text || '其他' }}</span><span v-if="project.camp_name">{{ project.camp_name }}</span></div>
            <h2>{{ project.title }}</h2>
            <p class="drawer-summary">{{ project.summary || '这个项目尚未补充一句话介绍。' }}</p>
            <div class="drawer-tags"><span v-for="tag in project.tags || []" :key="tag">{{ tag }}</span></div>

            <div class="drawer-actions">
              <button type="button" class="xg-btn sm" :class="project.favorited ? 'primary' : 'soft'" :aria-label="project.favorited ? '已收藏' : '收藏'" :disabled="favoriteBusy" @click="toggleFavorite"><el-icon><StarFilled v-if="project.favorited" /><Star v-else /></el-icon>{{ project.favorited ? '已收藏' : '收藏' }}</button>
              <a v-for="link in primaryLinks" :key="link.url" class="xg-btn sm ghost" :href="link.url" target="_blank" rel="noopener noreferrer"><el-icon><Link /></el-icon>{{ link.label }}</a>
            </div>
            <div class="drawer-metrics"><span><strong>{{ project.view_count ?? 0 }}</strong> 浏览</span><span><strong>{{ project.favorite_count ?? 0 }}</strong> 收藏</span><span><strong>{{ threads.length }}</strong> 评论</span></div>

            <section class="drawer-section overview-section">
              <h3><span>01</span>项目简介</h3>
              <p>{{ project.description || project.summary || '项目团队尚未补充完整介绍。' }}</p>
              <div v-if="project.images?.length" class="drawer-gallery"><DewImage v-for="image in project.images" :key="image" :src="assetUrl(image)" alt="项目图片" /></div>
            </section>

            <section class="drawer-section">
              <h3><span>02</span>项目进度</h3>
              <div class="progress-line">
                <div v-for="(item, index) in progressSteps" :key="item.value" :class="{ active: index <= progressIndex, current: index === progressIndex }"><i></i><b>{{ item.label }}</b><small>{{ item.caption }}</small></div>
              </div>
            </section>

            <section class="drawer-section detail-grid">
              <div><h3><span>03</span>项目赛道</h3><strong>{{ project.track_text || '其他' }}</strong><p>{{ trackDescriptions[project.track] || trackDescriptions.other }}</p></div>
              <div><h3><span>04</span>项目成员</h3><div class="crew-list"><span v-for="member in crew" :key="member"><i>{{ member.charAt(0) }}</i>{{ member }}</span></div></div>
            </section>

            <section class="drawer-section">
              <h3><span>05</span>项目资料</h3>
              <div v-if="secondaryLinks.length" class="asset-list"><a v-for="link in secondaryLinks" :key="link.url" :href="link.url" target="_blank" rel="noopener noreferrer"><span>{{ link.label || '项目资料' }}</span><el-icon><TopRight /></el-icon></a></div>
              <p v-else class="drawer-muted">项目团队暂未公开其他资料。</p>
            </section>

            <section class="drawer-section discussion-section">
              <h3><span>06</span>讨论 <b>{{ threads.length }}</b></h3>
              <p v-if="threadsError" class="drawer-muted">讨论加载失败。<button type="button" @click="loadThreads">重试</button></p>
              <p v-else-if="!threads.length" class="drawer-muted">还没有讨论，留下第一条反馈。</p>
              <article v-for="thread in threads" :key="thread.id" class="drawer-thread"><div><b>{{ thread.author_name || `#${thread.author_id}` }}</b><time>{{ formatTime(thread.created_at) }}</time></div><p>{{ thread.content }}</p></article>
              <form class="drawer-comment" @submit.prevent="postComment"><span class="drawer-comment-label">发表讨论 <em>{{ comment.trim().length }}/10</em></span><DewInput v-model="comment" type="textarea" :rows="3" placeholder="至少 10 字" aria-label="发表讨论内容" /><button type="submit" class="xg-btn sm primary" :disabled="posting || comment.trim().length < 10">{{ posting ? '发送中' : '发表' }}</button></form>
            </section>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Bottom, Close, Link, Star, StarFilled, Top, TopRight } from '@element-plus/icons-vue';
import DewImage from '@bme/dew-ui/DewImage.vue';
import DewInput from '@bme/dew-ui/DewInput.vue';
import { assetUrl } from '../services/campService';
import { showcaseService } from '../services/showcaseService';
import api from '../api';
const props = defineProps({ projectId: { type: [String, Number], required: true } });
const emit = defineEmits(['close', 'updated']);
const project = ref(null); const threads = ref([]); const loading = ref(true); const error = ref(''); const threadsError = ref(false); const expanded = ref(false); const favoriteBusy = ref(false); const posting = ref(false); const comment = ref(''); const panel = ref(null); const closeButton = ref(null);
let previousFocus; let startY = 0; let requestVersion = 0; let threadVersion = 0; let previousOverflow = '';
const progressSteps = [{ value: 'idea', label: '构思中', caption: '定义问题' }, { value: 'ongoing', label: '进行中', caption: '验证方案' }, { value: 'done', label: '已完成', caption: '形成成果' }];
const trackDescriptions = { innovation: '大学生创新创业训练项目', competition: '面向竞赛命题或赛事交付', lab: '实验室研究与工程验证', course: '课程学习与教学实践', personal: '个人兴趣驱动的长期探索', other: '其他项目实践场景' };
const progressIndex = computed(() => Math.max(0, progressSteps.findIndex((item) => item.value === project.value?.project_status)));
const crew = computed(() => [...new Set([project.value?.owner_name, ...(project.value?.members || [])].filter(Boolean))]);
const isPrimary = (link) => /github|demo|演示|docs|文档/i.test(`${link?.label || ''} ${link?.url || ''}`);
const primaryLinks = computed(() => (project.value?.links || []).filter(isPrimary).slice(0, 3));
const secondaryLinks = computed(() => (project.value?.links || []).filter((link) => !isPrimary(link)));
function emitClose() { emit('close'); }
function formatTime(value) { return String(value || '').slice(0, 16).replace('T', ' '); }
function onKey(event) {
  if (event.key === 'Escape') { event.preventDefault(); emitClose(); }
  if (event.key === 'Tab' && panel.value) { const focusables = [...panel.value.querySelectorAll('button:not(:disabled),a[href],textarea:not(:disabled)')]; if (!focusables.length) return; if (event.shiftKey && document.activeElement === focusables[0]) { event.preventDefault(); focusables.at(-1).focus(); } else if (event.shiftKey === false && document.activeElement === focusables.at(-1)) { event.preventDefault(); focusables[0].focus(); } }
}
function dragStart(event) { startY = event.changedTouches[0].clientY; }
function dragEnd(event) { const delta = event.changedTouches[0].clientY - startY; if (delta < -55) expanded.value = true; else if (delta > 55) { if (expanded.value) expanded.value = false; else emitClose(); } }
async function loadThreads() {
  if (!project.value) return; const id = project.value.id; const version = ++threadVersion; threadsError.value = false;
  try { const response = await api.get('/discussions/threads', { params: { scope_type: 'project', scope_id: id, per_page: 50 } }); if (version !== threadVersion || project.value?.id !== id) return; const data = response.data?.data ?? response.data?.threads ?? []; threads.value = Array.isArray(data) ? data : []; }
  catch { if (version === threadVersion && project.value?.id === id) threadsError.value = true; }
}
async function load() {
  const version = ++requestVersion; threadVersion++; loading.value = true; error.value = ''; project.value = null; threads.value = [];
  try { const response = await showcaseService.fetchProject(props.projectId); if (version !== requestVersion) return; project.value = response.project; if (!project.value) { error.value = '项目不存在或已下架'; return; } loadThreads(); }
  catch (err) { if (version === requestVersion) error.value = err.response?.status === 404 ? '项目不存在或已下架' : '项目加载失败'; }
  finally { if (version === requestVersion) loading.value = false; }
}
async function toggleFavorite() {
  if (favoriteBusy.value || !project.value) return; favoriteBusy.value = true;
  try { const next = !project.value.favorited; const id = project.value.id; const response = await showcaseService.favorite(id, next); if (project.value?.id !== id) return; const favorited = response.favorited ?? next; project.value = { ...project.value, favorited, favorite_count: Math.max(0, (project.value.favorite_count || 0) + (favorited ? 1 : -1)) }; emit('updated', project.value); }
  catch (err) { ElMessage.error(err.response?.data?.message || '收藏操作失败'); }
  finally { favoriteBusy.value = false; }
}
async function postComment() {
  if (!project.value || posting.value || comment.value.trim().length < 10) return; posting.value = true;
  try { const id = project.value.id; await api.post('/discussions/threads', { content: comment.value.trim(), scope_type: 'project', scope_id: id }); if (project.value?.id !== id) return; comment.value = ''; await loadThreads(); ElMessage.success('已发布'); }
  catch (err) { ElMessage.error(err.response?.data?.message || '发布失败'); }
  finally { posting.value = false; }
}
watch(() => props.projectId, load);
onMounted(async () => { previousFocus = document.activeElement; previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; window.addEventListener('keydown', onKey); await nextTick(); closeButton.value?.focus(); load(); });
onBeforeUnmount(() => { requestVersion++; threadVersion++; document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKey); previousFocus?.focus?.(); });
</script>

<style scoped>
/* XLAB 项目档案抽屉：明暗设计系统（--xg-* tokens），与广场/发布页同一视觉体系 */
.xl-drawer-backdrop{position:fixed;inset:0;z-index:2100;background:rgba(23,23,28,.42);backdrop-filter:blur(3px);animation:backdrop-in .2s ease-out}.xl-drawer{position:absolute;top:0;right:0;bottom:0;width:clamp(560px,48vw,800px);overflow-y:auto;color:var(--xg-ink);background:var(--xg-surface);border-left:1px solid var(--xg-line);border-radius:20px 0 0 20px;box-shadow:-24px 0 70px rgba(23,23,28,.2);animation:drawer-in .28s cubic-bezier(.2,.8,.2,1)}@keyframes backdrop-in{from{opacity:0}}@keyframes drawer-in{from{transform:translateX(100%)}}
.drawer-head{position:sticky;top:0;z-index:4;display:flex;height:56px;padding:0 18px;align-items:center;gap:10px;background:var(--xg-surface);border-bottom:1px solid var(--xg-line-soft);}.drawer-head>div{display:flex;align-items:center;gap:9px}.drawer-head small{color:var(--xg-faint);font-size:12px;font-weight:500}.drawer-head b{color:var(--xg-purple-deep);font-size:12px;font-weight:700}.drawer-grip,.drawer-expand{display:none}.drawer-close,.drawer-expand{width:34px;height:34px;padding:0;color:var(--xg-sub);background:var(--xg-surface-2);border:0;border-radius:999px;cursor:pointer;transition:background .15s,color .15s}.drawer-close{margin-left:auto}.drawer-close:hover,.drawer-expand:hover,.drawer-close:focus-visible,.drawer-expand:focus-visible{color:var(--xg-ink);background:var(--xg-hover);outline:none}
.drawer-state{display:grid;min-height:70dvh;padding:30px;place-items:center;align-content:center;gap:16px;color:var(--xg-faint);font-size:13px}.drawer-state button{color:var(--xg-purple-deep);background:none;border:0;cursor:pointer;font-size:13px}
.drawer-cover{position:relative;display:grid;aspect-ratio:16/8.5;place-items:center;overflow:hidden;background:var(--xg-cover-bg)}.drawer-cover :deep(.dew-image),.drawer-cover :deep(img){width:100%;height:100%;object-fit:cover}.drawer-cover::after{position:absolute;inset:0;content:'';background:linear-gradient(0deg,var(--xg-cover-overlay),transparent 42%)}.drawer-placeholder{position:absolute;inset:0;display:grid;place-items:center;background:var(--xg-cover-bg)}.drawer-placeholder span{color:var(--xg-placeholder);font-size:110px;font-weight:800}
.cover-source{position:absolute;z-index:2;bottom:14px;left:18px;display:inline-flex;align-items:center;padding:3px 11px;border-radius:999px;color:var(--xg-purple-deep);background:var(--xg-badge-bg);box-shadow:var(--xg-shadow-soft);font-size:11px;font-weight:600}.cover-source.cs-community{color:var(--xg-pink-deep)}
.drawer-body{padding:26px clamp(20px,3.5vw,40px) 56px}.title-meta{display:flex;flex-wrap:wrap;gap:7px}.title-meta span{padding:3px 11px;border-radius:999px;color:var(--xg-sub);background:var(--xg-surface-2);font-size:11.5px;font-weight:500}.title-meta span.tm-ongoing{color:var(--xg-purple-deep);background:var(--xg-purple-soft)}.title-meta span.tm-done{color:var(--xg-pink-deep);background:var(--xg-pink-soft)}
.drawer-body h2{margin:13px 0 0;font-size:clamp(23px,2.4vw,32px);font-weight:750;line-height:1.25;overflow-wrap:anywhere}.drawer-summary{margin:12px 0 0;color:var(--xg-sub);font-size:13.5px;line-height:1.75}
.drawer-tags{display:flex;margin-top:14px;flex-wrap:wrap;gap:5px}.drawer-tags span{padding:2px 9px;color:var(--xg-sub);background:var(--xg-surface-2);border-radius:6px;font-size:11px}
.drawer-actions{display:flex;margin-top:20px;flex-wrap:wrap;gap:8px}
.drawer-metrics{display:flex;margin-top:16px;gap:16px;color:var(--xg-faint);font-size:12px}.drawer-metrics strong{color:var(--xg-ink);font-size:13px;font-weight:700}
.drawer-section{margin-top:30px;padding-top:20px;border-top:1px solid var(--xg-line-soft)}.drawer-section h3{display:flex;margin:0 0 14px;align-items:center;gap:8px;color:var(--xg-ink);font-size:13.5px;font-weight:700}.drawer-section h3 span{color:var(--xg-purple);font-size:11px;font-weight:700}.drawer-section h3 b{margin-left:auto;color:var(--xg-faint);font-size:12px;font-weight:600}.drawer-section>p{margin:0;color:var(--xg-sub);font-size:13px;line-height:1.85;white-space:pre-wrap;overflow-wrap:anywhere}
.drawer-gallery{display:grid;margin-top:16px;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.drawer-gallery :deep(.dew-image){width:100%;aspect-ratio:4/3;border-radius:10px;overflow:hidden}.drawer-gallery :deep(img){width:100%;height:100%;object-fit:cover}
.progress-line{position:relative;display:grid;grid-template-columns:repeat(3,1fr)}.progress-line::before{position:absolute;top:7px;right:16%;left:16%;height:2px;content:'';background:var(--xg-line);border-radius:2px}.progress-line>div{position:relative;display:flex;align-items:center;flex-direction:column;color:var(--xg-faint);text-align:center}.progress-line i{z-index:1;width:14px;height:14px;background:var(--xg-surface);border:2px solid var(--xg-line-strong);border-radius:50%;transition:border-color .15s,background .15s}.progress-line b{margin-top:8px;font-size:12.5px}.progress-line small{margin-top:3px;font-size:11px}.progress-line .active{color:var(--xg-ink)}.progress-line .active i{border-color:var(--xg-purple)}.progress-line .current i{background:var(--xg-purple);border-color:var(--xg-purple);box-shadow:0 0 0 4px rgb(var(--xg-purple-rgb) / .16)}.progress-line .current b{color:var(--xg-purple-deep)}
.detail-grid{display:grid;grid-template-columns:1fr 1.3fr;gap:26px}.detail-grid>div+div{padding-left:26px;border-left:1px solid var(--xg-line-soft)}.detail-grid strong{font-size:15.5px;font-weight:700}.detail-grid p{margin:7px 0 0;color:var(--xg-sub);font-size:12px;line-height:1.65}
.crew-list{display:flex;flex-direction:column;gap:8px}.crew-list span{display:flex;align-items:center;gap:9px;color:var(--xg-sub);font-size:12.5px}.crew-list i{display:grid;width:27px;height:27px;place-items:center;color:var(--xg-ink);background:var(--xg-surface-2);border-radius:50%;font-style:normal;font-size:11px;font-weight:600}
.asset-list{display:grid;gap:8px}.asset-list a{display:flex;min-height:42px;padding:0 14px;align-items:center;justify-content:space-between;gap:12px;color:var(--xg-ink);background:var(--xg-surface);border:1px solid var(--xg-line);border-radius:10px;font-size:12.5px;text-decoration:none;transition:border-color .15s,background .15s}.asset-list a:hover{border-color:var(--xg-purple);background:var(--xg-purple-soft)}.asset-list .el-icon{color:var(--xg-faint)}
.drawer-muted{color:var(--xg-faint)!important}.drawer-muted button{color:var(--xg-purple-deep);background:none;border:0;cursor:pointer;font-size:12.5px}
.drawer-thread{padding:13px 0;border-bottom:1px solid var(--xg-line-soft)}.drawer-thread>div{display:flex;justify-content:space-between;gap:12px}.drawer-thread b{color:var(--xg-ink);font-size:12.5px}.drawer-thread time{color:var(--xg-faint);font-size:11px}.drawer-thread p{margin:6px 0 0;color:var(--xg-sub);font-size:12.5px;line-height:1.7;white-space:pre-wrap}
.drawer-comment{display:flex;margin-top:18px;flex-direction:column;gap:9px}.drawer-comment-label{display:flex;justify-content:space-between;color:var(--xg-sub);font-size:12px;font-weight:500}.drawer-comment-label em{color:var(--xg-faint);font-style:normal;font-weight:400}.drawer-comment button{align-self:flex-end}
@media(max-width:700px){.xl-drawer{top:auto;right:0;bottom:0;left:0;width:100%;height:62dvh;border-top:1px solid var(--xg-line);border-left:0;border-radius:20px 20px 0 0;transition:height .25s}.xl-drawer.expanded{height:100dvh}.drawer-head{touch-action:pan-y}.drawer-grip{position:absolute;top:5px;left:calc(50% - 22px);display:block;width:44px;height:4px;background:var(--xg-line-strong);border-radius:3px}.drawer-expand{display:grid;margin-left:auto;place-items:center}.drawer-close{margin-left:0}.drawer-cover{aspect-ratio:16/9}.drawer-body{padding:22px 16px 48px}.detail-grid{grid-template-columns:1fr}.detail-grid>div+div{padding-top:18px;padding-left:0;border-top:1px solid var(--xg-line-soft);border-left:0}}
@media(prefers-reduced-motion:reduce){.xl-drawer-backdrop,.xl-drawer{animation:none}.xl-drawer{transition:none}}
</style>
