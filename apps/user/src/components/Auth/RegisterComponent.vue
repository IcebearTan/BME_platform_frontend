<template>
  <div class="auth-container" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    <DewCard :glass="true" :divided="true" size="lg" class="auth-card">
      <template #header>
        <div class="auth-header">
          <div class="auth-logo">✦</div>
          <h2 class="auth-title">创建账户</h2>
          <p class="auth-subtitle">加入我们的学习平台，开启知识之旅</p>
        </div>
      </template>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="rules"
        novalidate
        class="auth-form"
        @submit.prevent
      >
        <el-form-item prop="username">
          <DewInput v-model="registerForm.username" placeholder="请输入真实姓名" size="lg" :prefix-icon="User" @blur="registerFormRef?.validateField('username')" />
        </el-form-item>

        <el-form-item prop="email">
          <DewInput v-model="registerForm.email" type="email" placeholder="请输入邮箱地址" size="lg" :prefix-icon="Message" @blur="registerFormRef?.validateField('email')" />
        </el-form-item>

        <el-form-item prop="password">
          <DewInput v-model="registerForm.password" type="password" placeholder="请输入密码" size="lg" :prefix-icon="Lock" @blur="registerFormRef?.validateField('password')" />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <DewInput v-model="registerForm.confirmPassword" type="password" placeholder="请确认密码" size="lg" :prefix-icon="Key" @blur="registerFormRef?.validateField('confirmPassword')" />
        </el-form-item>

        <el-form-item prop="code">
          <div class="code-row">
            <DewInput v-model="registerForm.code" placeholder="请输入验证码" size="lg" :prefix-icon="Timer" class="code-row__input" />
            <DewButton size="lg" :disabled="disable" @click="submitEmail">
              {{ getCode }}
            </DewButton>
          </div>
        </el-form-item>

        <el-form-item>
          <DewButton :block="true" size="lg" :disabled="isLoading" @click="submitForm">
            {{ isLoading ? '创建中...' : '创建账户' }}
          </DewButton>
        </el-form-item>
      </el-form>

      <p class="auth-privacy">注册即表示您同意我们的服务条款和隐私政策</p>

      <div class="auth-actions">
        <DewButton type="ghost" size="sm" @click="$router.push('/login')">
          已有账户？立即登录
        </DewButton>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import api from '../../api'
import md5 from 'js-md5'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { User, Lock, Message, Key, Timer } from '@element-plus/icons-vue'
import DewCard from '../ui/DewCard.vue'
import DewButton from '../ui/DewButton.vue'
import DewInput from '../ui/DewInput.vue'

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  code: '',
})

const registerFormRef = ref(null)
const router = useRouter()
const store = useStore()

const isLoading = ref(false)
const isDarkMode = computed(() => store.state.isDarkMode)

const getCode = ref('获取验证码')
const isGeting = ref(false)
const count = ref(60)
const disable = ref(false)
let timer = null

const rules = reactive({
  username: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 15, message: '姓名长度需要在2-15个字符之间', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (!/^[一-龥]+$/.test(value)) {
          callback(new Error('用户名必须为中文'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: '请输入用户密码', trigger: 'blur' },
    { min: 6, message: '用户密码长度需要至少6个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value === '') {
          callback(new Error('请再次输入密码'))
        } else if (value !== registerForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] },
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'submit' },
  ],
})

const submitEmail = async () => {
  if (!registerFormRef.value) return
  const valid = await registerFormRef.value.validateField('email').catch(() => false)
  if (!valid) return
  try {
    const res = await api({
      url: '/auth/captcha/email',
      method: 'post',
      data: { User_Email: registerForm.email },
    })
    if (res.data.code === 200) {
      localStorage.setItem('token', res.data.token)
      ElMessage.success('验证码已发送到您的邮箱，请查收')
      if (timer) clearInterval(timer)
      count.value = 60
      isGeting.value = true
      disable.value = true
      getCode.value = `${count.value}s后重发`
      timer = setInterval(() => {
        count.value--
        if (count.value < 1) {
          isGeting.value = false
          disable.value = false
          getCode.value = '获取验证码'
          clearInterval(timer)
        } else {
          getCode.value = `${count.value}s后重发`
        }
      }, 1000)
    } else {
      ElMessage.error(res.data.msg || '验证码发送失败')
    }
  } catch (err) {
    ElMessage.error('验证码发送失败')
  }
}

const submitForm = async () => {
  if (!registerFormRef.value) return
  const valid = await registerFormRef.value.validate().catch(() => false)
  if (!valid) return

  isLoading.value = true
  const User_Password = md5(registerForm.password)
  try {
    const res = await api({
      url: '/auth/register',
      method: 'post',
      data: {
        User_Name: registerForm.username,
        User_Password,
        User_Email: registerForm.email,
        User_Captcha: registerForm.code,
      },
    })
    if (res.data.code === 200) {
      localStorage.setItem('token', res.data.token)
      ElMessage.success('注册成功')
      setTimeout(() => router.push('/login'), 500)
    } else {
      ElMessage.error(res.data.msg || '注册失败')
    }
  } catch (err) {
    ElMessage.error('注册失败')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 80px 20px 60px;
}

.auth-card {
  width: 400px;
  max-width: 100%;
  animation: fadeInUp 0.6s ease-out;
}

.auth-header {
  text-align: center;
  padding: 8px 0 4px;
}

.auth-logo {
  font-size: 32px;
  margin-bottom: 16px;
  opacity: 0.6;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
}

.auth-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--dew-text-heading);
  letter-spacing: 0.02em;
}

.auth-subtitle {
  font-size: 13px;
  margin: 0;
  color: var(--dew-text-faint);
}

.auth-form {
  width: 100%;
}

.auth-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.auth-form :deep(.el-form-item__error) {
  font-size: 12px;
  padding-top: 4px;
}

.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-row__input {
  flex: 1;
}

.auth-privacy {
  font-size: 12px;
  margin: 4px 0 20px;
  text-align: center;
  color: var(--dew-text-faint);
  line-height: 1.6;
}

.auth-actions {
  display: flex;
  justify-content: center;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .auth-container {
    padding: 48px 16px 40px;
    align-items: center;
  }

  .auth-card { width: 100%; }
  .auth-title { font-size: 20px; }

  .code-row {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
