<template>
  <div class="auth-container" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    <DewCard :glass="true" :divided="true" size="lg" class="auth-card">
      <template #header>
        <div class="auth-header">
          <div class="auth-logo">✦</div>
          <h2 class="auth-title">找回密码</h2>
          <p class="auth-subtitle">请输入您的邮箱和新密码来重置账户密码</p>
        </div>
      </template>

      <el-form
        ref="findPasswordFormRef"
        :model="findPasswordForm"
        :rules="rules"
        novalidate
        class="auth-form"
        @submit.prevent
        @keyup.enter="submitForm()"
      >
        <el-form-item prop="email">
          <DewInput v-model="findPasswordForm.email" type="email" placeholder="请输入邮箱地址" size="lg" :prefix-icon="Message" @blur="findPasswordFormRef?.validateField('email')" />
        </el-form-item>

        <el-form-item prop="password">
          <DewInput v-model="findPasswordForm.password" type="password" placeholder="请输入新密码" size="lg" :prefix-icon="Lock" @blur="findPasswordFormRef?.validateField('password')" />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <DewInput v-model="findPasswordForm.confirmPassword" type="password" placeholder="请再次输入密码" size="lg" :prefix-icon="Key" @blur="findPasswordFormRef?.validateField('confirmPassword')" />
        </el-form-item>

        <el-form-item prop="code">
          <div class="code-row">
            <DewInput v-model="findPasswordForm.code" placeholder="请输入验证码" size="lg" :prefix-icon="Timer" class="code-row__input" />
            <DewButton size="lg" :disabled="disable" @click="submitEmail">
              {{ getCode }}
            </DewButton>
          </div>
        </el-form-item>

        <el-form-item>
          <DewButton :block="true" size="lg" @click="submitForm">
            重置密码
          </DewButton>
        </el-form-item>
      </el-form>

      <div class="auth-actions">
        <DewButton type="ghost" size="sm" @click="$router.push('/login')">
          返回登录
        </DewButton>
        <DewButton type="ghost" size="sm" @click="$router.push('/register')">
          没有账户？立即注册
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
import { Lock, Key, Message, Timer } from '@element-plus/icons-vue'
import DewCard from '../ui/DewCard.vue'
import DewButton from '../ui/DewButton.vue'
import DewInput from '../ui/DewInput.vue'

const router = useRouter()
const store = useStore()

const findPasswordForm = reactive({
  password: '',
  confirmPassword: '',
  email: '',
  code: '',
})

const findPasswordFormRef = ref(null)
const isDarkMode = computed(() => store.state.isDarkMode)

const getCode = ref('获取验证码')
const isGeting = ref(false)
const count = ref(60)
const disable = ref(false)

const rules = reactive({
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度需要至少6个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value === '') {
          callback(new Error('请再次输入密码'))
        } else if (value !== findPasswordForm.password) {
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
  if (!findPasswordFormRef.value) return
  const valid = await findPasswordFormRef.value.validateField('email').catch(() => false)
  if (!valid) return
  try {
    const res = await api({
      url: '/auth/captcha/email',
      method: 'post',
      data: { User_Email: findPasswordForm.email },
    })
    if (res.data.code == 200) {
      localStorage.setItem('token', res.data.token)
    }

    ElMessage.success('验证码已发送到您的邮箱，请查收')

    const countDown = setInterval(() => {
      if (count.value < 1) {
        isGeting.value = false
        disable.value = false
        getCode.value = '获取验证码'
        count.value = 60
        clearInterval(countDown)
      } else {
        isGeting.value = true
        disable.value = true
        getCode.value = count.value-- + 's后重发'
      }
    }, 1000)
  } catch (error) {
    ElMessage.error('验证码发送失败')
  }
}

const submitForm = async () => {
  if (!findPasswordFormRef.value) return
  const valid = await findPasswordFormRef.value.validate().catch(() => false)
  if (!valid) return
  try {
    const User_Password = md5(findPasswordForm.password)
    const res = await api({
      url: '/auth/find_password',
      method: 'post',
      data: {
        Password: User_Password,
        User_Email: findPasswordForm.email,
        Captcha: findPasswordForm.code,
      },
    })
    if (res.data.code == 200) {
      localStorage.setItem('token', res.data.token)
      ElMessage.success('重置密码成功')
      router.push('/login')
    } else {
      ElMessage.error('重置失败，检查验证码')
    }
  } catch (err) {
    ElMessage.error('重置失败')
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

.auth-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
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

  .auth-actions {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
