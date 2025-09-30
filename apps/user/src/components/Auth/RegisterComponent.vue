<script setup>
import { ref, reactive, computed } from 'vue';
import api from '../../api';
import md5 from 'js-md5';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { User, Lock, Message, Key, Timer } from '@element-plus/icons-vue';

// 注册表单数据
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  code: ''
});

const registerFormRef = ref(null);
const router = useRouter();
const store = useStore();

const isLoading = ref(false);
const isDarkMode = computed(() => store.state.isDarkMode);

// 验证码倒数模块
const getCode = ref('获取验证码');
const isGeting = ref(false);
const count = ref(60);
const disable = ref(false);
let timer = null;

// 表单验证规则
const rules = reactive({
  username: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 15, message: '姓名长度需要在2-15个字符之间', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        const isChinese = /^[\u4e00-\u9fa5]+$/.test(value);
        if (!isChinese) {
          callback(new Error('用户名必须为中文'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: '请输入用户密码', trigger: 'blur' },
    { min: 6, message: '用户密码长度需要至少8个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value === '') {
          callback(new Error('请再次输入密码'));
        } else if (value !== registerForm.password) {
          callback(new Error('两次输入密码不一致!'));
        } else {
          callback();
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
    { required: true, message: '请输入验证码', trigger: 'submit' }
  ]
});

// 验证表单（用于获取验证码前的简单校验）
const validateForm = () => {
  if (!registerForm.username) {
    ElMessage.error('请填写用户名');
    return false;
  }
  if (!registerForm.password) {
    ElMessage.error('请填写密码');
    return false;
  }
  if (!registerForm.confirmPassword) {
    ElMessage.error('请再次输入密码');
    return false;
  }
  if (!registerForm.email) {
    ElMessage.error('请填写邮箱');
    return false;
  }
  return true;
};

// 提交验证码
const submitEmail = async () => {
  if (!validateForm()) return;
  try {
    const res = await api({
      url: '/auth/captcha/email',
      method: 'post',
      data: { User_Email: registerForm.email }
    });
    if (res.data.code === 200) {
      localStorage.setItem('token', res.data.token);
      ElMessage.success('验证码已发送到您的邮箱，请查收');
      // 按钮倒数
      if (timer) clearInterval(timer);
      count.value = 60;
      isGeting.value = true;
      disable.value = true;
      getCode.value = `${count.value}s后重发`;
      timer = setInterval(() => {
        count.value--;
        if (count.value < 1) {
          isGeting.value = false;
          disable.value = false;
          getCode.value = '获取验证码';
          clearInterval(timer);
        } else {
          getCode.value = `${count.value}s后重发`;
        }
      }, 1000);
    } else {
      ElMessage.error(res.data.msg || '验证码发送失败');
    }
  } catch (err) {
    ElMessage.error('验证码发送失败');
  }
};

// 提交注册表单
const submitForm = async () => {
  if (!registerFormRef.value) return;
  registerFormRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请检查表单填写');
      return;
    }
    
    isLoading.value = true;
    const User_Password = md5(registerForm.password);
    try {
      const res = await api({
        url: '/auth/register',
        method: 'post',
        data: {
          User_Name: registerForm.username,
          User_Password,
          User_Email: registerForm.email,
          User_Captcha: registerForm.code
        }
      });
      if (res.data.code === 200) {
        localStorage.setItem('token', res.data.token);
        ElMessage.success('注册成功');
        setTimeout(() => {
          router.push('/login');
        }, 500);
      } else {
        ElMessage.error(res.data.msg || '注册失败');
      }
    } catch (err) {
      ElMessage.error('注册失败');
    } finally {
      isLoading.value = false;
    }
  });
};
</script>

<template>
    <div class="register-container" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
        <div class="register-card">
            <div class="card-header">
                <div class="logo-section">
                    <!-- <img class="logo-image" src="../../assets/Logo_NewYear.png" /> -->
                    <h2 class="title">创建账户</h2>
                </div>
                <p class="subtitle">加入我们的学习平台，开启知识之旅</p>
            </div>
            
            <div class="card-content">
                <el-form 
                    ref="registerFormRef" 
                    :model="registerForm" 
                    status-icon 
                    :rules="rules"
                    label-width="auto" 
                    class="register-form">
                    
                    <el-form-item prop="username" class="form-item">
                        <div class="input-wrapper">
                            <el-icon class="input-icon"><User /></el-icon>
                            <el-input 
                                v-model="registerForm.username" 
                                type="text" 
                                autocomplete="off" 
                                placeholder="请输入真实姓名"
                                class="custom-input" 
                                size="large" />
                        </div>
                    </el-form-item>
                    
                    <el-form-item prop="email" class="form-item">
                        <div class="input-wrapper">
                            <el-icon class="input-icon"><Message /></el-icon>
                            <el-input 
                                v-model="registerForm.email" 
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
                                v-model="registerForm.password" 
                                type="password" 
                                autocomplete="off" 
                                show-password
                                placeholder="请输入密码" 
                                class="custom-input"
                                size="large" />
                        </div>
                    </el-form-item>
                    
                    <el-form-item prop="confirmPassword" class="form-item">
                        <div class="input-wrapper">
                            <el-icon class="input-icon"><Key /></el-icon>
                            <el-input 
                                v-model="registerForm.confirmPassword" 
                                type="password" 
                                autocomplete="off" 
                                show-password
                                placeholder="请确认密码" 
                                class="custom-input"
                                size="large" />
                        </div>
                    </el-form-item>
                    
                    <el-form-item prop="code" class="form-item">
                        <div class="verification-wrapper">
                            <div class="input-wrapper code-input">
                                <el-icon class="input-icon"><Timer /></el-icon>
                                <el-input 
                                    v-model="registerForm.code" 
                                    type="text" 
                                    autocomplete="off" 
                                    placeholder="请输入验证码"
                                    class="custom-input" 
                                    size="large" />
                            </div>
                            <el-button 
                                type="primary" 
                                :disabled="disable" 
                                :class="{ 'code-getting': isGeting }"
                                @click="submitEmail" 
                                class="verify-button"
                                size="large">
                                <el-icon v-if="isGeting"><Timer /></el-icon>
                                {{ getCode }}
                            </el-button>
                        </div>
                    </el-form-item>
                    
                    <el-form-item class="form-item">
                        <el-button 
                            type="primary" 
                            @click="submitForm" 
                            class="submit-button"
                            size="large"
                            :loading="isLoading">
                            <span v-if="!isLoading">创建账户</span>
                            <span v-else>创建中...</span>
                        </el-button>
                    </el-form-item>
                </el-form>

                <div class="action-links">
                    <el-link href="/login" class="custom-link">
                        <el-icon><User /></el-icon>
                        已有账户？立即登录
                    </el-link>
                </div>
            </div>
            
            <div class="card-footer">
                <p class="footer-text">注册即表示您同意我们的服务条款和隐私政策</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.register-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: auto;
    padding: 20px;
}

.register-card {
    width: 480px;
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

.register-card::before {
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
.theme-light .register-card {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(255, 255, 255, 0.4);
    color: #333333;
}

/* 主题适配 - 深色模式 */
.theme-dark .register-card {
    background: rgba(44, 62, 80, 0.95);
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
    transform: scale(1.1) rotate(-5deg);
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

.register-form {
    width: 100%;
}

.register-form :deep(.el-form-item) {
    width: 100%;
    margin-bottom: 20px;
}

.form-item {
    margin-bottom: 20px;
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

.custom-input :deep(.el-input) {
    width: 100%;
}

.custom-input :deep(.el-input__wrapper) {
    height: 48px;
    padding-left: 48px;
    border-radius: 14px;
    border: 2px solid transparent;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

.theme-light .custom-input :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.8);
    border-color: rgba(64, 158, 255, 0.1);
}

.theme-dark .custom-input :deep(.el-input__wrapper) {
    background: rgba(45, 55, 72, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
}

.custom-input :deep(.el-input__wrapper):hover {
    border-color: #409eff;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(64, 158, 255, 0.15);
}

.custom-input :deep(.el-input__wrapper.is-focus) {
    border-color: #409eff;
    box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.1);
}

.custom-input:focus-within .input-icon {
    color: #409eff;
    transform: scale(1.1);
}

/* 验证码区域 */
.verification-wrapper {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.code-input {
    flex: 1;
}

.verify-button {
    height: 48px;
    border-radius: 14px;
    font-weight: 500;
    min-width: 120px;
    background: linear-gradient(135deg, #409eff 0%, #7b61ff 100%);
    border: none;
    color: white;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.verify-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(64, 158, 255, 0.3);
}

.verify-button:disabled {
    opacity: 0.6;
    transform: none;
    box-shadow: none;
}

.verify-button.code-getting {
    background: linear-gradient(135deg, #a0a0a0 0%, #808080 100%);
}

/* 提交按钮 */
.submit-button {
    width: 100%;
    height: 52px;
    border-radius: 16px;
    font-size: 16px;
    font-weight: 600;
    background: linear-gradient(135deg, #409eff 0%, #7b61ff 100%);
    border: none;
    box-shadow: 0 8px 20px rgba(64, 158, 255, 0.3);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    margin-top: 8px;
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
    justify-content: center;
    margin-top: 24px;
}

.custom-link {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    text-decoration: none;
    padding: 10px 16px;
    border-radius: 10px;
    transition: all 0.3s ease;
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
    .register-container {
        padding: 16px;
        align-items: center;
    }
    
    .register-card {
        width: 100%;
        padding: 24px;
        border-radius: 20px;
    }
    
    .title {
        font-size: 24px;
    }
    
    .verification-wrapper {
        flex-direction: column;
        gap: 16px;
    }
    
    .verify-button {
        width: 100%;
        min-width: unset;
    }
    
    .form-item {
        margin-bottom: 18px;
    }
    
    .custom-input :deep(.el-input__wrapper) {
        height: 44px;
    }
    
    .verify-button,
    .submit-button {
        height: 44px;
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
</style>
