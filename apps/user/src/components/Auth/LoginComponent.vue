<template>
    <div class="login-container" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
        <div class="login-card">
            <div class="card-header">
                <div class="logo-section">
                    <!-- <img class="logo-image" src="../../assets/Logo_NewYear.png" /> -->
                    <h2 class="title">登录账户</h2>
                </div>
                <p class="subtitle">欢迎回来，请登录您的账户</p>
            </div>
            
            <div class="card-content">
                <el-form 
                    ref="loginFormRef" 
                    :model="loginForm" 
                    status-icon 
                    :rules="rules"
                    label-width="auto" 
                    class="login-form" 
                    @keyup.enter.native="submitForm()">

                    <el-form-item prop="email" class="form-item">
                        <div class="input-wrapper">
                            <el-icon class="input-icon"><User /></el-icon>
                            <el-input 
                                v-model="loginForm.email" 
                                type="email" 
                                autocomplete="off" 
                                placeholder="请输入邮箱地址"
                                class="custom-input" 
                                size="large" />
                        </div>
                    </el-form-item>
                    
                    <el-form-item prop="password" class="form-item">
                        <div class="input-wrapper">
                            <el-icon class="input-icon"><Lock /></el-icon>
                            <el-input 
                                v-model="loginForm.password" 
                                type="password" 
                                autocomplete="off" 
                                show-password
                                placeholder="请输入密码" 
                                class="custom-input"
                                size="large" />
                        </div>
                    </el-form-item>
                    
                    <el-form-item class="form-item">
                        <el-button 
                            type="primary" 
                            @click="submitForm()" 
                            class="submit-button"
                            size="large"
                            :loading="isLoading">
                            <span v-if="!isLoading">登录</span>
                            <span v-else>登录中...</span>
                        </el-button>
                    </el-form-item>
                </el-form>

                <div class="action-links">
                    <el-link href="/register" class="custom-link">
                        <el-icon><UserFilled /></el-icon>
                        没有账户？立即注册
                    </el-link>
                    <el-link href="/find_password" class="custom-link">
                        <el-icon><Key /></el-icon>
                        忘记密码
                    </el-link>
                </div>
            </div>
            
            <div class="card-footer">
                <p class="footer-text">登录即表示您同意我们的服务条款和隐私政策</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import api from '../../api'
import md5 from 'js-md5'
import { ElMessage } from 'element-plus'
import { User, Lock, UserFilled, Key } from '@element-plus/icons-vue'

const store = useStore()
const router = useRouter()

const loginForm = ref({
  password: '',
  email: '',
})

const isLoading = ref(false)
const isDarkMode = computed(() => store.state.isDarkMode)

const rules = {
  password: [
    { required: true, message: '请输入用户密码', trigger: 'blur' },
    { min: 6, message: '用户密码长度需要至少8个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] },
  ],
}

function validateForm() {
  if (!loginForm.value.email) {
    ElMessage.error('请填写邮箱')
    return false
  }
  if (!loginForm.value.password) {
    ElMessage.error('请填写密码')
    return false
  }
  return true
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
  if (!validateForm()) return
  
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
    min-height: auto;
    padding: 20px;
}

.login-card {
    width: 420px;
    max-width: 100%;
    padding: 40px;
    border-radius: 24px;
    backdrop-filter: blur(20px);
    border: 1px solid;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.login-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 24px;
    padding: 1px;
    background: linear-gradient(135deg, 
        rgba(64, 158, 255, 0.3) 0%, 
        rgba(123, 97, 255, 0.2) 50%, 
        rgba(255, 107, 129, 0.3) 100%);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    z-index: -1;
}

/* 主题适配 - 浅色模式 */
.theme-light .login-card {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.3);
    color: #333333;
}

/* 主题适配 - 深色模式 */
.theme-dark .login-card {
    background: rgba(26, 32, 44, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
}

/* 卡片头部 */
.card-header {
    text-align: center;
    margin-bottom: 32px;
}

.logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 16px;
}

.logo-image {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    border-radius: 50%;
    box-shadow: 0 8px 16px rgba(64, 158, 255, 0.3);
    transition: transform 0.3s ease;
}

.logo-image:hover {
    transform: scale(1.1) rotate(5deg);
}

.title {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #409eff, #7b61ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.subtitle {
    font-size: 14px;
    margin: 0;
    opacity: 0.7;
}

/* 表单样式 */
.card-content {
    margin-bottom: 24px;
}

.login-form {
    width: 100%;
}

.login-form :deep(.el-form-item) {
    width: 100%;
    margin-bottom: 24px;
}

.form-item {
    margin-bottom: 24px;
    width: 100%;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
}

.input-icon {
    position: absolute;
    left: 16px;
    z-index: 10;
    font-size: 18px;
    opacity: 0.6;
    transition: all 0.3s ease;
}

.custom-input {
    width: 100%;
}

.custom-input :deep(.el-input__wrapper) {
    padding-left: 48px;
    padding-right: 16px;
    border-radius: 16px;
    height: 56px;
    backdrop-filter: blur(10px);
    border: 1px solid transparent;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.custom-input :deep(.el-input__inner) {
    font-size: 16px;
    line-height: 1.5;
    color: inherit;
    background: transparent;
    border: none;
    box-shadow: none;
}

.custom-input :deep(.el-input__inner::placeholder) {
    opacity: 0.6;
}

/* 主题适配 - 浅色模式 */
.theme-light .custom-input :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.8);
    border-color: rgba(64, 158, 255, 0.1);
}

.theme-light .custom-input:hover :deep(.el-input__wrapper) {
    border-color: rgba(64, 158, 255, 0.3);
    background: rgba(255, 255, 255, 0.9);
}

.theme-light .custom-input.is-focus :deep(.el-input__wrapper) {
    border-color: #409eff;
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

/* 主题适配 - 深色模式 */
.theme-dark .custom-input :deep(.el-input__wrapper) {
    background: rgba(45, 55, 72, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .custom-input:hover :deep(.el-input__wrapper) {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(45, 55, 72, 0.9);
}

.theme-dark .custom-input.is-focus :deep(.el-input__wrapper) {
    border-color: #409eff;
    background: rgba(45, 55, 72, 1);
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

/* 提交按钮 */
.submit-button {
    width: 100%;
    height: 56px;
    border-radius: 16px;
    font-size: 16px;
    font-weight: 600;
    background: linear-gradient(135deg, #409eff 0%, #7b61ff 100%);
    border: none;
    box-shadow: 0 8px 20px rgba(64, 158, 255, 0.3);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.submit-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
}

.submit-button:hover::before {
    left: 100%;
}

.submit-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 35px rgba(64, 158, 255, 0.4);
}

.submit-button:active {
    transform: translateY(-1px);
}

/* 链接区域 */
.action-links {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-top: 24px;
    flex-wrap: wrap;
}

.custom-link {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    text-decoration: none;
    padding: 8px 12px;
    border-radius: 8px;
    transition: all 0.3s ease;
    flex: 1;
    justify-content: center;
    min-width: fit-content;
}

.theme-light .custom-link {
    color: #409eff;
    background: rgba(64, 158, 255, 0.05);
}

.theme-dark .custom-link {
    color: #7db3ff;
    background: rgba(64, 158, 255, 0.1);
}

.custom-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(64, 158, 255, 0.2);
}

.theme-light .custom-link:hover {
    background: rgba(64, 158, 255, 0.1);
}

.theme-dark .custom-link:hover {
    background: rgba(64, 158, 255, 0.2);
}

/* 卡片底部 */
.card-footer {
    text-align: center;
    padding-top: 24px;
    border-top: 1px solid;
    margin-top: 24px;
}

.theme-light .card-footer {
    border-color: rgba(64, 158, 255, 0.1);
}

.theme-dark .card-footer {
    border-color: rgba(255, 255, 255, 0.1);
}

.footer-text {
    font-size: 12px;
    margin: 0;
    opacity: 0.6;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .login-container {
        padding: 16px;
        align-items: center;
    }
    
    .login-card {
        width: 100%;
        padding: 24px;
        border-radius: 20px;
    }
    
    .title {
        font-size: 24px;
    }
    
    .action-links {
        flex-direction: column;
        gap: 12px;
    }
    
    .custom-link {
        width: 100%;
        justify-content: center;
    }
}

/* 加载动画 */
@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

.submit-button.is-loading {
    background: linear-gradient(90deg, 
        rgba(64, 158, 255, 0.8) 25%, 
        rgba(64, 158, 255, 1) 50%, 
        rgba(64, 158, 255, 0.8) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
}

/* 动画效果 */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.login-card {
    animation: fadeInUp 0.6s ease-out;
}

/* 解决浏览器自动填充问题 */
.custom-input :deep(.el-input__inner:-webkit-autofill) {
    -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
    background: transparent !important;
    transition: background-color 5000s ease-in-out 0s;
    font-size: 16px !important;
    line-height: 1.5 !important;
}

.custom-input :deep(.el-input__inner:-webkit-autofill:hover) {
    -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
    background: transparent !important;
}

.custom-input :deep(.el-input__inner:-webkit-autofill:focus) {
    -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
    background: transparent !important;
}

/* 自动填充文字颜色 - 主题适配 */
.theme-light .custom-input :deep(.el-input__inner:-webkit-autofill) {
    -webkit-text-fill-color: #333333 !important;
    color: #333333 !important;
}

.theme-dark .custom-input :deep(.el-input__inner:-webkit-autofill) {
    -webkit-text-fill-color: #ffffff !important;
    color: #ffffff !important;
}

.theme-light .custom-input :deep(.el-input__inner:-webkit-autofill:hover) {
    -webkit-text-fill-color: #333333 !important;
    color: #333333 !important;
}

.theme-dark .custom-input :deep(.el-input__inner:-webkit-autofill:hover) {
    -webkit-text-fill-color: #ffffff !important;
    color: #ffffff !important;
}

.theme-light .custom-input :deep(.el-input__inner:-webkit-autofill:focus) {
    -webkit-text-fill-color: #333333 !important;
    color: #333333 !important;
}

.theme-dark .custom-input :deep(.el-input__inner:-webkit-autofill:focus) {
    -webkit-text-fill-color: #ffffff !important;
    color: #ffffff !important;
}
</style>
