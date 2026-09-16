<script>
import { useStore } from 'vuex';
import api, { session } from '../api';
import md5 from 'js-md5';
import { DewCard, DewInput, DewButton } from '@bme/dew-ui';
import { User, Lock } from '@element-plus/icons-vue';

export default {
    name: 'LoginComponent',
    components: { DewCard, DewInput, DewButton },

    data() {
        return {
            loginForm: {
                password: "",
                email: "",
            },
            isLoading: false,
            rules: {
                password: [
                    { required: true, message: "请输入用户密码", trigger: "blur" },
                    { min: 6, message: "用户密码长度需要至少6个字符", trigger: "blur" },
                ],
                email: [
                    { required: true, message: "请输入邮箱", trigger: "blur" },
                    { type: "email", message: "请输入正确的邮箱格式", trigger: ["blur", "change"] },
                ],
            },
            store: useStore(),
        }
    },

    methods: {
        async submitForm() {
            const valid = await this.$refs.loginFormRef.validate().catch(() => false);
            if (!valid) {
                return;
            }

            this.isLoading = true;
            const User_Password = md5(this.loginForm.password)

            try {
                const res = await api({
                    url: "/auth/admin_login",
                    method: "post",
                    data: {
                        User_Email: this.loginForm.email,
                        User_Password: User_Password
                    },
                });

                if (res.data.code == 200) {
                    // 存 token 对（access + refresh，静默续期用）
                    session.save(res.data)
                    this.store.commit('setUser', res.data)
                    this.$message({
                        message: '登录成功',
                        type: 'success'
                    });
                    this.$router.push('/')
                }
                if (res.data.code == 400) {
                    this.$message.error('密码错误或邮箱不存在');
                }
            } catch (error) {
                const data = error.response?.data;
                let msg = '登录请求失败，请稍后重试';
                if (data) {
                    if (typeof data.message === 'string') {
                        msg = data.message;
                    } else if (data.message && typeof data.message === 'object') {
                        const k = Object.keys(data.message)[0];
                        msg = (data.message[k] && data.message[k][0]) || '账号或密码错误';
                    }
                }
                this.$message.error(msg);
            } finally {
                this.isLoading = false;
            }
        }
    }
};
</script>

<template>
    <div class="login-bg aurora-bg">
        <DewCard :glass="true" :divided="true" size="lg" class="login-card">
            <template #header>
                <div class="login-header">
                    <img class="login-logo" src="../assets/Logo_NewYear.png" />
                    <h2 class="login-title">管理员登录</h2>
                    <p class="login-subtitle">训练营后台管理系统</p>
                </div>
            </template>

            <el-form
                ref="loginFormRef"
                :model="loginForm"
                status-icon
                :rules="rules"
                class="login-form"
                @submit.prevent
                @keyup.enter="submitForm()"
            >
                <el-form-item prop="email">
                    <DewInput
                        v-model="loginForm.email"
                        type="email"
                        placeholder="输入邮箱"
                        size="lg"
                        :prefix-icon="User"
                        @blur="$refs.loginFormRef.validateField('email')"
                    />
                </el-form-item>
                <el-form-item prop="password">
                    <DewInput
                        v-model="loginForm.password"
                        type="password"
                        placeholder="输入密码"
                        size="lg"
                        :prefix-icon="Lock"
                        @blur="$refs.loginFormRef.validateField('password')"
                    />
                </el-form-item>

                <el-form-item>
                    <DewButton :block="true" size="lg" :disabled="isLoading" @click="submitForm()">
                        {{ isLoading ? '登录中...' : '登录' }}
                    </DewButton>
                </el-form-item>
            </el-form>

            <template #footer>
                <p class="login-footer-tip">登录代表着您是大佬，拥有更多的权限</p>
            </template>
        </DewCard>
    </div>
</template>

<style scoped>
.login-bg {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
}

.login-card {
    width: 380px;
    max-width: 100%;
    animation: fadeInUp 0.6s ease-out;
}

.login-header {
    text-align: center;
    padding: 4px 0;
}

.login-logo {
    width: 48px;
    height: 48px;
    object-fit: contain;
    margin-bottom: 12px;
}

.login-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--dew-text-heading);
    letter-spacing: 0.02em;
}

.login-subtitle {
    font-size: 13px;
    margin: 0;
    color: var(--dew-text-faint);
}

.login-form :deep(.el-form-item) {
    margin-bottom: 22px;
}

.login-footer-tip {
    width: 100%;
    text-align: center;
    font-size: 12px;
    color: var(--dew-text-faint);
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
