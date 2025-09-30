<script setup>
import { ref, reactive, computed } from 'vue';
import api from '../../api';
import md5 from 'js-md5';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { Lock, Key, Message, Timer, User, UserFilled } from '@element-plus/icons-vue';

const router = useRouter();
const store = useStore();

// 表单数据
const findPasswordForm = reactive({
    password: '',
    confirmPassword: '',
    email: '',
    code: ''
});

const findPasswordFormRef = ref(null);
const isLoading = ref(false);
const isDarkMode = computed(() => store.state.isDarkMode);

// 验证码倒数模块
const getCode = ref('获取验证码');
const isGeting = ref(false);
const count = ref(60);
const disable = ref(false);


// 表单验证规则
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
                    callback(new Error('请再次输入密码'));
                } else if (value !== findPasswordForm.password) {
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

// 表单验证函数
const validateForm = () => {
    if (!findPasswordForm.password) {
        ElMessage.error('请填写新密码');
        return false;
    }
    if (!findPasswordForm.confirmPassword) {
        ElMessage.error('请再次输入密码');
        return false;
    }
    if (!findPasswordForm.email) {
        ElMessage.error('请填写邮箱');
        return false;
    }
    return true;
};

// 发送验证邮件
const submitEmail = async () => {
    if (!validateForm()) {
        return;
    }

    try {
        // 向后端请求验证码发送
        const res = await api({
            url: "/auth/captcha/email",
            method: "post",
            data: {
                User_Email: findPasswordForm.email,
            },
        });

        if (res.data.code == 200) {
            console.log(res.data.token, 'token')
            // 将数据存入浏览器
            localStorage.setItem("token", res.data.token)
        }

        // 按钮倒数
        var countDown = setInterval(() => {
            if (count.value < 1) {
                isGeting.value = false
                disable.value = false
                getCode.value = '获取验证码'
                count.value = 61
                clearInterval(countDown)
            } else {
                isGeting.value = true
                disable.value = true
                getCode.value = count.value-- + 's后重发'
            }
        }, 1000)

        ElMessage.success('验证码已发送到您的邮箱，请查收');
    } catch (error) {
        console.error('验证码发送失败:', error);
        ElMessage.error('验证码发送失败');
    }
};

// 提交表单
const submitForm = async () => {
    if (!validateForm()) {
        return;
    }

    try {
        const User_Password = md5(findPasswordForm.password)

        // 向后端发送重置密码信息
        const res = await api({
            url: "/auth/find_password",
            method: "post",
            data: {
                Password: User_Password,
                User_Email: findPasswordForm.email,
                Captcha: findPasswordForm.code,
            },
        });

        if (res.data.code == 200) {
            console.log(res.data.token, 'token')
            localStorage.setItem("token", res.data.token)
            ElMessage.success('重置密码成功');
            router.push('/login')
        } else {
            ElMessage.error('重置失败，检查验证码');
        }
    } catch (err) {
        console.error('重置失败:', err);
        ElMessage.error('重置失败');
    }
};
</script>

<template>
    <div class="find-password-container" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
        <div class="find-password-card">
            <div class="card-header">
                <div class="logo-section">
                    <h2 class="title">找回密码</h2>
                </div>
                <p class="subtitle">请输入您的邮箱和新密码来重置您的账户密码</p>
            </div>
            
            <div class="card-content">
                <el-form 
                    ref="formRef" 
                    :model="findPasswordForm" 
                    status-icon 
                    :rules="rules"
                    label-width="auto" 
                    class="find-password-form" 
                    @keyup.enter.native="submitForm()">

                    <el-form-item prop="email" class="form-item">
                        <div class="input-wrapper">
                            <el-icon class="input-icon"><Message /></el-icon>
                            <el-input 
                                v-model="findPasswordForm.email" 
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
                                v-model="findPasswordForm.password" 
                                type="password" 
                                autocomplete="off" 
                                show-password
                                placeholder="请输入新密码" 
                                class="custom-input"
                                size="large" />
                        </div>
                    </el-form-item>

                    <el-form-item prop="confirmPassword" class="form-item">
                        <div class="input-wrapper">
                            <el-icon class="input-icon"><Key /></el-icon>
                            <el-input 
                                v-model="findPasswordForm.confirmPassword" 
                                type="password" 
                                autocomplete="off" 
                                show-password
                                placeholder="请再次输入密码" 
                                class="custom-input"
                                size="large" />
                        </div>
                    </el-form-item>

                    <el-form-item prop="code" class="form-item verification-item">
                        <div class="verification-wrapper">
                            <div class="input-wrapper verification-input">
                                <el-icon class="input-icon"><Timer /></el-icon>
                                <el-input 
                                    v-model="findPasswordForm.code" 
                                    type="text" 
                                    autocomplete="off" 
                                    placeholder="请输入验证码"
                                    class="custom-input" 
                                    size="large" />
                            </div>
                            <el-button 
                                type="primary" 
                                class="verification-btn"
                                :disabled="disable"
                                @click="submitEmail"
                                size="large">
                                {{ getCode }}
                            </el-button>
                        </div>
                    </el-form-item>
                    
                    <el-form-item class="form-item">
                        <el-button 
                            type="primary" 
                            @click="submitForm()" 
                            class="submit-button"
                            size="large"
                            :loading="isLoading">
                            <span v-if="!isLoading">重置密码</span>
                            <span v-else>重置中...</span>
                        </el-button>
                    </el-form-item>
                </el-form>

                <div class="action-links">
                    <el-link href="/login" class="custom-link">
                        <el-icon><User /></el-icon>
                        返回登录
                    </el-link>
                    <el-link href="/register" class="custom-link">
                        <el-icon><UserFilled /></el-icon>
                        没有账户？立即注册
                    </el-link>
                </div>
            </div>
            
            <div class="card-footer">
                <p class="footer-text">重置密码即表示您同意我们的服务条款和隐私政策</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.find-password-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: auto;
    padding: 20px;
}

.find-password-card {
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

.find-password-card::before {
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
.theme-light .find-password-card {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.3);
    color: #333333;
}

/* 主题适配 - 深色模式 */
.theme-dark .find-password-card {
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

.find-password-form {
    width: 100%;
}

.find-password-form :deep(.el-form-item) {
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

/* 验证码特殊样式 */
.verification-item {
    margin-bottom: 24px;
}

.verification-wrapper {
    display: flex;
    gap: 12px;
    align-items: center;
    width: 100%;
}

.verification-input {
    flex: 1;
}

.verification-btn {
    min-width: 120px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, #409eff, #7b61ff);
    border: none;
    color: white;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.verification-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(64, 158, 255, 0.4);
}

.verification-btn:disabled {
    background: #cccccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

/* 提交按钮 */
.submit-button {
    width: 100%;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, #409eff, #7b61ff);
    border: none;
    color: white;
    font-size: 18px;
    font-weight: 700;
    transition: all 0.3s ease;
    box-shadow: 0 8px 20px rgba(64, 158, 255, 0.3);
}

.submit-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(64, 158, 255, 0.4);
}

.submit-button:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.5);
}

/* 操作链接 */
.action-links {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 32px;
}

.custom-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 12px;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

/* 主题适配 - 浅色模式链接 */
.theme-light .custom-link {
    background: rgba(64, 158, 255, 0.05);
    color: #409eff;
    border: 1px solid rgba(64, 158, 255, 0.1);
}

.theme-light .custom-link:hover {
    background: rgba(64, 158, 255, 0.1);
    border-color: rgba(64, 158, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

/* 主题适配 - 深色模式链接 */
.theme-dark .custom-link {
    background: rgba(64, 158, 255, 0.1);
    color: #409eff;
    border: 1px solid rgba(64, 158, 255, 0.2);
}

.theme-dark .custom-link:hover {
    background: rgba(64, 158, 255, 0.2);
    border-color: rgba(64, 158, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* 卡片底部 */
.card-footer {
    text-align: center;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid rgba(64, 158, 255, 0.1);
}

.footer-text {
    font-size: 12px;
    margin: 0;
    opacity: 0.6;
    line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .find-password-container {
        padding: 10px;
    }
    
    .find-password-card {
        width: 100%;
        padding: 24px 20px;
        border-radius: 16px;
    }
    
    .title {
        font-size: 24px;
    }
    
    .subtitle {
        font-size: 12px;
    }
    
    .custom-input :deep(.el-input__wrapper) {
        height: 48px;
        padding-left: 40px;
        border-radius: 12px;
    }
    
    .input-icon {
        left: 12px;
        font-size: 16px;
    }
    
    .submit-button {
        height: 48px;
        font-size: 16px;
        border-radius: 12px;
    }
    
    .verification-btn {
        min-width: 100px;
        height: 48px;
        border-radius: 12px;
        font-size: 12px;
    }
    
    .verification-wrapper {
        flex-direction: column;
        gap: 8px;
    }
    
    .verification-input {
        width: 100%;
    }
    
    .verification-btn {
        width: 100%;
        min-width: auto;
    }
    
    .action-links {
        gap: 12px;
        margin-top: 24px;
    }
    
    .custom-link {
        padding: 10px 12px;
        font-size: 12px;
        border-radius: 8px;
    }
}

/* 错误信息样式 */
.find-password-form :deep(.el-form-item__error) {
    margin-top: 8px;
    font-size: 12px;
    color: #f56c6c;
}

/* 加载状态 */
.submit-button.is-loading {
    pointer-events: none;
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

.find-password-card {
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
