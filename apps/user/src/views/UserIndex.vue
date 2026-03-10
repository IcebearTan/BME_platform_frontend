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
import api from "../api";
import { onMounted, ref, computed } from "vue";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";
import { useStore } from "vuex";

const store = useStore();

const router = useRouter();

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
    <div class="common-layout" :class="{ 'theme-dark': isDarkMode }">
        <el-container>
            <el-header
                style="display: flex; justify-content: center; align-items: center; border-bottom: solid 1px #e6e6e6; padding-bottom: 1px; background: transparent; box-shadow: none;" :class="{ 'dark-header': isDarkMode }">
                <MenuComponent />
            </el-header>
            <el-main style="min-height: 100vh; background-color: #f5f7fa; width: 100%;" :class="{ 'dark-main': isDarkMode }">
                <div class="main-container">
                    <div class="user-info" :class="{ 'dark-user-info': isDarkMode }">
                        <div class="avatar-wrapper">
                            <el-avatar @click="visible = !visible" shape="square" size="large" class="avatar"
                                :src="User_Avatar" alt="image" />
                        </div>

                        <div class="user-details">
                            <div class="username">{{ username }}</div>
                            <div class="user-email">Email：{{ user_email }}</div>
                            <div class="user-uid">#uid：{{ uid }}</div>
                        </div>
                    </div>
                    <div>
                        <UserIndexComponent />
                    </div>
                </div>
            </el-main>
            <el-footer class="page-footer">
                <PageFooterComponent />
            </el-footer>
        </el-container>
    </div>
</template>


<style scoped>
.el-menu--horizontal>.el-menu-item:nth-child(1) {
    margin-right: auto;
}

.avatar {
    width: 100px;
    height: 100px;

    border-radius: 15px;
}

.footer {
    font-size: 15px;

    display: flex;
    padding: 10px;
    background-color: #f5f5f5;

    margin: 0;

    width: 100%;

    color: #bababa;
}

/* 主容器响应式 */
.main-container {
    width: 1305px;
    max-width: 100%;
    margin: auto;
    overflow: hidden;
    padding: 5px;
}

/* 用户信息区域 */
.user-info {
    position: relative;
    display: flex;
    margin-top: 15px;
    margin-bottom: 15px;
    padding: 20px;
    background: transparent;
    border-radius: 12px;
}

.avatar-wrapper {
    margin-right: 10px;
}

.user-details {
    margin-left: 10px;
    position: relative;
}

.username {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 5px;
    color: #303133;
}

.user-email {
    font-size: 15px;
    color: #666;
}

.user-uid {
    position: absolute;
    bottom: 5px;
    font-size: 15px;
    color: #666;
}

/* 暗黑模式 */
.dark-header {
    background-color: #1a1a1a;
    border-bottom-color: #3a3a3a !important;
}

.dark-main {
    background-color: #1a1a1a !important;
}

.dark-user-info {
    background: rgba(40, 40, 40, 0.9) !important;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.dark-user-info .username {
    color: #f5f5f5;
}

.dark-user-info .user-email,
.dark-user-info .user-uid {
    color: #a0a0a0;
}

/* 响应式设计 */
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
    }

    .avatar-wrapper {
        margin-right: 0;
        margin-bottom: 15px;
    }

    .user-details {
        margin-left: 0;
    }

    .user-uid {
        position: static;
        margin-top: 5px;
    }

    .avatar {
        width: 80px;
        height: 80px;
    }
}
</style>