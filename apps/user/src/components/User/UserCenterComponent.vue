<!-- 使用vue3语法 -->
<script setup>
import api from '../../api';
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex';
import { Message, User, Calendar } from '@element-plus/icons-vue';
import { DewCard, DewSidebar, DewTag } from '../ui'

const User_Info = ref({})
const User_Avatar = ref('');

const activeIndex = ref('/')
const loading = ref(true)

const router = useRouter()
const route = useRoute()
const store = useStore()

// 左侧导航项（DewSidebar：value 即路由路径，选中后 push 过去）
const navItems = [
  { value: '/user-center/user-info', label: '账户设置', icon: User },
  { value: '/user-center/my-feedbacks', label: '反馈记录', icon: Message },
  { value: '/camp', label: '我的营期', icon: Calendar },
]

const onNavSelect = (value) => {
  router.push(value)
}

const fetchUserInfo = async () => {
  loading.value = true
  try {
    const response = await api({
      url: "/user/user_index",
      method: "get",
    });
    if (response.data.code === 200) {
      User_Info.value = response.data;
    } else {
      ElMessage.error('获取用户信息失败');
    }
  } catch (error) {
    // 只做本地跳转，异常提示交给全局拦截器
    if (error.response && error.response.status === 401) {
      router.push('/login');
    }
  } finally {
    loading.value = false
  }
}

const fetchUserAvatar = async () => {
  try {
    const response = await api({
      url: "/user/user_avatars",
      method: "get",
    });
    if (response.data.code === 200) {
      if (response.data.User_Avatar && response.data.User_Avatar !== null) {
        User_Avatar.value = `data:image/png;base64,${response.data.User_Avatar}`;
      } else {
        User_Avatar.value = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';
      }
    } else {
      User_Avatar.value = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';
      ElMessage.error('获取头像失败');
    }
  } catch (error) {
    User_Avatar.value = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png';
    if (error.response && error.response.status === 401) {
      router.push('/login');
    } else {
      ElMessage.error('UserCenterComponent:用户尚未上传头像或未知的错误');
    }
  }
}

const vertifyUserMode = () => {
  if (store.state.user) {
    if (store.state.user.User_Mode == 'admin') {
      return true
    } else {
      return false
    }
  }
  return false
}

// 计算当前应该高亮的菜单项
const getActiveMenuIndex = (currentPath) => {
  // 处理user-info的子路由
  if (currentPath.startsWith('/user-center/user-info')) {
    return '/user-center/user-info'
  }

  // 处理my-feedbacks的子路由
  if (currentPath.startsWith('/user-center/my-feedbacks')) {
    return '/user-center/my-feedbacks'
  }

  // 营期（我的营期，跳 /camp 独立页）
  if (currentPath.startsWith('/camp')) {
    return '/camp'
  }

  // 其他路由直接返回路径
  return currentPath
}

// 监听路由变化，更新activeIndex
watch(() => route.path, (newPath) => {
  activeIndex.value = getActiveMenuIndex(newPath)
}, { immediate: true })

onMounted(() => {
  fetchUserInfo().then(() => {
    fetchUserAvatar();
  });
  activeIndex.value = getActiveMenuIndex(route.path);
})
</script>

<template>
  <div class="uc-layout">
    <!-- 左：个人资料 + 导航 -->
    <aside class="uc-sidebar">
      <DewCard size="lg" divided class="uc-sidebar-card">
        <template #header>
          <div class="uc-profile">
            <el-avatar
              shape="square"
              :size="72"
              class="uc-avatar"
              :src="User_Avatar"
              alt="image"
            />
            <div class="uc-username">{{ User_Info.User_Name }}</div>
            <DewTag v-if="vertifyUserMode()" type="warning" size="sm" round>导师</DewTag>
            <DewTag v-else type="info" size="sm" round>学生</DewTag>
          </div>
        </template>

        <DewSidebar
          :items="navItems"
          v-model="activeIndex"
          @select="onNavSelect"
        />
      </DewCard>
    </aside>

    <!-- 右：子路由内容 -->
    <section class="uc-content">
      <router-view :User_Info="User_Info"></router-view>
    </section>
  </div>
</template>

<style scoped>
/* 两栏布局：左侧栏 / 右内容，20px 间隔 */
.uc-layout {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 20px;
  align-items: start;
  margin-top: 10px;
}

/* 右内容栅格项：min-width:0 关键 —— 否则 el-table 的列 min-content
   会让该列无限撑宽，把整个页面横向拉长 */
.uc-content {
  min-width: 0;
}

.uc-sidebar-card {
  width: 100%;
}

/* 个人资料（头部）：头像 + 用户名 + 身份标签，居中 */
.uc-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.uc-avatar {
  border-radius: 14px;
}

.uc-username {
  font-size: 17px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

/* DewSidebar 默认透明，直接贴在 DewCard 玻璃面上 */

/* 响应式：窄屏堆叠 */
@media (max-width: 900px) {
  .uc-layout {
    grid-template-columns: 1fr;
  }
}
</style>
