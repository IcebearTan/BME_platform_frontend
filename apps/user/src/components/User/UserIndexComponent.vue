<!-- 使用vue3语法 -->
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import api from '../../api'

import CalendarComponent from './CalendarComponent.vue'
import MedalShowcase from './MedalShowcase.vue'
import ArticleCard from '../Community/ArticleCard.vue'
import { DewCard, DewTag, DewButton, DewMessage, DewMessageBox } from '../ui'

// 可选 userId：查看他人主页时传对方 id；不传（自己的 /user 页）则取自己
const props = defineProps({
  userId: { type: [Number, String], default: null }
})

const User_Info = ref({})
const router = useRouter()
const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

// 技能标签分割为数组，支持多分隔符
const skillTags = computed(() => {
  const tags = User_Info.value.Skill_Tags
  if (!tags || typeof tags !== 'string') return []
  return tags.split(/[,，;；|｜\s]+/).map(tag => tag.trim()).filter(Boolean)
})

// 标签类型分配（DewTag type：primary | success | warning | danger | info | neutral）
const tagTypes = ['primary', 'success', 'info', 'warning', 'danger']
const getTagType = index => tagTypes[index % tagTypes.length]

// 获取用户信息：有 userId 查别人(/user/profile/:id)，否则自己(/user/user_index)
const fetchUserInfo = async () => {
  try {
    const url = props.userId ? `/user/profile/${props.userId}` : '/user/user_index'
    const res = await api({ url, method: 'get' })
    if (res?.data?.code === 200) {
      User_Info.value = res.data
      return res.data
    } else {
      throw new Error(res?.data?.msg || '获取用户信息失败')
    }
  } catch (error) {
    // 只做本地跳转，异常提示交给全局拦截器
    if (error.response && error.response.status === 401) {
      router.push('/login')
    }
    return null
  }
}

// 该用户发布的文章（复用社区 ArticleCard；自己看自己时取登录态 User_Id）
const articles = ref([])
const fetchArticles = async () => {
  const id = props.userId ?? store.state.user?.User_Id
  if (!id) return
  try {
    const res = await api({ url: `/v2/article/by_author/${id}`, method: 'get' })
    if (res?.data?.code === 200) {
      // v2 字段补 authorId 供 ArticleCard 作者点击；reply_count 缺省 0
      articles.value = (res.data.data || []).map(a => ({ ...a, authorId: a.author_id, reply_count: a.reply_count || 0 }))
    }
  } catch {
    articles.value = []
  }
}

// 点文章卡 → 文章详情（与社区广场跳转口径一致）
const goArticle = (article) => {
  router.push({ path: '/article-v2', query: { id: article.id } })
}

// 自己页（/user 无 userId，或传入的即登录用户）才显示编辑/删除
const isSelf = computed(() => !props.userId || Number(props.userId) === store.state.user?.User_Id)

// 编辑 → 文章编辑器（编辑模式）
const goEdit = (article) => {
  router.push({ path: '/article-editor-v2', query: { id: article.id } })
}

// 删除自己的文章（后端按作者本人放行；管理员删全部走 admin 端）
const handleDelete = async (article) => {
  try {
    await DewMessageBox.confirm('删除后不可恢复，确定删除这篇文章吗？', '删除文章')
  } catch {
    return // 用户取消
  }
  try {
    const res = await api({ method: 'post', url: `/v2/article/${article.id}/delete` })
    if (res?.data?.code === 200) {
      DewMessage.success('文章已删除')
      fetchArticles()
    } else {
      DewMessage.error(res?.data?.message || '删除失败')
    }
  } catch (e) {
    DewMessage.error(e?.response?.data?.message || '删除失败')
  }
}

onMounted(async () => {
  await fetchUserInfo()
  await fetchArticles()
})
// 路由切换不同用户时刷新
watch(() => props.userId, async () => {
  await fetchUserInfo()
  await fetchArticles()
})
</script>

<template>
  <div class="profile-layout" :class="{ 'theme-dark': isDarkMode }">
    <!-- 左：个人简介 -->
    <div class="profile-left">
      <DewCard size="lg" divided class="profile-card">
        <template #header><span class="profile-title">个人简介</span></template>
        <div class="profile-intro">{{ User_Info.Introduction || '暂无简介' }}</div>
        <div class="profile-info">
          <div class="profile-info-item">性别：{{ User_Info.User_Sex || '未填写' }}</div>
          <div class="profile-info-item">学校：{{ User_Info.College || '未填写' }}</div>
          <div class="profile-info-item">专业：{{ User_Info.Major || '未填写' }}</div>
          <div class="profile-info-item">入营时间：{{ User_Info.join_time || '未填写' }}</div>
          <div class="profile-info-item">GithubID：{{ User_Info.Github_Id || '未填写' }}</div>
          <div class="profile-info-item profile-skill-tags">
            <div class="profile-skill-title">技能标签：</div>
            <div class="skill-tags-container">
              <DewTag
                v-for="(tag, index) in skillTags"
                :key="index"
                :type="getTagType(index)"
                size="sm"
                round
                class="skill-tag"
              >
                {{ tag }}
              </DewTag>
              <span v-if="skillTags.length === 0" class="no-skill-tag">暂无技能标签</span>
            </div>
          </div>
        </div>
      </DewCard>
    </div>

    <!-- 右：出勤日历 + 勋章展示（自己与他人都显示，按 userId 取数） -->
    <div class="profile-right">
      <div class="right-content">
        <calendar-component :user-id="userId" />
        <medal-showcase :user-id="userId" />
      </div>
    </div>

    <!-- 发布的文章（跨整行；复用社区 ArticleCard） -->
    <section class="profile-articles">
      <h3 class="block-title">发布的文章</h3>
      <ArticleCard
        v-for="a in articles"
        :key="a.id"
        :article="a"
        @open="goArticle"
      >
        <template v-if="isSelf" #actions>
          <DewButton size="sm" type="ghost" @click="goEdit(a)">编辑</DewButton>
          <DewButton size="sm" type="danger" @click="handleDelete(a)">删除</DewButton>
        </template>
      </ArticleCard>
      <div v-if="!articles.length" class="articles-empty">
        {{ userId ? 'TA还没有发布文章' : '你还没有发布文章' }}
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 个人简介卡片：DewCard 负责玻璃表面，这里只排版 */
.profile-card {
  width: 100%;
}

.profile-intro {
  font-size: 14px;
  line-height: 1.7;
  color: var(--dew-text-muted);
  margin-bottom: 14px;
}

.profile-info {
  font-size: 14px;
}

.profile-info-item {
  padding: 10px 0;
  color: var(--dew-text);
}

.profile-skill-title {
  margin-bottom: 8px;
  color: var(--dew-text);
}

.skill-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* DewTag 根元素会接收到 skill-tag 类（父级作用域可命中），加一点 DewUI 弹性悬停 */
.skill-tag {
  transition: transform 0.25s var(--dew-bounce);
}

.skill-tag:hover {
  transform: translateY(-2px);
}

.no-skill-tag {
  font-size: 13px;
  color: var(--dew-text-faint);
}

/* 两栏布局：左个人简介 / 右日历+勋章，20px 间隔 */
.profile-layout {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 20px;
  align-items: start;
}

/* 区块标题与「出勤日历 / 勋章成就」统一：18px / 700 */
.profile-title {
  font-size: 18px;
  font-weight: 700;
}

/* 右侧内容容器 */
.right-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 发布的文章：跨两列整行 */
.profile-articles {
  grid-column: 1 / -1;
}

.block-title {
  font-size: 18px;
  font-weight: 700;
  margin: 4px 0 14px;
  color: var(--dew-text-heading);
}

.articles-empty {
  font-size: 14px;
  color: var(--dew-text-faint);
  text-align: center;
  padding: 28px 0;
}

/* 响应式：窄屏堆叠为单列 */
@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .profile-info-item {
    padding: 8px 0;
  }
}
</style>
