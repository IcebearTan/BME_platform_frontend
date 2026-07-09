<script>
import UserIndexComponent from "../components/User/UserIndexComponent.vue";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import MenuComponent from "../components/MenuComponent.vue";
import api from '../api';
import { RouterLink } from "vue-router";

export default {
    name: 'UserIndex',
    components: {
        UserIndexComponent,
        MenuComponent,
        PageFooterComponent
    },

    data() {
        return {
            username: '',
            user_email: '',
            uid: '',
        }
    },

    created() {
        api({
            url: "/user/user_index",
            method: "get",
        })
        .then((res) => {
            if (res.data.code == 200) {
                this.username = res.data.User_Name
                this.user_email = res.data.User_Email
                this.uid = res.data.User_Id
            }
        })
        .catch((error) => {
            // 只做本地跳转，不再弹窗，401 交给全局拦截器
            if (error.response && error.response.status === 401) {
                this.$router.push('/login')
            }
        })
    }

};
</script>

<script setup>
import { onMounted, ref, computed } from "vue";
import { useStore } from "vuex";
import { DewCard } from "../components/ui";

const store = useStore();

const isDarkMode = computed(() => store.getters.isDarkMode);

const User_Avatar = ref('');

const setUserAvatar = () => {
    if (store.state.avatar) {
        User_Avatar.value = `${store.state.avatar}`
    } else {
        User_Avatar.value = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
    }
}

onMounted(() => {
    setUserAvatar();
})
</script>

<template>
  <div :class="['user-index', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container>
      <el-header class="page-header">
        <MenuComponent />
      </el-header>

      <el-main class="page-main">
        <div class="main-container">
          <!-- 用户信息卡片 -->
          <DewCard size="lg" class="user-info-card">
            <div class="user-info">
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
                <div class="user-email">Email：{{ user_email }}</div>
                <div class="user-uid">#uid：{{ uid }}</div>
              </div>
            </div>
          </DewCard>

          <UserIndexComponent />
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

/* 用户信息卡片 */
.user-info-card {
  margin-top: 15px;
  margin-bottom: 15px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
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
}
</style>
