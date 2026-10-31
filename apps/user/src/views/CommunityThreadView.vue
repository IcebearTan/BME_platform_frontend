<template>
  <!-- 帖子详情页（09-20 社区迭代）：feed 卡片紧凑化后，完整互动（全文/图集/回复）落到这里。
       帖子从此有可分享 URL；通知跳转、站外引用都有落点。 -->
  <div :class="['community-view-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu"><Expand /></el-icon>
        </div>
      </el-header>
      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="thread-main-container">
        <div class="thread-col">
          <button type="button" class="back-link" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>返回社区
          </button>

          <!-- 加载骨架 / 不存在 -->
          <DewCard v-if="loading" glass no-hover size="lg">
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <DewSkeleton variant="circle" :size="40" />
              <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                <DewSkeleton variant="text" width="45%" />
                <DewSkeleton variant="text" :lines="4" />
              </div>
            </div>
          </DewCard>
          <DewCard v-else-if="!thread" glass no-hover size="lg">
            <div class="empty-hint">帖子不存在或已删除</div>
          </DewCard>

          <template v-else>
            <!-- 帖子本体 -->
            <DewCard glass no-hover size="lg" class="thread-card">
              <div class="t-tags">
                <DewTag type="neutral" size="sm" round>讨论</DewTag>
                <button v-for="tag in thread.tags" :key="tag.id" class="tag-link" @click="router.push({ path: '/community', query: { tag: tag.id } })"># {{ tag.name }}</button>
                <DewTag v-if="thread.is_essence" type="success" size="sm">精选</DewTag>
                <DewTag v-if="thread.is_closed" type="neutral" size="sm">已停止讨论</DewTag>
                <span class="owner-actions">
                  <button v-if="isOwner && !thread.is_closed" class="tag-link" @click="editOpen = true">编辑帖子</button>
                  <button v-if="canDelete && !thread.is_closed" class="tag-link" @click="handleDelete">{{ isOwner ? '停止讨论' : '删除帖子' }}</button>
                </span>
              </div>
              <div v-if="thread.book" class="book-name">共读 / {{ thread.book.title }}<span v-if="thread.book.author"> · {{ thread.book.author }}</span></div>
              <h1 class="t-title">{{ thread.title }}</h1>
              <div class="t-author" @click="goProfile(thread.author_id)">
                <el-avatar :size="40" :src="authorAvatar">{{ (thread.author_name || '?').charAt(0) }}</el-avatar>
                <div class="t-author-info">
                  <div class="t-author-name">{{ thread.author_name }}</div>
                  <div class="t-time">{{ formatTime(thread.created_at) }}</div>
                </div>
              </div>
              <p v-if="thread.is_closed" class="closed-notice">该帖子已停止讨论。楼主的正文和图片已隐藏，历史评论继续保留。</p>
              <template v-else><div class="t-content">{{ thread.content }}</div><p class="word-hint">{{ thread.word_count }} 字</p></template>
              <div v-if="images.length" :class="['t-images', `t-images--${Math.min(images.length, 4)}`]">
                <DewImage v-for="(img, i) in images" :key="img" class="t-images__item"
                          :src="img" ratio="4/3" alt="帖子图片" @click="openViewer(i)" />
              </div>
              <div class="t-actions">
                <button type="button" :class="['t-action', { 'is-liked': liked }]" @click="toggleLike">
                  <el-icon><StarFilled v-if="liked" /><Star v-else /></el-icon>
                  <span>{{ liked ? '已赞' : '点赞' }}</span>
                  <span v-if="likeCount" class="t-count">{{ likeCount }}</span>
                </button>
                <span class="t-action t-action--static">
                  <el-icon><View /></el-icon>
                  <span>{{ thread.view_count }} 浏览</span>
                </span>
                <span class="t-reply-total">{{ thread.reply_count }} 回复</span>
              </div>
            </DewCard>

            <!-- 回复区 -->
            <DewCard glass no-hover size="lg" class="replies-card">
              <h2 class="discussion-heading">一起聊聊 <span>{{ thread.reply_count }} 条评论</span></h2>
              <div v-if="writable" class="reply-editor">
                <label for="root-comment">发表评论</label>
                <DewInput ref="replyInput" id="root-comment" v-model="replyContent" type="textarea" :rows="5" :disabled="replying" placeholder="说说你的想法…" />
                <div class="editor-footer"><div class="editor-tools"><CommunityEmojiPicker :disabled="replying" @select="replyInput?.insertText($event)" /><span class="word-hint">{{ countWords(replyContent) }} 字<span v-if="readingTag"> · 建议约 {{ readingTag.suggested_words }} 字</span> · {{ contentLength(replyContent) }}/10000 字符</span></div>
                  <DewButton :loading="replying" :disabled="!validComment(replyContent)" @click="submitReply">发布评论</DewButton></div>
              </div>
              <p v-else class="closed-notice">{{ thread.is_closed ? '已停止新增评论与回复，以下是历史讨论。' : '帖子已锁定，暂时无法回复。' }}</p>
              <p v-if="repliesError" role="alert" class="word-hint">评论加载失败 <button class="tag-link" @click="loadReplies(replies.length === 0)">重试</button></p>
              <div v-if="repliesLoading && !replies.length"><DewSkeleton variant="text" :lines="5" /></div>
              <p v-else-if="!replies.length && !repliesError" class="empty-hint">还没有评论，来聊聊吧。</p>
              <section v-for="r in replies" :key="r.id" class="root-comment">
                <CommunityComment :comment="r" :writable="writable" @profile="goProfile" @reply="startReply" @edit="startEdit" @delete="deleteReply" />
                <div v-if="r.children_total" class="children-replies">
                  <CommunityComment v-for="child in r.children" :key="child.id" :comment="child" child :writable="writable" @profile="goProfile" @reply="startReply" @edit="startEdit" @delete="deleteReply" />
                  <button v-if="r.children.length < r.children_total" class="tag-link" :disabled="r.childrenLoading" @click="loadChildren(r)">{{ r.childrenLoading ? '加载中…' : `展开更多回复（${r.children_total - r.children.length}）` }}</button>
                  <p v-if="r.childrenError" role="alert">回复加载失败，请重试。</p>
                </div>
              </section>
              <div v-if="hasMoreReplies" class="load-more-replies"><DewButton type="ghost" :disabled="repliesLoading" @click="loadReplies(false)">加载更多评论</DewButton></div>
            </DewCard>
          </template>
        </div>
      </el-main>
    </el-container>

    <CommunityComposer v-if="thread" v-model="editOpen" :tags="tags" :thread="thread" @published="onEdited" />
    <DewDialog v-model="commentDialog" :title="editingComment ? '编辑评论' : `回复 ${replyTarget?.author_name || ''}`" width="min(680px, 94vw)" :close-on-click-modal="false">
      <DewInput ref="dialogInput" v-model="dialogContent" type="textarea" :rows="8" :disabled="dialogSaving" placeholder="写下你的想法" />
      <div class="editor-tools dialog-tools"><CommunityEmojiPicker :disabled="dialogSaving" @select="dialogInput?.insertText($event)" /><p class="word-hint">{{ countWords(dialogContent) }} 字<span v-if="readingTag"> · 建议约 {{ readingTag.suggested_words }} 字</span> · {{ contentLength(dialogContent) }}/10000 字符</p></div>
      <template #footer><DewButton :disabled="dialogSaving" @click="commentDialog = false">保留草稿并关闭</DewButton><DewButton :loading="dialogSaving" :disabled="!validComment(dialogContent)" @click="saveDialog">{{ editingComment ? '保存修改' : '发布回复' }}</DewButton></template>
    </DewDialog>
    <!-- 图集大图 -->
    <el-image-viewer v-if="viewerVisible" :url-list="images" :initial-index="viewerIndex"
                     teleported @close="viewerVisible = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { ArrowLeft, View, Star, StarFilled, Menu as Expand } from '@element-plus/icons-vue'
import MenuComponent from '../components/MenuComponent.vue'
import MobileMenuComponent from '../components/MobileMenuComponent.vue'
import CommunityComment from '../components/Community/CommunityComment.vue'
import CommunityComposer from '../components/Community/CommunityComposer.vue'
import CommunityEmojiPicker from '../components/Community/CommunityEmojiPicker.vue'
const replyInput = ref(), dialogInput = ref()
import { DewCard, DewTag, DewInput, DewButton, DewSkeleton, DewImage, DewMessageBox, DewDialog } from '@bme/dew-ui'
import api from '../api'
import { assetUrl } from '../services/campService'
import { communityService, countWords, contentLength, newRequestId } from '../services/communityService'
const route = useRoute(), router = useRouter(), store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)
const isMobile = ref(window.innerWidth <= 768), isMobileMenuOpen = ref(false)
const checkScreenSize = () => { isMobile.value = window.innerWidth <= 768 }
const toggleMobileMenu = () => { isMobileMenuOpen.value = !isMobileMenuOpen.value }
const loading = ref(true), thread = ref(null), liked = ref(false), likeCount = ref(0), tags = ref([]), editOpen = ref(false)
const authorAvatar = computed(() => assetUrl(thread.value?.author_avatar || ''))
const images = computed(() => (thread.value?.images || []).map(assetUrl))
const viewerVisible = ref(false), viewerIndex = ref(0)
const openViewer = i => { viewerIndex.value = i; viewerVisible.value = true }
const isOwner = computed(() => Number(thread.value?.author_id) === Number(store.state.user?.User_Id))
const canDelete = computed(() => isOwner.value || store.getters.role === 'super_admin')
const writable = computed(() => thread.value?.status === 'normal' && !thread.value?.is_closed)
const readingTag = computed(() => thread.value?.tags?.find(t => t.is_reading))
const formatTime = value => value || ''
const goProfile = id => { if (id) router.push('/profile/' + id) }
const goBack = () => router.push({ path: '/community', query: thread.value?.tags?.[0] ? { tag: thread.value.tags[0].id } : {} })
let sequence = 0
async function loadThread() {
  const current = ++sequence
  loading.value = true
  try {
    const { data } = await api.get(`/discussions/threads/${route.params.id}`)
    if (sequence !== current) return
    thread.value = data.data
    liked.value = !!thread.value.liked; likeCount.value = thread.value.like_count || 0
  } catch (e) { if (sequence === current) { thread.value = null; ElMessage.error(e.response?.data?.message || '帖子加载失败，请刷新重试') } }
  finally { if (sequence === current) loading.value = false }
}
const replies = ref([]), repliesPage = ref(0), repliesTotal = ref(0), repliesLoading = ref(false), repliesError = ref(false)
const replying = ref(false), replyContent = ref(''), rootRequest = ref(newRequestId())
watch(replyContent, () => { rootRequest.value = newRequestId() })
const hasMoreReplies = computed(() => replies.value.length < repliesTotal.value)
const validComment = value => contentLength(value) >= 2 && contentLength(value) <= 10000
function mapReply(r) { return { ...r, children: r.children || [], childrenPage: 0, childrenLoading: false, childrenError: false } }
async function loadReplies(reset = true) {
  const id = String(route.params.id)
  if (repliesLoading.value) return
  const next = reset ? 1 : repliesPage.value + 1
  repliesLoading.value = true; repliesError.value = false
  try {
    const { data } = await api.get(`/discussions/threads/${id}/replies`, { params: { page: next, per_page: 20 } })
    if (String(route.params.id) !== id) return
    replies.value = reset ? data.data.map(mapReply) : [...replies.value, ...data.data.filter(r => !replies.value.some(old => old.id === r.id)).map(mapReply)]
    repliesPage.value = next; repliesTotal.value = data.total
    if (thread.value) thread.value.reply_count = data.reply_count
  } catch { repliesError.value = true }
  finally { repliesLoading.value = false }
}
async function loadChildren(root) {
  if (root.childrenLoading) return
  root.childrenLoading = true; root.childrenError = false
  const page = root.childrenPage + 1
  try {
    const { data } = await api.get(`/discussions/replies/${root.id}/children`, { params: { page, per_page: 10 } })
    root.children = page === 1 ? data.data : [...root.children, ...data.data.filter(c => !root.children.some(old => old.id === c.id))]
    root.childrenPage = page; root.children_total = data.total
  } catch { root.childrenError = true }
  finally { root.childrenLoading = false }
}
async function submitReply() {
  if (replying.value || !validComment(replyContent.value)) return
  replying.value = true
  try {
    const { data } = await api.post(`/discussions/threads/${thread.value.id}/replies`, { content: replyContent.value.trim(), client_request_id: rootRequest.value })
    replyContent.value = ''
    // Keep the posted comment visible even when there are many existing pages.
    const newRow = mapReply({ ...data.data, children_total: 0 })
    if (!replies.value.some(r => r.id === newRow.id)) { replies.value.push(newRow); repliesTotal.value++; thread.value.reply_count++ }
    ElMessage.success('评论已发布')
  } catch (e) { ElMessage.error(e.response?.data?.message || '发布失败，内容已保留') }
  finally { replying.value = false }
}
const commentDialog = ref(false), editingComment = ref(null), replyTarget = ref(null), dialogContent = ref(''), dialogSaving = ref(false), dialogRequest = ref(newRequestId())
watch(dialogContent, () => { dialogRequest.value = newRequestId() })
const drafts = new Map()
function stashDialog() { const key = editingComment.value ? 'edit' + editingComment.value.id : 'reply' + replyTarget.value?.id; drafts.set(key, dialogContent.value) }
watch(commentDialog, value => { if (!value) stashDialog() })
function startReply(comment) { stashDialog(); editingComment.value = null; replyTarget.value = comment; dialogContent.value = drafts.get('reply' + comment.id) || ''; commentDialog.value = true }
function startEdit(comment) { stashDialog(); editingComment.value = comment; replyTarget.value = null; dialogContent.value = drafts.get('edit' + comment.id) ?? comment.content; commentDialog.value = true }
async function saveDialog() {
  if (dialogSaving.value || !validComment(dialogContent.value)) return
  dialogSaving.value = true
  try {
    if (editingComment.value) {
      const { data } = await api.put(`/discussions/replies/${editingComment.value.id}`, { content: dialogContent.value.trim() })
      Object.assign(editingComment.value, data.data)
    } else {
      const { data } = await api.post(`/discussions/threads/${thread.value.id}/replies`, { content: dialogContent.value.trim(), parent_reply_id: replyTarget.value.id, client_request_id: dialogRequest.value })
      const root = replies.value.find(r => r.id === (replyTarget.value.root_reply_id || replyTarget.value.id))
      if (root && !root.children.some(c => c.id === data.data.id)) {
        // Reload existing child pages before inserting the new reply so pagination stays complete.
        root.childrenPage = 0; await loadChildren(root)
        if (!root.children.some(c => c.id === data.data.id)) root.children.push(data.data)
      }
      thread.value.reply_count++
    }
    dialogContent.value = ''; commentDialog.value = false; ElMessage.success('已保存')
  } catch (e) { ElMessage.error(e.response?.data?.message || '保存失败，内容已保留') }
  finally { dialogSaving.value = false }
}
async function deleteReply(comment) {
  try { await DewMessageBox.confirm('删除这条评论？其他人的回复仍会保留。', '删除评论') } catch { return }
  try { await api.delete(`/discussions/replies/${comment.id}`); await loadReplies(true); ElMessage.success('评论已删除') }
  catch (e) { ElMessage.error(e.response?.data?.message || '删除失败') }
}
const liking = ref(false)
async function toggleLike() {
  if (liking.value) return
  liking.value = true
  try { const { data } = await api.post('/discussions/reactions', { target_type: 'thread', target_id: thread.value.id, reaction_type: 'like' }); const next = !!data.data.liked; likeCount.value += next === liked.value ? 0 : next ? 1 : -1; liked.value = next }
  catch (e) { ElMessage.error(e.response?.data?.message || '点赞失败') }
  finally { liking.value = false }
}
async function handleDelete() {
  try { await DewMessageBox.confirm(isOwner.value ? '停止讨论后，你的正文和图片将隐藏，所有历史评论继续展示，无法新增回复。此操作不可撤销。' : '删除此帖子后，普通用户将无法访问。', isOwner.value ? '停止讨论' : '管理员删除') } catch { return }
  try { const { data } = await api.delete(`/discussions/threads/${thread.value.id}`); if (data.data?.is_closed) thread.value = data.data; else router.push('/community'); ElMessage.success(isOwner.value ? '已停止讨论' : '已删除') }
  catch (e) { ElMessage.error(e.response?.data?.message || '操作失败') }
}
async function onEdited(data) { thread.value = data; editOpen.value = false }
async function initialize() { replies.value = []; repliesPage.value = 0; await loadThread(); if (thread.value) await loadReplies(true) }
onMounted(() => { window.addEventListener('resize', checkScreenSize); initialize(); communityService.tags().then(rows => { tags.value = rows }).catch(() => {}) })
watch(() => route.params.id, initialize)
onUnmounted(() => { sequence++; window.removeEventListener('resize', checkScreenSize) })
</script>

<style scoped>
/* 与社区主页同款降噪极光底（CommunityView 同源口径） */
.community-view-container { min-height: 100vh; }
.theme-light.community-view-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.12), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.11), transparent 60%),
    linear-gradient(135deg, #f6f8fd 0%, #faf5f8 50%, #f4faf6 100%);
}
.theme-dark.community-view-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}
.common-layout { min-height: 100vh; display: flex; flex-direction: column; }
.header-container { padding: 0; height: auto; z-index: 100; }
.theme-light .header-container { background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); }
.theme-dark .header-container { background: #1a1a1a; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); }
.desktop-menu-container { width: 100%; }
.mobile-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; height: 60px; }
.mobile-logo { cursor: pointer; }
.hamburger-icon { font-size: 24px; cursor: pointer; }
.theme-light .hamburger-icon { color: #333; }
.theme-dark .hamburger-icon { color: #fff; }

.thread-main-container { flex: 1; padding: 24px 20px 60px; max-width: 860px; margin: 0 auto; width: 100%; box-sizing: border-box; }
.thread-col { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.thread-col > .dew-card {
  --dew-card-glass-bg-hover: var(--dew-card-glass-bg);
  --dew-card-glass-shadow-hover: var(--dew-card-glass-shadow);
}
.thread-col > .dew-card :deep(.dew-card__refraction),
.thread-col > .dew-card :deep(.dew-card__chromatic) { display: none; }

.back-link {
  display: inline-flex; align-items: center; gap: 5px; align-self: flex-start;
  background: transparent; border: none; cursor: pointer; padding: 4px 8px;
  font-size: 13px; color: var(--dew-text-muted, #666); transition: color 0.15s;
}
.back-link:hover { color: var(--dew-text-heading, #222); }

.empty-hint { text-align: center; padding: 36px 0; color: var(--dew-text-faint, #999); font-size: 13.5px; }

/* 帖子卡 */
.t-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.t-project {
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
  font-size: 11.5px; font-weight: 600; padding: 2px 10px; border-radius: 999px;
  color: #00915d; border: 1px solid rgba(0, 145, 93, 0.35); background: rgba(0, 145, 93, 0.06);
}
.t-project:hover { background: rgba(0, 145, 93, 0.14); }
.t-project .el-icon { font-size: 11px; }
.t-delete {
  margin-left: auto; display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border: none; border-radius: 8px; cursor: pointer;
  background: transparent; color: var(--dew-text-faint, #999);
}
.t-delete:hover { background: rgba(0, 0, 0, 0.06); color: #f56c6c; }
.t-title { margin: 12px 0 14px; font-size: 24px; font-weight: 800; line-height: 1.4; color: var(--dew-text-heading, #222); }
.t-author { display: flex; align-items: center; gap: 10px; cursor: pointer; margin-bottom: 16px; }
.t-author-name { font-size: 14px; font-weight: 600; color: var(--dew-text-heading, #222); }
.t-time { font-size: 12px; color: var(--dew-text-faint, #999); margin-top: 2px; }
.t-content { overflow-wrap: anywhere; font-size: 15px; line-height: 1.85; color: var(--dew-text-heading, #1f2937); white-space: pre-wrap; }

.t-images { display: grid; gap: 8px; margin-top: 14px; }
.t-images--1 { grid-template-columns: minmax(0, 480px); }
.t-images--2, .t-images--4 { grid-template-columns: repeat(2, 1fr); }
.t-images--3 { grid-template-columns: repeat(3, 1fr); }
.t-images__item { width: 100%; cursor: zoom-in; border-radius: 10px; overflow: hidden; }

.t-actions { display: flex; align-items: center; gap: 18px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--dew-card-divider, rgba(0, 0, 0, 0.08)); }
.t-action {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  background: transparent; border: none; font-size: 13.5px;
  color: var(--dew-text-muted, #666); transition: color 0.15s;
}
.t-action:hover { color: var(--dew-text-heading, #222); }
.t-action.is-liked { color: #f43f5e; }
.t-action--static { cursor: default; }
.t-action--sm { font-size: 12px; }
.t-count { font-variant-numeric: tabular-nums; }
.t-reply-total { margin-left: auto; font-size: 13px; color: var(--dew-text-faint, #999); }

/* 回复区 */
.reply-input-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 18px; }
.reply-input-row .dew-input { flex: 1; }
.reply-list { display: flex; flex-direction: column; }
.reply-item { display: flex; gap: 10px; padding: 12px 0; border-top: 1px solid var(--dew-card-divider, rgba(0, 0, 0, 0.06)); }
.reply-item:first-child { border-top: none; }
.reply-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.reply-head { display: flex; align-items: baseline; gap: 10px; }
.reply-name { font-size: 13px; font-weight: 600; color: var(--dew-text-heading, #222); cursor: pointer; }
.reply-time { font-size: 11.5px; color: var(--dew-text-faint, #999); }
.reply-text { font-size: 14px; line-height: 1.7; color: var(--dew-text-heading, #1f2937); white-space: pre-wrap; }
.load-more-replies { display: flex; justify-content: center; padding-top: 14px; }

@media (max-width: 768px) {
  .thread-main-container { padding: 14px 14px 48px; }
  .t-title { font-size: 20px; }
}
.tag-link { border: 0; background: transparent; color: var(--dew-text-muted); cursor: pointer; padding: 5px; font: inherit; font-size: 13px; }
.tag-link:hover { color: var(--color-primary); }
.owner-actions { margin-left: auto; display: flex; gap: 8px; }
.book-name { margin-top: 24px; color: var(--dew-text-muted); font-size: 13px; }
.discussion-heading { color: var(--dew-text-heading); font-size: 20px; margin: 0 0 10px; }
.discussion-heading span { font-size: 13px; font-weight: 400; color: var(--dew-text-muted); margin-left: 10px; }
.word-hint { color: var(--dew-text-muted); font-size: 12px; line-height: 1.8; }
.closed-notice { padding: 16px; border: 1px solid var(--dew-card-flat-border); border-radius: 12px; color: var(--dew-text-muted); line-height: 1.8; }
.reply-editor { margin: 24px 0; display: grid; gap: 12px; }
.reply-editor label { font-size: 14px; color: var(--dew-text-heading); }
.editor-tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; min-width: 0; }
.dialog-tools { margin-top: 10px; }
.editor-footer { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
.root-comment { border-top: 1px solid var(--dew-card-flat-border); }
.children-replies { background: var(--dew-ghost-hover-bg); border-radius: 12px; margin: 0 0 20px 44px; padding: 0 16px 12px; }
@media (max-width: 600px) { .children-replies { margin-left: 24px; padding: 0 12px 12px; } .owner-actions { width: 100%; margin: 8px 0 0; } }
</style>
