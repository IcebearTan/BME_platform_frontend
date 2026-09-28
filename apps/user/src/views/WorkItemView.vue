<script setup>
// 事项详情页（话题/任务同构，§6.2）：顶部=标题/归属组/可见范围/状态/动作区；
// 主体=说明（Markdown）+ 单层回复时间线；操作记录独立区块区分「系统确认发生了什么」。
// 回复按服务器序号游标增量轮询（§7.5 活动页 30s、隐藏页暂停）；打开即推进已读游标。
// 撤权后的历史通知点击 → 404 → 统一「内容不可访问」空态（§10.2 不泄露）。
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import '@bme/editor/md-setup'
import { DewCard, DewTag, DewSkeleton, DewDialog, DewInput } from '@bme/dew-ui'
import { ArrowLeft, Lock } from '@element-plus/icons-vue'
import MenuComponent from '../components/MenuComponent.vue'
import PageFooterComponent from '../components/PageFooterComponent.vue'
import MobileMenuComponent from '../components/MobileMenuComponent.vue'
import WorkReplyComposer from '../components/Work/WorkReplyComposer.vue'
import WorkEventTrail from '../components/Work/WorkEventTrail.vue'
import WorkParticipantDialog from '../components/Work/WorkParticipantDialog.vue'
import WorkTaskPanel from '../components/Work/WorkTaskPanel.vue'
import WorkFileList from '../components/Work/WorkFileList.vue'
import WorkCommandBar from '../components/Work/WorkCommandBar.vue'
import { workService, ITEM_STATUS_LABELS, ITEM_STATUS_TYPE, VISIBILITY_LABELS } from '../services/workService'

const PREVIEW_ID = 'work-item-preview'
const route = useRoute()
const router = useRouter()
const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

const isMobile = ref(window.innerWidth <= 768)
const isMobileMenuOpen = ref(false)
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) isMobileMenuOpen.value = false
}
const toggleMobileMenu = () => { isMobileMenuOpen.value = !isMobileMenuOpen.value }
onMounted(() => window.addEventListener('resize', checkScreenSize))
onUnmounted(() => window.removeEventListener('resize', checkScreenSize))

const itemId = computed(() => Number(route.params.id))

// ── 数据态（三段式） ──
const detail = ref(null)
const replies = ref([])
const loading = ref(true)
const loadFailed = ref(false)
const notAccessible = ref(false)

const inviteVisible = ref(false)
const replyTo = ref(null)
const pendingRequest = ref(null)

// 编辑对话框
const editVisible = ref(false)
const editForm = ref({ title: '', body: '', visibility: 'workspace' })
const editSaving = ref(false)

const allowed = computed(() => detail.value?.allowed_actions || [])
const canReply = computed(() =>
  detail.value && detail.value.status !== 'closed' && detail.value.status !== 'draft')
const responders = computed(() => {
  if (!detail.value) return []
  const list = detail.value.participants.map(p => ({ user_id: p.user_id, username: p.username }))
  if (!list.some(r => r.user_id === detail.value.created_by)) {
    list.unshift({ user_id: detail.value.created_by, username: detail.value.created_by_name })
  }
  return list.filter(r => r.user_id !== store.state.user?.User_Id)
})

async function loadDetail() {
  const res = await workService.fetchItem(itemId.value)
  detail.value = res.data
}

async function loadReplies(afterSeq = 0) {
  const res = await workService.fetchReplies(itemId.value, { after_seq: afterSeq, limit: 50 })
  const data = res.data || {}
  if (afterSeq === 0) {
    replies.value = data.replies || []
  } else if (data.replies?.length) {
    const known = new Set(replies.value.map(r => r.id))
    replies.value.push(...(data.replies || []).filter(r => !known.has(r.id)))
  }
  return data
}

async function loadPendingRequest() {
  try {
    const res = await workService.fetchTodos()
    pendingRequest.value = (res.data?.pending_responses || [])
      .find(r => r.item_id === itemId.value) || null
  } catch { pendingRequest.value = null }
}

async function advanceRead(seq) {
  if (!seq) return
  try {
    await workService.advanceRead(itemId.value, seq)
  } catch { /* 游标推进失败不影响阅读 */ }
}

async function loadAll() {
  loading.value = true
  loadFailed.value = false
  notAccessible.value = false
  try {
    await Promise.allSettled([loadDetail(), loadReplies(0), loadPendingRequest()])
    if (!detail.value) {
      notAccessible.value = true
    } else {
      // 打开即推进已读（到当前最新回复）
      advanceRead(detail.value.last_reply_seq)
    }
  } catch (e) {
    if (e?.response?.status === 404) {
      notAccessible.value = true
    } else {
      loadFailed.value = true
    }
  } finally {
    loading.value = false
  }
}

// ── 增量轮询：活动页 30s，隐藏页暂停（§7.5） ──
let pollTimer = null
function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    if (document.visibilityState !== 'visible' || !detail.value) return
    try {
      const data = await loadReplies(replies.value.length ? replies.value[replies.value.length - 1].seq : 0)
      if (data.last_reply_seq > (detail.value.last_read_seq || 0)) {
        advanceRead(data.last_reply_seq)
        detail.value.last_read_seq = data.last_reply_seq
      }
    } catch { /* 轮询失败静默，下轮重试 */ }
  }, 30000)
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

// ── 动作 ──
// 命令类操作由 WorkCommandBar 统一执行，完成后 refreshAll（重新拉详情+回复）
async function refreshAll() {
  await Promise.allSettled([loadDetail(), loadReplies(0)])
}

function openEdit() {
  editForm.value = {
    title: detail.value.title,
    body: detail.value.body || '',
    visibility: detail.value.visibility,
  }
  editVisible.value = true
}

async function submitEdit() {
  if (editSaving.value) return
  editSaving.value = true
  try {
    await workService.patchItem(itemId.value, {
      title: editForm.value.title.trim(),
      body: editForm.value.body || null,
      visibility: editForm.value.visibility,
      expected_version: detail.value.version,
    })
    ElMessage.success('已更新')
    editVisible.value = false
    await loadDetail()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '更新失败（若提示版本冲突请刷新后重试）')
  } finally {
    editSaving.value = false
  }
}

function onReplySent(reply) {
  replies.value.push({
    id: reply.id, seq: reply.seq,
    author_id: store.state.user?.User_Id,
    author_name: store.state.user?.User_Name,
    body: '',                        // 发送成功后增量拉取真实行（含清洗后内容）
    reply_to_id: replyTo.value?.id || null,
    created_at: '刚刚',
  })
  replyTo.value = null
  pendingRequest.value = null
  loadReplies(replies.value[replies.value.length - 1].seq - 1).then(() => {
    if (detail.value) {
      detail.value.last_reply_seq = Math.max(detail.value.last_reply_seq, reply.seq)
      advanceRead(reply.seq)
    }
  })
}

onMounted(() => {
  loadAll()
  startPolling()
})
onUnmounted(stopPolling)
</script>

<template>
  <div :class="['work-item-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <div v-else class="mobile-header">
          <el-icon class="hamburger-icon" @click="toggleMobileMenu"><ArrowLeft @click.stop="router.back()" /></el-icon>
          <span class="mobile-title">事项详情</span>
          <div style="width: 40px;" />
        </div>
      </el-header>

      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="main-content">
        <div class="content-wrapper">
          <!-- 骨架 -->
          <template v-if="loading">
            <DewSkeleton type="rect" :height="26" :width="260" class="sk-block" />
            <DewCard size="md" class="sk-block"><DewSkeleton type="text" :lines="4" /></DewCard>
            <DewCard size="md"><DewSkeleton type="text" :lines="6" /></DewCard>
          </template>

          <!-- 不可访问（含撤权后的历史通知点击，§10.2） -->
          <DewCard v-else-if="notAccessible" size="md" class="state-card">
            <h3 class="state-title">内容不可访问</h3>
            <p class="state-text">该事项不存在、已被移除，或你当前没有访问权限。</p>
            <el-button size="small" @click="router.push('/work')">返回工作台</el-button>
          </DewCard>

          <!-- 失败态 -->
          <DewCard v-else-if="loadFailed" size="md" class="state-card">
            <p class="state-text">加载失败，请稍后重试</p>
            <el-button size="small" @click="loadAll">重试</el-button>
          </DewCard>

          <template v-else-if="detail">
            <!-- 头部：标题/元信息/动作区 -->
            <DewCard size="md" class="head-card">
              <div class="back-row">
                <el-button text size="small" :icon="ArrowLeft" @click="router.push('/work')">
                  返回工作台
                </el-button>
              </div>
              <div class="title-line">
                <h1 class="item-title">{{ detail.title }}</h1>
                <DewTag :type="ITEM_STATUS_TYPE[detail.status] || 'neutral'" size="sm" round>
                  {{ ITEM_STATUS_LABELS[detail.status] || detail.status }}
                </DewTag>
              </div>
              <div class="meta-line">
                <span>{{ detail.group_name }}</span>
                <span class="meta-visibility">
                  <el-icon :size="12"><Lock /></el-icon>
                  {{ VISIBILITY_LABELS[detail.visibility] || detail.visibility }}
                </span>
                <span>发起：{{ detail.created_by_name }}</span>
                <span>{{ detail.created_at }}</span>
                <span>回复 {{ detail.reply_count }}</span>
              </div>
              <!-- 动作区（allowed_actions 驱动；后端每次仍重新授权 §13） -->
              <div v-if="allowed.length" class="action-line">
                <el-button v-if="allowed.includes('edit')" size="small" @click="openEdit">编辑</el-button>
                <el-button v-if="allowed.includes('invite')" size="small" @click="inviteVisible = true">
                  邀请参与者
                </el-button>
              </div>
              <WorkCommandBar :item-id="itemId" :version="detail.version"
                              :allowed="allowed" :files="detail.files || []"
                              @done="refreshAll" />
              <div v-if="detail.status === 'closed' && detail.closed_reason" class="closed-reason">
                关闭说明：{{ detail.closed_reason }}
              </div>
            </DewCard>

            <!-- 任务属性与提交历史 -->
            <WorkTaskPanel :detail="detail" />

            <!-- 正文 -->
            <DewCard v-if="detail.body" size="md" class="body-card">
              <MdPreview :id="PREVIEW_ID" :model-value="detail.body" :theme="isDarkMode ? 'dark' : 'light'" />
            </DewCard>

            <!-- 附件区（文件属于事项；版本不可覆盖） -->
            <WorkFileList :item-id="itemId" :files="detail.files || []"
                          :can-upload="detail.status !== 'draft'" @changed="loadDetail" />

            <!-- 回复时间线（单层 + 引用） -->
            <DewCard size="md" class="replies-card">
              <div class="replies-title">讨论（{{ replies.filter(r => !r.removed).length }}）</div>
              <div class="reply-list">
                <div v-for="r in replies" :key="r.id" class="reply-row" :class="{ 'reply-row--removed': r.removed }">
                  <div v-if="r.removed" class="reply-removed">该回复已被撤回</div>
                  <template v-else>
                    <div class="reply-head">
                      <span class="reply-author">{{ r.author_name }}</span>
                      <span v-if="r.edited_at" class="reply-edited">已编辑</span>
                      <span class="reply-time">#{{ r.seq }} · {{ r.created_at }}</span>
                      <div class="spacer" />
                      <el-button v-if="canReply && r.author_id !== store.state.user?.User_Id"
                                 text size="small" @click="replyTo = r">引用</el-button>
                    </div>
                    <div v-if="r.reply_to_id" class="reply-quote">
                      引用 #{{ (replies.find(x => x.id === r.reply_to_id) || {}).seq || '?' }}
                    </div>
                    <p class="reply-body">{{ r.body }}</p>
                  </template>
                </div>
                <p v-if="!replies.length" class="reply-empty">还没有回复</p>
              </div>

              <WorkReplyComposer v-if="canReply" :item-id="itemId" :responders="responders"
                                 :reply-to="replyTo" :pending-request="pendingRequest"
                                 @sent="onReplySent" @cancel-quote="replyTo = null" />
              <p v-else-if="detail.status === 'closed'" class="reply-closed-hint">
                话题已关闭，停止普通回复；如需继续讨论请协调员重新打开
              </p>
              <p v-else-if="detail.status === 'draft'" class="reply-closed-hint">
                草稿发布后才能开始讨论
              </p>
            </DewCard>

            <!-- 操作记录（与讨论区分呈现，§6.2） -->
            <WorkEventTrail :item-id="itemId" />
          </template>
        </div>
      </el-main>

      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>

    <WorkParticipantDialog v-model="inviteVisible" :item-id="itemId"
                           :existing="(detail?.participants || []).map(p => p.user_id)"
                           @invited="loadDetail" />

    <DewDialog v-model="editVisible" title="编辑事项" :width="520">
      <el-form label-width="84px">
        <el-form-item label="标题" required>
          <DewInput v-model="editForm.title" maxlength="200" />
        </el-form-item>
        <el-form-item label="可见范围">
          <el-radio-group v-model="editForm.visibility">
            <el-radio v-for="(label, key) in VISIBILITY_LABELS" :key="key" :value="key">{{ label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="正文">
          <el-input v-model="editForm.body" type="textarea" :rows="6" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="submitEdit">保存</el-button>
      </template>
    </DewDialog>
  </div>
</template>

<style scoped>
.work-item-container {
  min-height: 100vh; display: flex; flex-direction: column;
  background-attachment: fixed;
}
.theme-light.work-item-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.20), transparent 55%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
  color: #303133;
}
.theme-dark.work-item-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.16), transparent 60%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
  color: #E5EAF3;
}

.header-container { padding: 0; height: auto; z-index: 100; position: fixed; width: 100%; top: 0; left: 0; }
.main-content { flex: 1; padding: 100px 20px 40px; display: flex; justify-content: center; overflow-x: hidden; }
.page-footer { padding: 0; height: auto; }
.content-wrapper { width: 100%; max-width: 860px; }

.sk-block { margin-bottom: 14px; }

.back-row { margin-bottom: 6px; }
.title-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.item-title { font-size: 20px; font-weight: 700; margin: 0; }
.meta-line {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-top: 8px; font-size: 12.5px; color: var(--el-text-color-secondary);
}
.meta-visibility { display: inline-flex; align-items: center; gap: 3px; }
.action-line { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.closed-reason {
  margin-top: 10px; padding: 8px 12px; border-radius: 8px; font-size: 12.5px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
}

.body-card { margin-top: 14px; }
.replies-card { margin-top: 14px; }
.replies-title { font-size: 14px; font-weight: 600; margin-bottom: 10px; }

.reply-row { padding: 10px 0; border-bottom: 1px dashed var(--el-border-color-lighter); }
.reply-row:last-of-type { border-bottom: none; }
.reply-head { display: flex; align-items: center; gap: 8px; }
.reply-author { font-size: 13px; font-weight: 600; }
.reply-edited { font-size: 11px; color: var(--el-text-color-secondary); }
.reply-time { font-size: 12px; color: var(--el-text-color-secondary); }
.spacer { flex: 1; }
.reply-quote {
  margin: 6px 0; padding: 4px 10px; border-left: 2px solid var(--el-border-color);
  font-size: 12px; color: var(--el-text-color-secondary);
}
.reply-body { margin: 6px 0 0; font-size: 13.5px; line-height: 1.8; white-space: pre-wrap; word-break: break-word; }
.reply-row--removed .reply-removed { font-size: 12.5px; color: var(--el-text-color-secondary); font-style: italic; }
.reply-empty, .reply-closed-hint { font-size: 13px; color: var(--el-text-color-secondary); padding: 8px 0; }

.state-card { max-width: 480px; margin: 40px auto 0; text-align: center; }
.state-title { margin: 0 0 8px; font-size: 17px; font-weight: 600; }
.state-text { margin: 0 0 12px; font-size: 13px; color: var(--el-text-color-secondary); }

.mobile-header {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 8px 14px;
}
.mobile-title { font-size: 15px; font-weight: 600; }
.hamburger-icon { font-size: 20px; cursor: pointer; color: var(--el-text-color-primary); }

@media (max-width: 768px) {
  .main-content { padding: 68px 14px 32px; }
}
</style>
