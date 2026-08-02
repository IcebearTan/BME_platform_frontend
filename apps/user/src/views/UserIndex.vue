<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import api from '../api'
import { DewSkeleton } from '../components/ui'

import UserIndexComponent from '../components/User/UserIndexComponent.vue'
import PageFooterComponent from '../components/PageFooterComponent.vue'
import MenuComponent from '../components/MenuComponent.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

// /profile/:id 带参 = 看别人；/user 无参 = 自己
const targetId = computed(() => route.params.id || null)
const isOther = computed(() => !!targetId.value)

const DEFAULT_AVATAR = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

const username = ref('')
const user_email = ref('')
const uid = ref('')
const User_Avatar = ref(DEFAULT_AVATAR)
// 遗留的 avatar 点击占位（原 Options 版本既有，保持不动）
const visible = ref(false)
const loading = ref(true)   // 首屏加载态：用户信息骨架占位

// 月度统计（首页同款三项：本月天数 / 本月时长 / 月度排名）
const stats = ref({ days: 0, hours: 0, rank: null })
const applyStats = (d) => {
  stats.value = d
    ? { days: d.total_days || 0, hours: Math.floor(d.month_hours || 0), rank: d.month_rank || null }
    : { days: 0, hours: 0, rank: null }
}

// 取别人头像（base64）
const fetchAvatar = async (id) => {
  try {
    const res = await api({ url: '/user/user_avatars_id', method: 'get', params: { User_Id: id } })
    User_Avatar.value = res.data?.User_Avatar
      ? `data:image/png;base64,${res.data.User_Avatar}`
      : DEFAULT_AVATAR
  } catch {
    User_Avatar.value = DEFAULT_AVATAR
  }
}

const load = async () => {
  applyStats(null)
  if (isOther.value) {
    // 别人：走公开资料接口（不含邮箱）
    try {
      const res = await api({ url: `/user/profile/${targetId.value}`, method: 'get' })
      if (res?.data?.code === 200) {
        username.value = res.data.User_Name || ''
        user_email.value = ''              // 邮箱不对外
        uid.value = res.data.User_Id || ''
        applyStats(res.data.data)          // 月度统计（接口 data 字段）
        await fetchAvatar(targetId.value)
      }
    } catch (error) {
      if (error.response?.status === 401) router.push('/login')
    }
  } else {
    // 自己：原 /user/user_index
    try {
      const res = await api({ url: '/user/user_index', method: 'get' })
      if (res.data.code == 200) {
        username.value = res.data.User_Name
        user_email.value = res.data.User_Email
        uid.value = res.data.User_Id
      }
    } catch (error) {
      // 401 交给全局拦截器，这里只做本地跳转
      if (error.response?.status === 401) router.push('/login')
    }
    // 自己的头像走 store（与原实现一致）
    User_Avatar.value = store.state.avatar || DEFAULT_AVATAR
    // 月度统计：首页同款 /records/my_stats
    try {
      const r = await api({ url: '/records/my_stats', method: 'get' })
      if (r?.data?.code === 200) applyStats(r.data.data)
    } catch { /* 统计非关键，忽略 */ }
  }
  loading.value = false
}

onMounted(load)
// 路由切换（自己↔别人，或不同别人）时重新加载
watch(targetId, load)
</script>

<template>
  <div :class="['user-index', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container>
      <el-header class="page-header">
        <MenuComponent />
      </el-header>

      <el-main class="page-main">
        <div class="main-container">
          <!-- 用户信息（透明容器，无卡片效果） -->
          <!-- 加载中：用户信息骨架 -->
          <div class="user-info" v-if="loading">
            <DewSkeleton variant="rect" width="100" height="100" rounded="15px" />
            <div class="user-details" style="display: flex; flex-direction: column; gap: 8px;">
              <DewSkeleton variant="text" width="140px" height="20px" />
              <DewSkeleton variant="text" width="100px" height="14px" />
            </div>
            <div class="user-stats">
              <div class="stat" v-for="n in 3" :key="n">
                <DewSkeleton variant="text" width="40px" height="20px" />
                <DewSkeleton variant="text" width="64px" height="12px" />
              </div>
            </div>
          </div>
          <div class="user-info" v-else>
            <div class="avatar-wrapper">
              <el-avatar
                @click="visible = !visible"
                shape="square"
                size="large"
                class="avatar"
                :src="User_Avatar"
                alt="image"
              />
            </div>
            <div class="user-details">
              <div class="username">{{ username }}</div>
              <div class="user-email" v-if="user_email">Email：{{ user_email }}</div>
              <div class="user-uid">#uid：{{ uid }}</div>
            </div>

            <!-- 月度统计：本月天数 / 本月时长 / 月度排名（首页同款配色与字体，无卡片） -->
            <div class="user-stats">
              <div class="stat stat--days">
                <div class="stat-value">{{ stats.days }}<span class="stat-unit">d</span></div>
                <div class="stat-label">本月学习天数</div>
              </div>
              <div class="stat stat--hours">
                <div class="stat-value">{{ stats.hours }}<span class="stat-unit">h</span></div>
                <div class="stat-label">本月学习时长</div>
              </div>
              <div class="stat stat--rank">
                <div class="stat-value">#{{ stats.rank || '--' }}</div>
                <div class="stat-label">月度排名</div>
              </div>
            </div>
          </div>

          <UserIndexComponent :user-id="targetId" />
        </div>
      </el-main>

      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>


<style scoped>
/* 根容器：亮/暗双极光底（对齐 HomeView/CommunityView 规范） */
.user-index {
  min-height: 100vh;
  background-attachment: fixed;
  transition: background 0.4s ease;
}

.theme-light.user-index {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}

.theme-dark.user-index {
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

/* 用户信息：透明容器，无卡片效果，直接贴在极光底上 */
.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 15px;
  margin-bottom: 15px;
  padding: 20px;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 15px;
  cursor: pointer;
}

.user-details {
  position: relative;
  min-width: 0;
}

.username {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--dew-text-heading);
}

.user-email,
.user-uid {
  font-size: 14px;
  line-height: 1.8;
  color: var(--dew-text-muted);
}

/* 月度统计（头像右侧，首页同款配色/字体，无卡片） */
.user-stats {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 28px;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.stat-value {
  font-family: var(--dew-font, inherit);
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.stat-unit {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.85;
  margin-left: 1px;
}
.stat-label {
  font-size: 12px;
  color: var(--dew-text-muted);
  white-space: nowrap;
}
.stat--days .stat-value,
.stat--days .stat-unit { color: #3b82f6; }
.stat--hours .stat-value,
.stat--hours .stat-unit { color: #22c55e; }
.stat--rank .stat-value { color: #f59e0b; }

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

  .user-stats {
    margin-left: 0;
    justify-content: center;
    gap: 22px;
  }
}
</style>
