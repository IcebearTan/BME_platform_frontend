<template>
  <div :class="['rank-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <div class="title">出勤月榜</div>
    <div class="student-container">
        <div class="single-student-container" v-for="(user, index) in userRanks" :key="index">
            <div :class="{'index': true, 'index-gold': index === 0, 'index-silver': index === 1, 'index-bronze': index === 2}">{{ index + 1 }}</div>
            <div class="block">
                <el-avatar :size="40" :src="userAvatars[index]" />
            </div>
            <div class="username">{{ user.user_name }}</div>
            <div class="progress">
                <div class="label">{{ user.total_hours }} h</div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { defineComponent } from 'vue'
import { reactive, ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import api from '../../api';

// 获取主题状态
const store = useStore();
const isDarkMode = computed(() => store.getters.isDarkMode);

const users = reactive([
    {
        index: 1,
        username: 'Icebear',
        progress: 16,
    },
    {
        index: 2,
        username: 'Icebear2',
        progress: 15,
    },
    {
        index: 3,
        username: 'Icebear3',
        progress: 14,
    },
    {
        index: 4,
        username: 'Icebear4',
        progress: 13,
    },
    {
        index: 5,
        username: 'Icebear5',
        progress: 12,
    },
    {
        index: 6,
        username: 'Icebear6',
        progress: 11,
    },
    {
        index: 7,
        username: 'Icebear7',
        progress: 10,
    },
    {
        index: 8,
        username: 'Icebear8',
        progress: 9,
    }
])

const userRanks = ref([])
const userIds = ref([])
const userAvatars = ref([]) // 用于存储用户头像

const fetchUsersRank = async () => {
    try {
        const response = await api({
            url: '/records_top10',
            method: 'get'
        })
        userRanks.value = response.data
        userIds.value = response.data.map(user => user.user_id)
        await fetchUserAvatars();
    } catch (error) {
        console.log(error)
    }
}
const fetchUserAvatars = async (id) => {
    userAvatars.value = []; // 初始化头像数组
    for (const userId of userIds.value) {
        try {
            const response = await api({
                url: '/user/user_avatars_id',
                method: 'get',
                params: { // 使用 params 传递单个 ID
                    User_Id: userId
                }
            });
            // 假设 API 返回一个包含头像 URL 的对象
            if (response.data.User_Avatar) {
                userAvatars.value.push(`data:image/png;base64,${response.data.User_Avatar}`); // 将头像 URL 添加到数组中
            } else {
                userAvatars.value.push('https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'); // 默认头像
            }
        } catch (error) {
            console.log(`Error fetching avatar for user ${userId}:`, error);
            userAvatars.value.push('https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'); // 出错时使用默认头像或 null
        }
    }
}


onMounted(() => {
    fetchUsersRank();
})
</script>

<style scoped>
.rank-container{
    /* background-color: #ffffff; */
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 1px 12px rgba(136, 136, 136, 0.1);
    width: 100%;
    max-width: 100%; /* 改为100%以适应父容器 */
    margin: 0;
    box-sizing: border-box; /* 确保padding不会增加总宽度 */
    transition: all 0.3s ease;
}

.theme-light .rank-container {
    background-color: #ffffff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.theme-dark .rank-container {
    background-color: #2c2c2c;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}
.title{
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 10px;
  padding-bottom: 15px;
  border-bottom: solid 3px #333;
  width: fit-content;
  transition: all 0.3s ease;
}

.theme-light .title {
  color: #333333;
  border-bottom-color: #333333;
}

.theme-dark .title {
  color: #ffffff;
  border-bottom-color: #ffffff;
}
.single-student-container{
    display: flex;
    align-items: center;
    /* justify-content: space-between; */

    width: 100%;
    margin-top: 20px;
    box-sizing: border-box; /* 确保不会超出父容器 */
}
.block{
    display: flex;
    align-items: center;
    width: 40px;

    margin-left: 20px;
}
.block-instructor{
    display: flex;
    align-items: center;
    width: 50px;

    /* margin-bottom: 20px; */
}
.instructor-container{
    margin-bottom: 20px;

    display: flex;
    align-items: center;
}
.instructor-name{
    font-size: 18px;
    margin-left: 20px;

    color: #333;
}
.instructor-label{
    font-size: 20px;
    font-weight: bold;

    color: #FFD700;
    text-shadow: 0 0 3px #FFD700;

    margin-left: auto;
}
.index{
    font-size: 20px;
    font-weight: bold;
}
.index-gold{
    font-size: 20px;
    font-weight: bold;

    color: #FFD700;
    text-shadow: 0 0 5px #FFD700;
}
.index-silver{
    font-size: 20px;
    font-weight: bold;

    color: #C0C0C0;
    text-shadow: 0 0 5px #C0C0C0;
}
.index-bronze{
    font-size: 20px;
    font-weight: bold;

    color: #CD7F32;
    text-shadow: 0 0 5px #CD7F32;
}
.username{
    font-size: 18px;
    margin-left: 20px;
    transition: color 0.3s ease;
}

.theme-light .username {
    color: #333333;
}

.theme-dark .username {
    color: #ffffff;
}
.progress{
    margin-left: auto;
    width : 80px; /* 减小宽度以适应较窄的右侧栏 */
    display: flex;
    align-items: center;
    flex-shrink: 0; /* 防止被压缩 */
}
.label{
    font-size: 14px; /* 稍微减小字体以节省空间 */
    margin-right: 10px;
    transition: color 0.3s ease;
}

.theme-light .label {
    color: #999999;
}

.theme-dark .label {
    color: #cccccc;
}

/* 添加响应式样式 */
@media (max-width: 1200px) {
    .rank-container {
        padding: 16px;
    }
    
    .username {
        font-size: 16px;
    }
    
    .progress {
        width: 70px;
    }
    
    .label {
        font-size: 13px;
        margin-right: 5px;
    }
}

@media (max-width: 1024px) {
    .rank-container {
        padding: 12px;
    }
    
    .title {
        font-size: 18px;
    }
    
    .username {
        font-size: 15px;
        margin-left: 15px;
    }
    
    .block {
        margin-left: 15px;
    }
    
    .progress {
        width: 60px;
    }
    
    .label {
        font-size: 12px;
    }
    
    .single-student-container {
        margin-top: 15px;
    }
}

@media (max-width: 900px) {
    .rank-container {
        padding: 20px;
        max-width: none;
    }
}
</style>