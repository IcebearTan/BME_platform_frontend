<script>
import api from '../api';
import md5 from 'js-md5';
import { DewCard, DewInput, DewButton } from '@bme/dew-ui';

export default {
    name: 'RegisterComponent',
    components: { DewCard, DewInput, DewButton },

    data() {
        return {
            registerForm: {
                username: "",
                password: "",
                confirmPassword: "",
                email: "",
                code: ""
            },

            // 验证码倒数模块
            getCode: '获取验证码',
            isGeting: false,
            count: 60,
            disable: false,

            rules: {
                username: [
                    { required: true, message: "请输入用户名", trigger: "blur" },
                    { min: 3, max: 15, message: "用户名长度需要在3-15个字符之间", trigger: "blur" },
                ],
                password: [
                    { required: true, message: "请输入用户密码", trigger: "blur" },
                    { min: 6, message: "用户密码长度需要至少6个字符", trigger: "blur" },
                ],
                confirmPassword: [
                    { required: true, message: '请再次输入密码', trigger: 'blur' },
                    {
                        validator: (rule, value, callback) => {
                            if (value === '') {
                                callback(new Error('请再次输入密码'));
                            } else if (value !== this.registerForm.password) {
                                callback(new Error('两次输入密码不一致!'));
                            } else {
                                callback();
                            }
                        },
                        trigger: 'blur'
                    }
                ],
                email: [
                    { required: true, message: "请输入邮箱", trigger: "blur" },
                    { type: "email", message: "请输入正确的邮箱格式", trigger: ["blur", "change"] },
                ],
                code: [
                    { required: true, message: "请输入验证码", trigger: "submit" }
                ]
            }
        }
    },

    methods: {
        async submitEmail() {
            const valid = await this.$refs.registerFormRef.validateField(['email']).catch(() => false);
            if (!valid) {
                return;
            }

            // 向后端请求验证码发送（后端仅返回 code/message，无 token）
            try {
                const res = await api({
                    url: "/auth/captcha/email",
                    method: "post",
                    data: {
                        User_Email: this.registerForm.email,
                    },
                })
                if (res.data.code != 200) {
                    this.$message.error(res.data.message || '验证码发送失败');
                    return;
                }
            } catch (error) {
                this.$message.error(error.response?.data?.message || '验证码发送失败，请稍后重试');
                return;
            }

            // 发送成功才启动按钮倒数
            const countDown = setInterval(() => {
                if (this.count < 1) {
                    this.isGeting = false
                    this.disable = false
                    this.getCode = '获取验证码'
                    this.count = 60
                    clearInterval(countDown)
                } else {
                    this.isGeting = true
                    this.disable = true
                    this.getCode = this.count-- + 's后重发'
                }
            }, 1000)

            this.$message({
                message: '验证码已发送到您的邮箱，请查收',
                type: 'success'
            });
        },

        async submitForm() {
            const valid = await this.$refs.registerFormRef.validate().catch(() => false);
            if (!valid) {
                return;
            }

            const User_Password = md5(this.registerForm.password)

            // 向后端发送注册信息
            api({
                url: "/auth/register",
                method: "post",
                data: {
                    User_Name: this.registerForm.username,
                    User_Password: User_Password,
                    User_Email: this.registerForm.email,
                    User_Captcha: this.registerForm.code,
                },
            }).then((res) => {
                if (res.data.code == 200) {
                    // 注册成功即跳登录页自行登录，不在注册流程残留登录态 token
                    this.$router.push('/login')

                    this.$message({
                        message: '注册成功',
                        type: 'success'
                    });
                }
                else {
                    this.$message({
                        message: res.data.message,
                        type: 'error'
                    })
                }
            })
        }
    }
};
</script>

<template>
    <DewCard :glass="true" :divided="true" size="lg" class="register-card">
        <template #header>
            <div class="register-header">
                <h2 class="register-title">注册账号</h2>
                <p class="register-subtitle">申请训练营后台管理账号</p>
            </div>
        </template>

        <el-form ref="registerFormRef" :model="registerForm" status-icon :rules="rules" class="register-form"
            label-position="top">
            <el-form-item label="账号" prop="username">
                <DewInput v-model="registerForm.username" type="text" autocomplete="off" placeholder="3-15 个字符" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
                <DewInput v-model="registerForm.password" type="password" autocomplete="off" />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
                <DewInput v-model="registerForm.confirmPassword" type="password" autocomplete="off" />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
                <DewInput v-model="registerForm.email" type="email" autocomplete="off" />
            </el-form-item>
            <el-form-item label="验证码" prop="code">
                <div class="code-row">
                    <DewInput v-model="registerForm.code" type="text" autocomplete="off" />
                    <DewButton type="ghost" :disabled="disable" @click="submitEmail">{{ getCode }}</DewButton>
                </div>
            </el-form-item>
            <el-form-item>
                <DewButton :block="true" size="lg" @click="submitForm">注册</DewButton>
            </el-form-item>
        </el-form>

        <div class="register-actions">
            <DewButton type="ghost" size="sm" @click="$router.push('/login')">已有账户，前去登录</DewButton>
        </div>
    </DewCard>
</template>

<style scoped>
.register-card {
    width: 420px;
    max-width: 100%;
    animation: fadeInUp 0.6s ease-out;
}

.register-header {
    text-align: center;
    padding: 4px 0;
}

.register-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 8px;
    color: var(--dew-text-heading);
    letter-spacing: 0.02em;
}

.register-subtitle {
    font-size: 13px;
    margin: 0;
    color: var(--dew-text-faint);
}

.register-form :deep(.el-form-item) {
    margin-bottom: 18px;
}

.register-form :deep(.el-form-item__label) {
    color: var(--text-secondary);
}

.code-row {
    display: flex;
    gap: 10px;
    width: 100%;
}

.code-row .dew-input {
    flex: 1;
}

.register-actions {
    display: flex;
    justify-content: center;
    margin-top: 4px;
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
