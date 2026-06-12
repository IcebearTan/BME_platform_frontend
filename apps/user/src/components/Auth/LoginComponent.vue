<template>
  <div class="login-container" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    <DewCard :glass="true" :divided="true" size="lg" class="login-card">
      <template #header>
        <div class="login-header">
          <div class="login-logo">✦</div>
          <h2 class="login-title">登录账户</h2>
          <p class="login-subtitle">欢迎回来，请登录您的账户</p>
        </div>
      </template>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        novalidate
        class="login-form"
        @submit.prevent
        @keyup.enter="submitForm()"
      >
        <el-form-item prop="email">
          <DewInput
            v-model="loginForm.email"
            type="email"
            placeholder="请输入邮箱地址"
            size="lg"
            :prefix-icon="User"
            @blur="loginFormRef?.validateField('email')"
          />
        </el-form-item>

        <el-form-item prop="password">
          <DewInput
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="lg"
            :prefix-icon="Lock"
            @blur="loginFormRef?.validateField('password')"
          />
        </el-form-item>

        <el-form-item>
          <DewButton :block="true" size="lg" :disabled="isLoading" @click="submitForm()">
            {{ isLoading ? '登录中...' : '登录' }}
          </DewButton>
        </el-form-item>
      </el-form>

      <p class="login-privacy">登录即表示您同意我们的服务条款和隐私政策</p>

      <div class="login-actions">
        <DewButton type="ghost" size="sm" @click="router.push('/register')">
          没有账户？立即注册
        </DewButton>
        <DewButton type="ghost" size="sm" @click="router.push('/find_password')">
          忘记密码
        </DewButton>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import api from '../../api'
import md5 from 'js-md5'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import DewCard from '../ui/DewCard.vue'
import DewButton from '../ui/DewButton.vue'
import DewInput from '../ui/DewInput.vue'

const store = useStore()
const router = useRouter()

const loginFormRef = ref(null)

const loginForm = ref({
  email: '',
  password: '',
})

const isLoading = ref(false)
const isDarkMode = computed(() => store.state.isDarkMode)

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] },
  ],
  password: [
    { required: true, message: '请输入用户密码', trigger: 'blur' },
    { min: 6, message: '密码长度需要至少6个字符', trigger: 'blur' },
  ],
}

async function fetchAvatar() {
  try {
    const res = await api({
      url: '/user/user_avatars',
      method: 'get',
    })
    if (res.data.code === 200 && res.data.User_Avatar) {
      store.commit('setAvatar', 'data:image/png;base64,' + res.data.User_Avatar)
    } else {
      store.commit('setAvatar', 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png')
    }
  } catch (e) {
    store.commit('setAvatar', 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png')
  }
}

async function submitForm() {
  if (!loginFormRef.value) return
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  isLoading.value = true
  try {
    const User_Password = md5(loginForm.value.password)
    const res = await api({
      url: '/auth/login',
      method: 'post',
      data: {
        User_Email: loginForm.value.email,
        User_Password,
      },
    })
    if (res.data.code === 200) {
      localStorage.setItem('token', res.data.token)
      store.commit('setUser', res.data)
      await fetchAvatar()
      router.push('/home')
      ElMessage.success('登录成功')
    }
  } catch (err) {
    if (err.status === 402) {
      ElMessage.error('密码错误或邮箱不存在')
    } else {
      ElMessage.error('网络错误或服务器异常')
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 80px 20px 60px;
}

.login-card {
  width: 380px;
  max-width: 100%;
  animation: fadeInUp 0.6s ease-out;
}

.login-header {
  text-align: center;
  padding: 8px 0 4px;
}

.login-logo {
  font-size: 32px;
  margin-bottom: 16px;
  opacity: 0.6;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--dew-text-heading);
  letter-spacing: 0.02em;
}

.login-subtitle {
  font-size: 13px;
  margin: 0;
  color: var(--dew-text-faint);
}

.login-form {
  width: 100%;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 22px;
}

.login-form :deep(.el-form-item__error) {
  font-size: 12px;
  padding-top: 4px;
}

.login-privacy {
  font-size: 12px;
  margin: 4px 0 20px;
  text-align: center;
  color: var(--dew-text-faint);
  line-height: 1.6;
}

.login-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .login-container {
    padding: 48px 16px 40px;
    align-items: center;
  }

  .login-card {
    width: 100%;
  }

  .login-title {
    font-size: 20px;
  }

  .login-actions {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
