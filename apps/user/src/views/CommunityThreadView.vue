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
          <DewCard v-if="loading" variant="flat" size="lg">
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <DewSkeleton variant="circle" :size="40" />
              <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                <DewSkeleton variant="text" width="45%" />
                <DewSkeleton variant="text" :lines="4" />
              </div>
            </div>
          </DewCard>
          <DewCard v-else-if="!thread" variant="flat" size="lg">
            <div class="empty-hint">帖子不存在或已删除</div>
          </DewCard>

          <template v-else>
            <!-- 帖子本体 -->
            <DewCard variant="flat" size="lg" class="thread-card">
              <div class="t-tags">
                <DewTag type="neutral" size="sm" round>讨论</DewTag>
                <DewTag v-if="thread.category_text" type="info" size="sm" round>{{ thread.category_text }}</DewTag>
                <DewTag v-if="thread.is_essence" type="success" size="sm" round>精华</DewTag>
                <DewTag v-if="thread.is_pinned" type="warning" size="sm" round>置顶</DewTag>
                <span v-if="thread.project_title" class="t-project" @click="openTab(`/projects/${thread.project_id}`)">
                  <el-icon><Grid /></el-icon>{{ thread.project_title }}
                </span>
                <button v-if="canDelete" class="t-delete" title="删除帖子" @click="handleDelete">
                  <el-icon><Delete /></el-icon>
                </button>
              </div>
              <h1 class="t-title">{{ thread.title }}</h1>
              <div class="t-author" @click="goProfile(thread.author_id)">
                <el-avatar :size="40" :src="authorAvatar">{{ (thread.author_name || '?').charAt(0) }}</el-avatar>
                <div class="t-author-info">
                  <div class="t-author-name">{{ thread.author_name }}</div>
                  <div class="t-time">{{ formatTime(thread.created_at) }}</div>
                </div>
              </div>
              <div class="t-content">{{ thread.content }}</div>
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
            <DewCard variant="flat" size="lg" class="replies-card">
              <div class="reply-input-row">
                <el-avatar :size="32" :src="myAvatar || ''">{{ (myName || '?').charAt(0) }}</el-avatar>
                <DewInput v-model="replyContent" type="textarea" :rows="2" placeholder="写下你的回复…（至少 2 字）" />
                <DewButton type="glass" size="sm" :disabled="replying || replyContent.trim().length < 2" @click="submitReply">
                  {{ replying ? '发布中…' : '回复' }}
                </DewButton>
              </div>

              <div v-if="!replies.length" class="empty-hint">还没有回复，抢沙发</div>
              <div v-else class="reply-list">
                <div v-for="r in replies" :key="r.id" class="reply-item">
                  <el-avatar :size="32" :src="r.author_avatar">{{ (r.author_name || '?').charAt(0) }}</el-avatar>
                  <div class="reply-body">
                    <div class="reply-head">
                      <span class="reply-name" @click="goProfile(r.author_id)">{{ r.author_name }}</span>
                      <span class="reply-time">{{ formatTime(r.created_at) }}</span>
                    </div>
                    <div class="reply-text">{{ r.content }}</div>
                    <button type="button" :class="['t-action', 't-action--sm', { 'is-liked': r.liked }]" @click="toggleReplyLike(r)">
                      <el-icon><StarFilled v-if="r.liked" /><Star v-else /></el-icon>
                      <span v-if="r.like_count">{{ r.like_count }}</span>
                    </button>
                  </div>
                </div>
                <div v-if="hasMoreReplies" class="load-more-replies">
                  <DewButton size="sm" type="ghost" :disabled="repliesLoading" @click="loadMoreReplies">
                    {{ repliesLoading ? '加载中…' : '加载更多回复' }}
                  </DewButton>
                </div>
              </div>
            </DewCard>
          </template>
        </div>
      </el-main>
    </el-container>

    <!-- 图集大图 -->
    <el-image-viewer v-if="viewerVisible" :url-list="images" :initial-index="viewerIndex"
                     teleported @close="viewerVisible = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { ArrowLeft, View, Star, StarFilled, Delete, Grid } from '@element-plus/icons-vue';
import { Menu as Expand } from '@element-plus/icons-vue';
import MenuComponent from '../components/MenuComponent.vue';
import MobileMenuComponent from '../components/MobileMenuComponent.vue';
import { DewCard, DewTag, DewInput, DewButton, DewSkeleton, DewImage, DewMessageBox } from '@bme/dew-ui';
import api from '../api';
import { assetUrl } from '../services/campService';

const route = useRoute();
const router = useRouter();
const store = useStore();

const isDarkMode = computed(() => store.getters.isDarkMode);
const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) isMobileMenuOpen.value = false;
};
const toggleMobileMenu = () => { isMobileMenuOpen.value = !isMobileMenuOpen.value; };

const loading = ref(true);
const thread = ref(null);
const liked = ref(false);
const likeCount = ref(0);

const authorAvatar = computed(() => assetUrl(thread.value?.author_avatar || ''));
const images = computed(() => (thread.value?.images || []).map((u) => assetUrl(u)));
const viewerVisible = ref(false);
const viewerIndex = ref(0);
const openViewer = (i) => { viewerIndex.value = i; viewerVisible.value = true; };

const myAvatar = computed(() => assetUrl(store.state.user?.User_Headshot || ''));
const myName = computed(() => store.state.user?.User_Name || '');

const canDelete = computed(() => {
  if (!thread.value) return false;
  const authorId = Number(thread.value.author_id);
  if (!Number.isNaN(authorId) && authorId === Number(store.state.user?.User_Id)) return true;
  return store.getters.role === 'super_admin';
});

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(date.getTime())) return dateStr;
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}天前`;
  return date.toLocaleDateString('zh-CN');
}

async function loadThread() {
  loading.value = true;
  try {
    const res = await api.get(`/discussions/threads/${route.params.id}`);
    thread.value = res.data?.data || null;
    liked.value = !!thread.value?.liked;
    likeCount.value = thread.value?.like_count || 0;
  } catch (e) {
    thread.value = null;
    if (e.response?.status !== 404) ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
}

const replies = ref([]);
const repliesPage = ref(1);
const repliesTotal = ref(0);
const repliesLoading = ref(false);
const replying = ref(false);
const replyContent = ref('');
const hasMoreReplies = computed(() => replies.value.length < repliesTotal.value);

async function loadReplies(reset = true) {
  if (reset) { repliesPage.value = 1; replies.value = []; }
  repliesLoading.value = true;
  try {
    const res = await api.get(`/discussions/threads/${route.params.id}/replies`, {
      params: { page: repliesPage.value, per_page: 20 },
    });
    const rows = (res.data?.data || []).map((r) => ({
      id: r.id,
      author_id: r.author_id,
      author_name: r.author_name,
      author_avatar: assetUrl(r.author_avatar || ''),
      content: r.content,
      like_count: r.like_count || 0,
      liked: !!r.liked,
      created_at: r.created_at,
    }));
    replies.value = reset ? rows : replies.value.concat(rows);
    repliesTotal.value = res.data?.total ?? replies.value.length;
  } catch { /* 静默空态 */ } finally {
    repliesLoading.value = false;
  }
}
function loadMoreReplies() {
  repliesPage.value += 1;
  loadReplies(false);
}

async function submitReply() {
  if (replying.value || replyContent.value.trim().length < 2) return;
  replying.value = true;
  try {
    const res = await api.post(`/discussions/threads/${route.params.id}/replies`, {
      content: replyContent.value.trim(),
    });
    if (res.data?.code === 201) {
      ElMessage.success('回复成功');
      replyContent.value = '';
      if (thread.value) thread.value.reply_count += 1;
      loadReplies(true);
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '回复失败');
  } finally {
    replying.value = false;
  }
}

async function toggleLike() {
  try {
    const res = await api.post('/discussions/reactions', {
      target_type: 'thread', target_id: thread.value.id, reaction_type: 'like',
    });
    liked.value = res.data?.data?.liked;
    likeCount.value += liked.value ? 1 : -1;
  } catch { /* 静默 */ }
}

async function toggleReplyLike(r) {
  try {
    const res = await api.post('/discussions/reactions', {
      target_type: 'reply', target_id: r.id, reaction_type: 'like',
    });
    r.liked = res.data?.data?.liked;
    r.like_count = (r.like_count || 0) + (r.liked ? 1 : -1);
  } catch { /* 静默 */ }
}

async function handleDelete() {
  try {
    await DewMessageBox.confirm('确定删除这篇帖子？连带回复一起删除，不可恢复。');
  } catch { return; }
  try {
    await api.delete(`/discussions/threads/${thread.value.id}`);
    ElMessage.success('已删除');
    router.push('/community');
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

const goProfile = (id) => { if (id != null) router.push('/profile/' + id); };
// XLAB 项目 chip：新开标签页（详情页原地保留）
const openTab = (path) => window.open(router.resolve(path).href, '_blank', 'noopener');
const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push('/community');
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  loadThread();
  loadReplies(true);
});
onUnmounted(() => window.removeEventListener('resize', checkScreenSize));
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
.t-content { font-size: 15px; line-height: 1.85; color: var(--dew-text-heading, #1f2937); white-space: pre-wrap; }

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
</style>
