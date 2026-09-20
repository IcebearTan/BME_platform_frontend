<script setup>
/**
 * 我的帖子（个人中心「我的内容」子页，09-20）：管理自己发布的全部 global 讨论帖。
 * - 数据：GET /discussions/threads?scope_type=global&author_id=<me>&status=all（含已隐藏，本人可看）
 * - 操作：查看（新标签页开帖子详情）/ 删除（DewMessageBox 确认）
 * - 话题/关联项目/图集数/互动数一览
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, View } from '@element-plus/icons-vue'
import { DewCard, DewButton, DewMessage, DewMessageBox, DewSkeleton, DewTag } from '@bme/dew-ui'
import api from '../../api'
import { useStore } from 'vuex'

const router = useRouter()
const store = useStore()
const threads = ref([])
const loading = ref(true)

const statusText = { normal: '正常', hidden: '已隐藏', locked: '已锁定', deleted: '已删除' }
const statusTag = { normal: 'success', hidden: 'info', locked: 'warning', deleted: 'danger' }

const load = async () => {
  loading.value = true
  try {
    const uid = Number(store.state.user?.User_Id)
    const res = await api({ method: 'get', url: '/discussions/threads',
      params: { scope_type: 'global', author_id: uid, status: 'all', per_page: 50 } })
    threads.value = res.data?.data || []
  } catch (e) {
    console.error('加载帖子失败', e)
    DewMessage.error('加载帖子失败')
  } finally {
    loading.value = false
  }
}

const fmt = (t) => t
  ? new Date(String(t).replace(' ', 'T')).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  : ''

// 查看帖子：新标签页打开详情页
const viewThread = (t) => {
  const href = router.resolve(`/community/thread/${t.id}`).href
  window.open(href, '_blank', 'noopener')
}

const removeThread = async (t) => {
  try {
    await DewMessageBox.confirm(`确定删除「${t.title}」？连带回复一起删除，不可恢复。`)
  } catch { return }
  try {
    await api({ method: 'delete', url: `/discussions/threads/${t.id}` })
    DewMessage.success('已删除')
    threads.value = threads.value.filter((x) => x.id !== t.id)
  } catch (e) {
    DewMessage.error(e?.response?.data?.message || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="my-threads">
    <div class="page-head">
      <h2 class="page-title">我的帖子</h2>
      <span class="page-sub">发布过的全部社区帖（含已隐藏）</span>
    </div>

    <DewCard v-if="loading" variant="flat" size="lg">
      <div style="display: flex; flex-direction: column; gap: 14px; padding: 6px 0;">
        <DewSkeleton v-for="n in 4" :key="n" variant="text" :lines="2" />
      </div>
    </DewCard>

    <DewCard v-else-if="!threads.length" variant="flat" size="lg">
      <div class="empty">还没有发过帖子，去社区广场发一条吧</div>
    </DewCard>

    <template v-else>
      <DewCard v-for="t in threads" :key="t.id" variant="flat" size="lg" class="thread-row">
        <div class="row-main" @click="viewThread(t)">
          <div class="row-title-line">
            <span class="row-title">{{ t.title }}</span>
            <DewTag :type="statusTag[t.status] || 'info'" size="sm" round>{{ statusText[t.status] || t.status }}</DewTag>
            <DewTag v-if="t.category_text" type="info" size="sm" round>{{ t.category_text }}</DewTag>
          </div>
          <div class="row-meta">
            <span>{{ fmt(t.created_at) }}</span>
            <span>回复 {{ t.reply_count || 0 }}</span>
            <span>赞 {{ t.like_count || 0 }}</span>
            <span>浏览 {{ t.view_count || 0 }}</span>
            <span v-if="t.project_title">关联项目：{{ t.project_title }}</span>
          </div>
        </div>
        <div class="row-ops">
          <DewButton size="sm" type="ghost" @click="viewThread(t)">
            <el-icon><View /></el-icon>查看
          </DewButton>
          <DewButton size="sm" type="ghost" @click="removeThread(t)">
            <el-icon><Delete /></el-icon>删除
          </DewButton>
        </div>
      </DewCard>
    </template>
  </div>
</template>

<style scoped>
.my-threads { display: flex; flex-direction: column; gap: 14px; }
.page-head { display: flex; align-items: baseline; gap: 10px; }
.page-title { margin: 0; font-size: 20px; font-weight: 800; color: var(--dew-text-heading, #222); }
.page-sub { font-size: 12.5px; color: var(--dew-text-faint, #999); }
.empty { text-align: center; padding: 40px 0; color: var(--dew-text-faint, #999); font-size: 13.5px; }

.thread-row :deep(.dew-card__body) {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
}
.row-main { flex: 1; min-width: 0; cursor: pointer; }
.row-title-line { display: flex; align-items: center; gap: 8px; }
.row-title {
  font-size: 15px; font-weight: 600; color: var(--dew-text-heading, #222);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.row-main:hover .row-title { text-decoration: underline; }
.row-meta {
  display: flex; gap: 14px; flex-wrap: wrap; margin-top: 6px;
  font-size: 12px; color: var(--dew-text-faint, #999); font-variant-numeric: tabular-nums;
}
.row-ops { display: flex; gap: 8px; flex-shrink: 0; }
</style>
