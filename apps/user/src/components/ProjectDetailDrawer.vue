<template>
  <Teleport to='body'>
    <div class='xl-drawer-backdrop' @click.self='emitClose'>
      <aside ref='panel' class='xl-drawer' :class='{ expanded }' role='dialog' aria-modal='true' :aria-label='project?.title || "项目详情"'>
        <div class='xl-drawer-head' @touchstart.passive='dragStart' @touchend.passive='dragEnd'>
          <span class='xl-drawer-grip' aria-hidden='true'></span><span>// PROJECT_FILE</span>
          <button type='button' class='xl-drawer-expand' :aria-label='expanded ? "收起详情" : "展开详情"' @click='expanded = !expanded'>{{ expanded ? '↓' : '↑' }}</button>
          <button ref='closeButton' type='button' class='xl-drawer-close' aria-label='关闭详情' @click='emitClose'>×</button>
        </div>
        <div v-if='loading' class='xl-drawer-state'>正在加载项目…</div>
        <div v-else-if='error' class='xl-drawer-state'>{{ error }} <button type='button' @click='load'>重试</button></div>
        <div v-else-if='project' class='xl-drawer-content'>
          <div class='xl-drawer-cover'><DewImage v-if='project.cover' :src='assetUrl(project.cover)' ratio='16/9' alt='项目封面' /><span v-else class='xl-drawer-placeholder'>{{ project.title?.charAt(0) }}</span></div>
          <div class='xl-drawer-body'>
            <span class='xl-drawer-source'>{{ project.source_text }} / {{ project.project_status_text }}</span>
            <h2>{{ project.title }}</h2><p class='xl-drawer-summary'>{{ project.summary || '暂无简介' }}</p>
            <div class='xl-drawer-metrics'><span>{{ project.view_count ?? 0 }} VIEWS</span><span>{{ project.favorite_count ?? 0 }} FAVS</span><span>{{ threads.length }} COMMENTS</span></div>
            <div class='xl-drawer-actions'><button type='button' :aria-label='project.favorited ? "已收藏" : "收藏"' :disabled='favoriteBusy' @click='toggleFavorite'>{{ project.favorited ? '♥ 已收藏' : '♡ 收藏' }}</button><router-link :to='`/projects/${project.id}`'>完整详情 ↗</router-link></div>
            <section v-if='project.description'><h3>// DETAILS</h3><p class='xl-drawer-description'>{{ project.description }}</p></section>
            <section v-if='project.images?.length'><h3>// GALLERY</h3><div class='xl-drawer-gallery'><DewImage v-for='image in project.images' :key='image' :src='assetUrl(image)' ratio='4/3' alt='项目图片' /></div></section>
            <section><h3>// CREATOR</h3><p>{{ project.owner_name || '—' }}</p></section>
            <section v-if='project.members?.length'><h3>// CREW</h3><div class='xl-drawer-chips'><span v-for='member in project.members' :key='member'>{{ member }}</span></div></section>
            <section v-if='project.tags?.length'><h3>// TAGS</h3><div class='xl-drawer-chips'><span v-for='tag in project.tags' :key='tag'>{{ tag }}</span></div></section>
            <section v-if='project.links?.length'><h3>// ASSETS</h3><a v-for='link in project.links' :key='link.url' class='xl-drawer-link' :href='link.url' target='_blank' rel='noopener noreferrer'>{{ link.label || link.url }} ↗</a></section>
            <section><h3>// DISCUSSION · {{ threads.length }}</h3><p v-if='threadsError' class='xl-drawer-muted'>讨论加载失败。<button type='button' @click='loadThreads'>重试</button></p><p v-else-if='!threads.length' class='xl-drawer-muted'>还没有讨论</p><article v-for='thread in threads' :key='thread.id' class='xl-drawer-thread'><div>{{ thread.author_name || `#${thread.author_id}` }} <time>{{ (thread.created_at || '').slice(0, 16).replace('T', ' ') }}</time></div><p>{{ thread.content }}</p></article><form class='xl-drawer-comment' @submit.prevent='postComment'><label for='xl-drawer-message'>发表讨论</label><textarea id='xl-drawer-message' v-model='comment' rows='3' placeholder='至少 10 字'></textarea><button type='submit' :disabled='posting || comment.trim().length < 10'>{{ posting ? '发送中…' : '发表' }}</button></form></section>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import DewImage from '@bme/dew-ui/DewImage.vue';
import { assetUrl } from '../services/campService';
import { showcaseService } from '../services/showcaseService';
import api from '../api';

const props = defineProps({ projectId: { type: [String, Number], required: true } });
const emit = defineEmits(['close', 'updated']);
const project = ref(null);
const threads = ref([]);
const loading = ref(true);
const error = ref('');
const threadsError = ref(false);
const expanded = ref(false);
const favoriteBusy = ref(false);
const posting = ref(false);
const comment = ref('');
const panel = ref(null);
const closeButton = ref(null);
let previousFocus;
let startY = 0;
let requestVersion = 0;
let threadVersion = 0;
let previousOverflow = '';
function emitClose() { emit('close'); }
function onKey(event) {
  if (event.key === 'Escape') { event.preventDefault(); emitClose(); }
  if (event.key === 'Tab' && panel.value) {
    const focusables = [...panel.value.querySelectorAll('button:not(:disabled),a[href],textarea:not(:disabled)')];
    if (!focusables.length) return;
    if (event.shiftKey && document.activeElement === focusables[0]) { event.preventDefault(); focusables.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === focusables.at(-1)) { event.preventDefault(); focusables[0].focus(); }
  }
}
function dragStart(event) { startY = event.changedTouches[0].clientY; }
function dragEnd(event) {
  const delta = event.changedTouches[0].clientY - startY;
  if (delta < -55) expanded.value = true;
  else if (delta > 55) { if (expanded.value) expanded.value = false; else emitClose(); }
}
async function loadThreads() {
  if (!project.value) return;
  const id = project.value.id;
  const version = ++threadVersion;
  threadsError.value = false;
  try {
    const response = await api.get('/discussions/threads', { params: { scope_type: 'project', scope_id: id, per_page: 50 } });
    if (version !== threadVersion || project.value?.id !== id) return;
    const data = response.data?.data ?? response.data?.threads ?? [];
    threads.value = Array.isArray(data) ? data : [];
  } catch { if (version === threadVersion && project.value?.id === id) threadsError.value = true; }
}
async function load() {
  const version = ++requestVersion;
  threadVersion++;
  loading.value = true; error.value = ''; project.value = null; threads.value = [];
  try {
    const response = await showcaseService.fetchProject(props.projectId);
    if (version !== requestVersion) return;
    project.value = response.project;
    if (!project.value) { error.value = '项目不存在或已下架'; return; }
    loadThreads();
  } catch (err) { if (version === requestVersion) error.value = err.response?.status === 404 ? '项目不存在或已下架' : '项目加载失败'; }
  finally { if (version === requestVersion) loading.value = false; }
}
async function toggleFavorite() {
  if (favoriteBusy.value || !project.value) return;
  favoriteBusy.value = true;
  try {
    const next = !project.value.favorited;
    const id = project.value.id;
    const response = await showcaseService.favorite(id, next);
    if (project.value?.id !== id) return;
    const favorited = response.favorited ?? next;
    project.value = { ...project.value, favorited, favorite_count: Math.max(0, (project.value.favorite_count || 0) + (favorited ? 1 : -1)) };
    emit('updated', project.value);
  } catch (err) { ElMessage.error(err.response?.data?.message || '收藏操作失败'); }
  finally { favoriteBusy.value = false; }
}
async function postComment() {
  if (!project.value || posting.value || comment.value.trim().length < 10) return;
  posting.value = true;
  try {
    const id = project.value.id;
    await api.post('/discussions/threads', { content: comment.value.trim(), scope_type: 'project', scope_id: id });
    if (project.value?.id !== id) return;
    comment.value = ''; await loadThreads(); ElMessage.success('已发布');
  } catch (err) { ElMessage.error(err.response?.data?.message || '发布失败'); }
  finally { posting.value = false; }
}
watch(() => props.projectId, load);
onMounted(async () => { previousFocus = document.activeElement; previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; window.addEventListener('keydown', onKey); await nextTick(); closeButton.value?.focus(); load(); });
onBeforeUnmount(() => { requestVersion++; threadVersion++; document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKey); previousFocus?.focus?.(); });
</script>

<style scoped>
.xl-drawer-backdrop{position:fixed;inset:0;z-index:2100;background:rgba(0,0,0,.7)}.xl-drawer{position:absolute;right:0;top:0;bottom:0;width:min(52vw,760px);overflow-y:auto;background:#0b1019;color:#f7f9fb;border-left:1px solid #466070;box-shadow:-20px 0 55px #0008}.xl-drawer-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:12px;height:56px;padding:0 18px;background:#101a29;border-bottom:1px solid #34495c;font:11px ui-monospace,monospace}.xl-drawer-grip{display:none}.xl-drawer-expand,.xl-drawer-close{background:none;border:0;color:#fff;font-size:22px}.xl-drawer-expand{display:none}.xl-drawer-close{margin-left:auto}.xl-drawer-state{padding:40px 24px;color:#b4c2cb}.xl-drawer-state button,.xl-drawer-muted button{background:none;border:0;color:#00ff9c}.xl-drawer-cover{aspect-ratio:16/9;display:grid;place-items:center;background:repeating-linear-gradient(0deg,#112334 0 1px,#09131d 1px 22px);overflow:hidden}.xl-drawer-cover :deep(.dew-image){width:100%;height:100%}.xl-drawer-placeholder{font:900 120px ui-monospace,monospace;color:transparent;-webkit-text-stroke:1px #6aaab1}.xl-drawer-body{padding:25px clamp(20px,4vw,42px) 55px}.xl-drawer-source,.xl-drawer-body h3{font:12px ui-monospace,monospace;color:#00ff9c}.xl-drawer-body h2{font-size:clamp(24px,3vw,42px);margin:12px 0}.xl-drawer-summary,.xl-drawer-description{color:#c9d5df;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}.xl-drawer-metrics,.xl-drawer-actions{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:20px;font:12px ui-monospace,monospace}.xl-drawer-metrics{color:#aab9c6}.xl-drawer-actions button,.xl-drawer-actions a,.xl-drawer-comment button{padding:9px 15px;border:1px solid #00ff9c;background:#00ff9c;color:#08110d;text-decoration:none;font:700 12px ui-monospace,monospace;cursor:pointer}.xl-drawer-actions a{background:transparent;color:#fff;border-color:#607689}.xl-drawer-actions button:disabled,.xl-drawer-comment button:disabled{opacity:.45;cursor:not-allowed}.xl-drawer-body section{margin-top:32px;padding-top:16px;border-top:1px solid #344252}.xl-drawer-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.xl-drawer-gallery :deep(.dew-image){width:100%}.xl-drawer-chips{display:flex;flex-wrap:wrap;gap:8px}.xl-drawer-chips span{padding:5px 8px;border:1px solid #435564;color:#d0dbe1;font-size:12px}.xl-drawer-link{display:block;color:#00ff9c;padding:7px 0;overflow-wrap:anywhere}.xl-drawer-muted{color:#889ba9}.xl-drawer-thread{border-bottom:1px solid #2e3d4d;padding:12px 0}.xl-drawer-thread div{color:#00ff9c;font-size:12px}.xl-drawer-thread time{float:right;color:#91a4b0}.xl-drawer-thread p{line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.xl-drawer-comment{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin-top:18px}.xl-drawer-comment label{font-size:12px}.xl-drawer-comment textarea{width:100%;resize:vertical;background:#09111c;border:1px solid #465d6b;color:#fff;padding:10px;font:13px inherit}.xl-drawer-comment button{align-self:flex-end}
@media(max-width:700px){.xl-drawer{top:auto;bottom:0;left:0;right:0;width:100%;height:60dvh;border-left:0;border-top:1px solid #466070;transition:height .25s}.xl-drawer.expanded{height:100dvh}.xl-drawer-head{touch-action:pan-y}.xl-drawer-grip{display:block;position:absolute;top:5px;left:calc(50% - 22px);width:44px;height:4px;border-radius:4px;background:#688091}.xl-drawer-expand{display:block;margin-left:auto}.xl-drawer-close{margin-left:0}}@media(prefers-reduced-motion:reduce){.xl-drawer{transition:none}}
</style>
