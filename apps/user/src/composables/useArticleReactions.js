// 文章互动 Composable —— 点赞 / 收藏状态与操作（统一走 discussion reaction 体系）
// 实例级：每篇文章独立一份状态。v1 / v2 文章共用，version 决定 thread 端点。
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api'

export function useArticleReactions(articleIdRef, version = 1) {
  const router = useRouter()
  const threadId = ref(null)
  const likeCount = ref(0)
  const replyCount = ref(0)
  const viewCount = ref(0)
  const isLiked = ref(false)
  const isFavorited = ref(false)

  const isLoggedIn = () => !!localStorage.getItem('token')

  // 由外部（详情接口）回填初始计数：匿名阅读页也能直接显示真实点赞 / 评论 / 浏览权
  const initCounts = (lc = 0, rc = 0, vc = 0) => {
    likeCount.value = lc
    replyCount.value = rc
    viewCount.value = vc
  }

  // 未登录统一拦截：v2 阅读页公开，但互动接口 @jwt_required
  const guard = () => {
    if (!isLoggedIn()) {
      ElMessage.warning('请先登录')
      router.push('/login')
      return false
    }
    return true
  }

  // 获取 / 创建该文章的汇总 thread，顺带拿 reply / like 计数（已登录才调）
  const ensureThread = async () => {
    const scope = version === 2 ? 'article_v2' : 'article'
    const res = await api({ method: 'get', url: `/discussions/${scope}/${articleIdRef.value}/thread` })
    const d = res.data.data
    threadId.value = d.thread_id
    replyCount.value = d.reply_count ?? 0
    likeCount.value = d.like_count ?? 0
  }

  // 当前用户的点赞 / 收藏状态（已登录才查）
  const fetchMe = async () => {
    if (!isLoggedIn() || !threadId.value) return
    try {
      const res = await api({ method: 'get', url: `/discussions/threads/${threadId.value}/reactions/me` })
      isLiked.value = res.data?.data?.liked ?? false
      isFavorited.value = res.data?.data?.bookmarked ?? false
    } catch (e) {
      console.error('[useArticleReactions] fetchMe 失败', e)
    }
  }

  // 记录浏览（复用 discussion GET thread 端点：按用户去重 +1 view_count，并回填最新计数）
  const recordView = async () => {
    if (!isLoggedIn() || !threadId.value) return
    try {
      const res = await api({ method: 'get', url: `/discussions/threads/${threadId.value}` })
      viewCount.value = res.data?.data?.view_count ?? viewCount.value
    } catch (e) {
      console.error('[useArticleReactions] recordView 失败', e)
    }
  }

  // 点赞切换（discussion reactions 接口为切换语义，后端自动维护 thread.like_count）
  const toggleLike = async () => {
    if (!guard() || !threadId.value) return
    isLiked.value = !isLiked.value
    likeCount.value += isLiked.value ? 1 : -1
    try {
      await api({
        method: 'post', url: '/discussions/reactions',
        data: { target_type: 'thread', target_id: threadId.value, reaction_type: 'like' },
      })
    } catch (e) {
      isLiked.value = !isLiked.value
      likeCount.value += isLiked.value ? 1 : -1
      console.error('[useArticleReactions] 点赞失败', e)
      ElMessage.error('操作失败，请稍后重试')
    }
  }

  // 收藏切换（bookmark 不增减任何计数，仅存反应行）
  const toggleFav = async () => {
    if (!guard() || !threadId.value) return
    isFavorited.value = !isFavorited.value
    try {
      await api({
        method: 'post', url: '/discussions/reactions',
        data: { target_type: 'thread', target_id: threadId.value, reaction_type: 'bookmark' },
      })
      ElMessage.success(isFavorited.value ? '已收藏' : '已取消收藏')
    } catch (e) {
      isFavorited.value = !isFavorited.value
      console.error('[useArticleReactions] 收藏失败', e)
      ElMessage.error('操作失败，请稍后重试')
    }
  }

  return {
    threadId, likeCount, replyCount, viewCount, isLiked, isFavorited,
    initCounts, ensureThread, fetchMe, recordView, toggleLike, toggleFav,
  }
}
