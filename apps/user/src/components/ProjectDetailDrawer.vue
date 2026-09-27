<template>
  <Teleport to="body">
    <div class="xl-drawer-backdrop" @click.self="emitClose">
      <aside ref="panel" class="xl-drawer" :class="{ expanded }" role="dialog" aria-modal="true" :aria-label="project?.title || '项目详情'">
        <header class="drawer-head" @touchstart.passive="dragStart" @touchend.passive="dragEnd">
          <span class="drawer-grip" aria-hidden="true"></span>
          <div><small>XLAB / PROJECT FILE</small><b v-if="project">{{ String(project.id).padStart(4, '0') }}</b></div>
          <button type="button" class="drawer-expand" :aria-label="expanded ? '收起详情' : '展开详情'" @click="expanded = !expanded"><el-icon><Bottom v-if="expanded" /><Top v-else /></el-icon></button>
          <button ref="closeButton" type="button" class="drawer-close" aria-label="关闭详情" @click="emitClose"><el-icon><Close /></el-icon></button>
        </header>

        <div v-if="loading" class="drawer-state">正在读取项目档案</div>
        <div v-else-if="error" class="drawer-state">{{ error }}<button type="button" @click="load">重试</button></div>
        <div v-else-if="project" class="drawer-content">
          <div class="drawer-cover">
            <DewImage v-if="project.cover" :src="assetUrl(project.cover)" alt="项目封面" />
            <div v-else class="drawer-placeholder"><span>{{ project.title?.charAt(0) }}</span></div>
            <span class="cover-source">{{ project.source_text }}</span>
          </div>

          <div class="drawer-body">
            <div class="title-meta"><span>{{ project.project_status_text }}</span><span>{{ project.track_text || '其他' }}</span><span v-if="project.camp_name">{{ project.camp_name }}</span></div>
            <h2>{{ project.title }}</h2>
            <p class="drawer-summary">{{ project.summary || '这个项目正在补充一句话介绍。' }}</p>
            <div class="drawer-tags"><span v-for="tag in project.tags || []" :key="tag">{{ tag }}</span></div>

            <div class="drawer-actions">
              <button type="button" :aria-label="project.favorited ? '已收藏' : '收藏'" :disabled="favoriteBusy" @click="toggleFavorite"><el-icon><StarFilled v-if="project.favorited" /><Star v-else /></el-icon>{{ project.favorited ? '已收藏' : '收藏' }}</button>
              <a v-for="link in primaryLinks" :key="link.url" :href="link.url" target="_blank" rel="noopener noreferrer"><el-icon><Link /></el-icon>{{ link.label }}</a>
            </div>
            <div class="drawer-metrics"><span>{{ project.view_count ?? 0 }} VIEWS</span><span>{{ project.favorite_count ?? 0 }} FAVS</span><span>{{ threads.length }} COMMENTS</span></div>

            <section class="drawer-section overview-section">
              <h3><span>01</span> OVERVIEW</h3>
              <p>{{ project.description || project.summary || '项目团队尚未补充完整介绍。' }}</p>
              <div v-if="project.images?.length" class="drawer-gallery"><DewImage v-for="image in project.images" :key="image" :src="assetUrl(image)" alt="项目图片" /></div>
            </section>

            <section class="drawer-section">
              <h3><span>02</span> PROGRESS</h3>
              <div class="progress-line">
                <div v-for="(item, index) in progressSteps" :key="item.value" :class="{ active: index <= progressIndex, current: index === progressIndex }"><i></i><b>{{ item.label }}</b><small>{{ item.caption }}</small></div>
              </div>
            </section>

            <section class="drawer-section detail-grid">
              <div><h3><span>03</span> TRACK</h3><strong>{{ project.track_text || '其他' }}</strong><p>{{ trackDescriptions[project.track] || trackDescriptions.other }}</p></div>
              <div><h3><span>04</span> CREW</h3><div class="crew-list"><span v-for="member in crew" :key="member"><i>{{ member.charAt(0) }}</i>{{ member }}</span></div></div>
            </section>

            <section class="drawer-section">
              <h3><span>05</span> ASSETS</h3>
              <div v-if="secondaryLinks.length" class="asset-list"><a v-for="link in secondaryLinks" :key="link.url" :href="link.url" target="_blank" rel="noopener noreferrer"><span>{{ link.label || '项目资料' }}</span><el-icon><TopRight /></el-icon></a></div>
              <p v-else class="drawer-muted">项目团队暂未公开其他资料。</p>
            </section>

            <section class="drawer-section discussion-section">
              <h3><span>06</span> DISCUSSION <b>{{ threads.length }}</b></h3>
              <p v-if="threadsError" class="drawer-muted">讨论加载失败。<button type="button" @click="loadThreads">重试</button></p>
              <p v-else-if="!threads.length" class="drawer-muted">还没有讨论，留下第一条反馈。</p>
              <article v-for="thread in threads" :key="thread.id" class="drawer-thread"><div><b>{{ thread.author_name || `#${thread.author_id}` }}</b><time>{{ formatTime(thread.created_at) }}</time></div><p>{{ thread.content }}</p></article>
              <form class="drawer-comment" @submit.prevent="postComment"><label for="xl-drawer-message">发表讨论 <span>{{ comment.trim().length }}/10</span></label><textarea id="xl-drawer-message" v-model="comment" rows="3" placeholder="至少 10 字"></textarea><button type="submit" :disabled="posting || comment.trim().length < 10">{{ posting ? '发送中' : '发表' }}</button></form>
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
  if (event.key === 'Tab' && panel.value) { const focusables = [...panel.value.querySelectorAll('button:not(:disabled),a[href],textarea:not(:disabled)')]; if (!focusables.length) return; if (event.shiftKey && document.activeElement === focusables[0]) { event.preventDefault(); focusables.at(-1).focus(); } else if (!event.shiftKey && document.activeElement === focusables.at(-1)) { event.preventDefault(); focusables[0].focus(); } }
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
.xl-drawer-backdrop{position:fixed;inset:0;z-index:2100;background:rgba(0,0,0,.64);backdrop-filter:brightness(.58);animation:backdrop-in .2s ease-out}.xl-drawer{position:absolute;top:0;right:0;bottom:0;width:clamp(560px,48vw,780px);overflow-y:auto;color:#edf3f6;background:#090c10;border-left:1px solid rgba(155,202,229,.36);box-shadow:-22px 0 70px rgba(0,0,0,.52);animation:drawer-in .28s cubic-bezier(.2,.8,.2,1)}@keyframes backdrop-in{from{opacity:0}}@keyframes drawer-in{from{transform:translateX(100%)}}
.drawer-head{position:sticky;top:0;z-index:4;display:flex;height:54px;padding:0 16px;align-items:center;gap:10px;background:rgba(9,12,16,.92);border-bottom:1px solid rgba(163,195,214,.16);backdrop-filter:blur(14px)}.drawer-head>div{display:flex;align-items:center;gap:10px}.drawer-head small,.drawer-head b{font:9px ui-monospace,monospace}.drawer-head small{color:rgba(199,218,229,.52)}.drawer-head b{color:#9fcce6}.drawer-grip,.drawer-expand{display:none}.drawer-close,.drawer-expand{width:34px;height:34px;padding:0;color:#eaf2f6;background:transparent;border:1px solid rgba(170,201,218,.2);cursor:pointer}.drawer-close{margin-left:auto}.drawer-close:hover,.drawer-close:focus-visible{color:#071018;background:#eaf5fa;outline:none}.drawer-state{display:grid;min-height:70dvh;padding:30px;place-items:center;align-content:center;gap:16px;color:rgba(205,221,230,.55)}.drawer-state button,.drawer-muted button{color:#9fcce6;background:none;border:0;cursor:pointer}.drawer-cover{position:relative;display:grid;aspect-ratio:16/8.5;place-items:center;overflow:hidden;background:#0c151d}.drawer-cover :deep(.dew-image),.drawer-cover :deep(img){width:100%;height:100%;object-fit:cover}.drawer-cover::after{position:absolute;inset:0;content:'';background:linear-gradient(0deg,rgba(9,12,16,.74),transparent 45%)}.drawer-placeholder{position:absolute;inset:0;display:grid;place-items:center;background:repeating-linear-gradient(0deg,transparent 0 27px,rgba(133,190,222,.08) 28px),linear-gradient(135deg,#101b24,#090d12)}.drawer-placeholder span{color:rgba(188,226,246,.1);font:900 130px Arial Black,Arial,sans-serif;-webkit-text-stroke:1px rgba(156,207,235,.34)}.cover-source{position:absolute;z-index:2;bottom:16px;left:20px;padding:4px 7px;color:#dff4ff;background:rgba(5,9,13,.72);border:1px solid rgba(149,203,233,.32);font:8px ui-monospace,monospace}.drawer-body{padding:28px clamp(22px,4vw,44px) 60px}.title-meta{display:flex;flex-wrap:wrap;gap:7px}.title-meta span,.drawer-tags span{padding:4px 7px;color:rgba(209,227,237,.58);border:1px solid rgba(155,190,210,.18);font:8px ui-monospace,monospace}.title-meta span:first-child{color:#b9e4fa;border-color:rgba(127,190,225,.35)}.drawer-body h2{margin:14px 0 0;font-size:clamp(27px,3vw,42px);line-height:1.08;overflow-wrap:anywhere}.drawer-summary{margin:13px 0 0;color:rgba(217,231,238,.68);font-size:13px;line-height:1.7}.drawer-tags{display:flex;margin-top:15px;flex-wrap:wrap;gap:6px}.drawer-actions{display:flex;margin-top:22px;flex-wrap:wrap;gap:8px}.drawer-actions button,.drawer-actions a{display:inline-flex;min-height:36px;padding:0 12px;align-items:center;gap:7px;color:#e9f4f9;background:transparent;border:1px solid rgba(154,197,221,.28);font-size:11px;text-decoration:none;cursor:pointer}.drawer-actions button:first-child{color:#081018;background:#dceff8;border-color:#e8f7ff}.drawer-actions button:disabled{opacity:.5;cursor:not-allowed}.drawer-actions a:hover{border-color:#9fcce6}.drawer-metrics{display:flex;margin-top:18px;gap:18px;color:rgba(187,208,220,.38);font:8px ui-monospace,monospace}.drawer-section{margin-top:34px;padding-top:18px;border-top:1px solid rgba(153,186,204,.16)}.drawer-section h3{display:flex;margin:0 0 16px;align-items:center;gap:9px;color:#edf5f8;font:10px ui-monospace,monospace}.drawer-section h3 span{color:#78afd0}.drawer-section h3 b{margin-left:auto;color:rgba(196,215,225,.4);font-weight:400}.drawer-section>p{margin:0;color:rgba(205,221,230,.62);font-size:12px;line-height:1.85;white-space:pre-wrap;overflow-wrap:anywhere}.drawer-gallery{display:grid;margin-top:18px;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.drawer-gallery :deep(.dew-image){width:100%;aspect-ratio:4/3}.drawer-gallery :deep(img){width:100%;height:100%;object-fit:cover}.progress-line{position:relative;display:grid;grid-template-columns:repeat(3,1fr)}.progress-line::before{position:absolute;top:7px;right:16%;left:16%;height:1px;content:'';background:rgba(156,190,209,.25)}.progress-line>div{position:relative;display:flex;align-items:center;flex-direction:column;color:rgba(193,211,221,.34);text-align:center}.progress-line i{z-index:1;width:13px;height:13px;background:#10161c;border:2px solid #45545e;border-radius:50%}.progress-line b{margin-top:9px;font-size:11px}.progress-line small{margin-top:4px;font-size:9px}.progress-line .active{color:rgba(222,235,242,.72)}.progress-line .active i{background:#79b7d8;border-color:#bce7ff;box-shadow:0 0 14px rgba(103,181,224,.48)}.progress-line .current b{color:#bfe7fb}.detail-grid{display:grid;grid-template-columns:1fr 1.3fr;gap:30px}.detail-grid>div+div{padding-left:30px;border-left:1px solid rgba(153,186,204,.16)}.detail-grid strong{font-size:18px}.detail-grid p{margin:8px 0 0;color:rgba(199,217,227,.5);font-size:11px;line-height:1.65}.crew-list{display:flex;flex-direction:column;gap:8px}.crew-list span{display:flex;align-items:center;gap:9px;color:rgba(221,233,239,.7);font-size:11px}.crew-list i{display:grid;width:26px;height:26px;place-items:center;color:#dff3fd;background:#13232d;border:1px solid rgba(127,185,217,.32);border-radius:50%;font-style:normal;font-size:9px}.asset-list{display:grid;gap:7px}.asset-list a{display:flex;min-height:42px;padding:0 12px;align-items:center;justify-content:space-between;color:rgba(222,234,240,.75);background:#0d1218;border:1px solid rgba(153,186,204,.15);font-size:11px;text-decoration:none}.asset-list a:hover{border-color:#87bdda}.drawer-muted{color:rgba(184,204,215,.42)!important}.drawer-thread{padding:13px 0;border-bottom:1px solid rgba(151,184,202,.12)}.drawer-thread>div{display:flex;justify-content:space-between;gap:12px}.drawer-thread b{color:#b9ddef;font-size:10px}.drawer-thread time{color:rgba(184,204,215,.35);font:8px ui-monospace,monospace}.drawer-thread p{margin:7px 0 0;color:rgba(216,229,236,.68);font-size:12px;line-height:1.65;white-space:pre-wrap}.drawer-comment{display:flex;margin-top:18px;flex-direction:column;gap:9px}.drawer-comment label{display:flex;justify-content:space-between;color:rgba(208,223,232,.62);font-size:10px}.drawer-comment label span{color:rgba(172,198,212,.38)}.drawer-comment textarea{box-sizing:border-box;width:100%;padding:11px;resize:vertical;color:#edf5f8;background:#0b1016;border:1px solid rgba(151,190,211,.25);font:12px/1.6 inherit;outline:none}.drawer-comment textarea:focus{border-color:#80b9d8}.drawer-comment button{align-self:flex-end;min-width:76px;height:34px;color:#071018;background:#ddecf4;border:0;font-size:11px;cursor:pointer}.drawer-comment button:disabled{opacity:.4;cursor:not-allowed}
@media(max-width:700px){.xl-drawer-backdrop{backdrop-filter:brightness(.5)}.xl-drawer{top:auto;right:0;bottom:0;left:0;width:100%;height:62dvh;border-top:1px solid rgba(155,202,229,.36);border-left:0;transition:height .25s}.xl-drawer.expanded{height:100dvh}.drawer-head{touch-action:pan-y}.drawer-grip{position:absolute;top:5px;left:calc(50% - 22px);display:block;width:44px;height:3px;background:#5d7180;border-radius:3px}.drawer-expand{display:grid;margin-left:auto;place-items:center}.drawer-close{margin-left:0}.drawer-cover{aspect-ratio:16/9}.drawer-body{padding:22px 16px 48px}.detail-grid{grid-template-columns:1fr}.detail-grid>div+div{padding-top:20px;padding-left:0;border-top:1px solid rgba(153,186,204,.16);border-left:0}}
@media(prefers-reduced-motion:reduce){.xl-drawer-backdrop,.xl-drawer{animation:none}.xl-drawer{transition:none}}
</style>
