<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import api from '../api'

import MenuComponent from '../components/MenuComponent.vue'
import PageFooterComponent from '../components/PageFooterComponent.vue'
import UserIndexComponent from '../components/User/UserIndexComponent.vue'
import { DewCard, DewTag, DewButton } from '../components/ui'

const route = useRoute()
const router = useRouter()
const store = useStore()

const isDarkMode = computed(() => store.getters.isDarkMode)
const userId = computed(() => route.params.id)

const DEFAULT_AVATAR = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

const profile = ref(null)
const avatar = ref(DEFAULT_AVATAR)
const loading = ref(true)
const notFound = ref(false)

// 学习统计（接口 data 字段）
const stats = computed(() => profile.value?.data || {})

// 身份标签：按 role 映射
const roleLabel = computed(() => {
  const map = { super_admin: '管理员', teacher: '教师', mentor: '导师', student: '学生' }
  return map[profile.value?.role] || '成员'
})

// 是否在看自己（是则显示「编辑资料」）
const isSelf = computed(() => {
  const me = store.state.user?.User_Id
  return me != null && Number(me) === Number(userId.value)
})

const fetchAvatar = async (id) => {
  try {
    const res = await api({ url: '/user/user_avatars_id', method: 'get', params: { User_Id: id } })
    avatar.value = res.data?.User_Avatar
      ? `data:image/png;base64,${res.data.User_Avatar}`
      : DEFAULT_AVATAR
  } catch {
    avatar.value = DEFAULT_AVATAR
  }
}

const fetchProfile = async (id) => {
  loading.value = true
  notFound.value = false
  profile.value = null
  try {
    const res = await api({ url: `/user/profile/${id}`, method: 'get' })
    if (res?.data?.code === 200) {
      profile.value = res.data
      await fetchAvatar(id)
    } else {
      notFound.value = true
    }
  } catch (err) {
    if (err.response?.status === 401) {
      router.push('/login')
      return
    }
    notFound.value = true
  } finally {
    loading.value = false
  }
}

const goEdit = () => router.push('/user-center/user-info')

onMounted(() => fetchProfile(userId.value))
// 路由 param 变化（点不同用户）→ 重新拉取
watch(userId, val => { if (val) fetchProfile(val) })
</script>

<template>
  <div :class="['user-profile', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container>
      <el-header class="page-header">
        <MenuComponent />
      </el-header>

      <el-main class="page-main">
        <div class="main-container">
          <!-- 加载中 -->
          <div v-if="loading" class="state-box">加载中…</div>

          <!-- 用户不存在 -->
          <div v-else-if="notFound" class="state-box">该用户不存在或无法访问</div>

          <template v-else-if="profile">
            <!-- 头部：头像 + 昵称 + 身份标签 + 入营时间（透明容器，贴在极光底上） -->
            <div class="user-info">
              <div class="avatar-wrapper">
                <el-avatar shape="square" size="large" class="avatar" :src="avatar" alt="avatar" />
              </div>
              <div class="user-details">
                <div class="username-line">
                  <span class="username">{{ profile.User_Name }}</span>
                  <DewTag size="sm" round>{{ roleLabel }}</DewTag>
                  <DewButton v-if="isSelf" size="sm" type="ghost" @click="goEdit">编辑资料</DewButton>
                </div>
                <div class="user-meta">入营时间：{{ profile.join_time || '未填写' }}</div>
              </div>
            </div>

            <!-- 统计行：累计学习时长 / 累计打卡天数 / 本月排名 -->
            <div class="stats-row">
              <DewCard size="md" class="stat-card">
                <div class="stat-value">{{ stats.total_hours ?? 0 }}<span class="stat-unit">h</span></div>
                <div class="stat-label">累计学习时长</div>
              </DewCard>
              <DewCard size="md" class="stat-card">
                <div class="stat-value">{{ stats.total_days ?? 0 }}<span class="stat-unit">天</span></div>
                <div class="stat-label">累计打卡天数</div>
              </DewCard>
              <DewCard size="md" class="stat-card">
                <div class="stat-value">{{ stats.month_rank != null ? '第' + stats.month_rank + '名' : '—' }}</div>
                <div class="stat-label">本月排名</div>
              </DewCard>
            </div>

            <!-- 个人简介（复用资料卡；传入已查到的资料，卡内不再自行请求） -->
            <UserIndexComponent :user-info="profile" />
          </template>
        </div>
      </el-main>

      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<style scoped>
/* 根容器：亮/暗双极光底（对齐 UserIndex 规范） */
.user-profile {
  min-height: 100vh;
  background-attachment: fixed;
  transition: background 0.4s ease;
}

.theme-light.user-profile {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}

.theme-dark.user-profile {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}

.page-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 1px;
  background: transparent;
  border-bottom: 1px solid var(--dew-card-divider);
}

.page-main {
  min-height: 100vh;
  width: 100%;
  background: transparent;
}

.main-container {
  width: 1305px;
  max-width: 100%;
  margin: auto;
  padding: 5px;
}

/* 状态兜底（加载 / 404） */
.state-box {
  text-align: center;
  padding: 80px 0;
  font-size: 15px;
  color: var(--dew-text-muted);
}

/* 头部：透明容器，无卡片效果 */
.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 15px;
  margin-bottom: 18px;
  padding: 20px;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 15px;
}

.user-details {
  position: relative;
  min-width: 0;
}

.username-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.username {
  font-size: 20px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.user-meta {
  font-size: 14px;
  line-height: 1.8;
  color: var(--dew-text-muted);
}

/* 统计行：三张玻璃卡平铺 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 18px;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--dew-text-heading);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.stat-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--dew-text-muted);
  margin-left: 2px;
}

.stat-label {
  margin-top: 6px;
  font-size: 13px;
  color: var(--dew-text-muted);
}

/* 响应式 */
@media (max-width: 1400px) {
  .main-container {
    width: 95%;
  }
}

@media (max-width: 768px) {
  .user-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }

  .avatar {
    width: 80px;
    height: 80px;
  }

  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
