<script>
import { markRaw } from 'vue';
import { useStore } from 'vuex';
import api, { session } from '../api';
import md5 from 'js-md5';
import { ElMessage } from 'element-plus';
import { DewCard, DewInput, DewButton } from '@bme/dew-ui';
import { User, Lock } from '@element-plus/icons-vue';

export default {
    name: 'LoginComponent',
    components: { DewCard, DewInput, DewButton, User, Lock },

    data() {
        return {
            loginForm: {
                password: "",
                email: "",
            },
            User: markRaw(User),
            Lock: markRaw(Lock),
            isLoading: false,
            // D1 MFA 二步验证态：第一步凭据通过且账号已绑 TOTP 时进入
            mfaRequired: false,
            mfaToken: '',
            mfaCode: '',
            useRecoveryCode: false,
            recoveryCode: '',
            // 开发测试账号面板入口：仅 dev 构建显示（面板本体在独立页 /dev/accounts）
            isDevBuild: import.meta.env.DEV,
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

                if (res.data.code == 200 && res.data.mfa_required) {
                    // 已绑定动态口令：第一步只发 5 分钟票据，进入二步验证
                    this.mfaRequired = true;
                    this.mfaToken = res.data.mfa_token;
                    return;
                }
                if (res.data.code == 200) {
                    // 存 token 对（access + refresh，静默续期用）
                    session.save(res.data)
                    this.store.commit('setUser', res.data)
                    ElMessage({
                        message: '登录成功',
                        type: 'success'
                    });
                    this.$router.push('/')
                }
                if (res.data.code == 400) {
                    ElMessage.error('密码错误或邮箱不存在');
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
                ElMessage.error(msg);
            } finally {
                this.isLoading = false;
            }
        },

        async submitMfa() {
            const payload = { mfa_token: this.mfaToken };
            if (this.useRecoveryCode) {
                if (!this.recoveryCode) return;
                payload.recovery_code = this.recoveryCode;
            } else {
                if (!this.mfaCode) return;
                payload.code = this.mfaCode;
            }
            this.isLoading = true;
            try {
                const res = await api({
                    url: "/auth/admin_login/mfa",
                    method: "post",
                    data: payload,
                });
                if (res.data.code == 200) {
                    session.save(res.data)
                    this.store.commit('setUser', res.data)
                    ElMessage({ message: '登录成功', type: 'success' });
                    this.$router.push('/')
                } else {
                    ElMessage.error(res.data.message || '验证码错误');
                }
            } catch (error) {
                ElMessage.error(error.response?.data?.message || '验证失败，请重试');
            } finally {
                this.isLoading = false;
            }
        },

        backToCredentials() {
            this.mfaRequired = false;
            this.mfaToken = '';
            this.mfaCode = '';
            this.recoveryCode = '';
            this.useRecoveryCode = false;
        },
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

            <el-form v-if="mfaRequired" class="login-form" @submit.prevent @keyup.enter="submitMfa()">
                <p class="mfa-tip">账号已启用动态口令保护，请输入验证器中的 6 位验证码</p>
                <el-form-item v-if="!useRecoveryCode">
                    <DewInput
                        v-model="mfaCode"
                        placeholder="6 位动态验证码"
                        size="lg"
                        maxlength="6"
                        :prefix-icon="Lock"
                    />
                </el-form-item>
                <template v-else>
                    <p class="mfa-tip">输入任意一个未使用的恢复码（一次性，注意保存）</p>
                    <el-form-item>
                        <DewInput
                            v-model="recoveryCode"
                            placeholder="恢复码（8 位）"
                            size="lg"
                            :prefix-icon="Lock"
                        />
                    </el-form-item>
                </template>
                <el-form-item>
                    <DewButton :block="true" size="lg" :disabled="isLoading" @click="submitMfa()">
                        {{ isLoading ? '验证中...' : '验证并登录' }}
                    </DewButton>
                </el-form-item>
                <div class="mfa-alt">
                    <DewButton type="ghost" size="sm" @click="useRecoveryCode = !useRecoveryCode">
                        {{ useRecoveryCode ? '使用动态验证码' : '使用恢复码' }}
                    </DewButton>
                    <DewButton type="ghost" size="sm" @click="backToCredentials">返回重输密码</DewButton>
                </div>
            </el-form>

            <el-form
                v-else
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

            <!-- 开发测试账号面板入口（仅 dev 构建渲染；独立页面承载面板） -->
            <div v-if="isDevBuild" class="dev-entry">
                <DewButton type="ghost" size="sm" @click="$router.push('/dev/accounts')">
                    测试账号面板
                </DewButton>
            </div>

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

.mfa-tip {
    font-size: 13px;
    color: var(--dew-text-faint);
    margin: 0 0 16px;
    line-height: 1.6;
}

.mfa-alt {
    display: flex;
    justify-content: space-between;
    margin-top: -8px;
}

.dev-entry {
    margin: -6px 0 14px;
    text-align: center;
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
