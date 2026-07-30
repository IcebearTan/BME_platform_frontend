<!-- 使用vue3语法 -->
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import api from '../../api'

import CalendarComponent from './CalendarComponent.vue'
import MedalShowcase from './MedalShowcase.vue'
import { DewCard, DewTag } from '../ui'

// 可选 userInfo：父组件（UserProfileView）查到资料后直接传入，则不再自行请求；
// 不传（自己的 /user 页）则照旧请求 /user/user_index
const props = defineProps({
  userInfo: { type: Object, default: null }
})
const isSelf = computed(() => !props.userInfo)

const User_Info = ref({})
const router = useRouter()
const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

// 技能标签分割为数组，支持多分隔符
const skillTags = computed(() => {
  const tags = User_Info.value.Skill_Tags
  if (!tags || typeof tags !== 'string') return []
  return tags.split(/[,，;；|｜\s]+/).map(tag => tag.trim()).filter(Boolean)
})

// 标签类型分配（DewTag type：primary | success | warning | danger | info | neutral）
const tagTypes = ['primary', 'success', 'info', 'warning', 'danger']
const getTagType = index => tagTypes[index % tagTypes.length]

// 获取用户信息，异常处理更健壮
const fetchUserInfo = async () => {
  try {
    const res = await api({ url: '/user/user_index', method: 'get' })
    if (res?.data?.code === 200) {
      User_Info.value = res.data
      return res.data
    } else {
      throw new Error(res?.data?.msg || '获取用户信息失败')
    }
  } catch (error) {
    // 只做本地跳转，异常提示交给全局拦截器
    if (error.response && error.response.status === 401) {
      router.push('/login')
    }
    return null
  }
}

// 父组件传入资料则直接采用；否则自行拉取（自己的主页）
onMounted(async () => {
  if (props.userInfo) {
    User_Info.value = props.userInfo
  } else {
    await fetchUserInfo()
  }
})

// 路由切换不同用户时，父组件传入的 userInfo 变化 → 同步刷新
watch(() => props.userInfo, val => {
  if (val) User_Info.value = val
})
</script>

<template>
  <div class="profile-layout" :class="{ 'theme-dark': isDarkMode, 'profile-layout--single': !isSelf }">
    <!-- 左：个人简介 -->
    <div class="profile-left">
      <DewCard size="lg" divided class="profile-card">
        <template #header><span class="profile-title">个人简介</span></template>
        <div class="profile-intro">{{ User_Info.Introduction || '暂无简介' }}</div>
        <div class="profile-info">
          <div class="profile-info-item">性别：{{ User_Info.User_Sex || '未填写' }}</div>
          <div class="profile-info-item">学校：{{ User_Info.College || '未填写' }}</div>
          <div class="profile-info-item">专业：{{ User_Info.Major || '未填写' }}</div>
          <div class="profile-info-item">入营时间：{{ User_Info.join_time || '未填写' }}</div>
          <div class="profile-info-item">GithubID：{{ User_Info.Github_Id || '未填写' }}</div>
          <div class="profile-info-item profile-skill-tags">
            <div class="profile-skill-title">技能标签：</div>
            <div class="skill-tags-container">
              <DewTag
                v-for="(tag, index) in skillTags"
                :key="index"
                :type="getTagType(index)"
                size="sm"
                round
                class="skill-tag"
              >
                {{ tag }}
              </DewTag>
              <span v-if="skillTags.length === 0" class="no-skill-tag">暂无技能标签</span>
            </div>
          </div>
        </div>
      </DewCard>
    </div>

    <!-- 右：出勤日历 + 勋章展示（仅自己的主页显示） -->
    <div class="profile-right" v-if="isSelf">
      <div class="right-content">
        <calendar-component />
        <medal-showcase />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 个人简介卡片：DewCard 负责玻璃表面，这里只排版 */
.profile-card {
  width: 100%;
}

.profile-intro {
  font-size: 14px;
  line-height: 1.7;
  color: var(--dew-text-muted);
  margin-bottom: 14px;
}

.profile-info {
  font-size: 14px;
}

.profile-info-item {
  padding: 10px 0;
  color: var(--dew-text);
}

.profile-skill-title {
  margin-bottom: 8px;
  color: var(--dew-text);
}

.skill-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* DewTag 根元素会接收到 skill-tag 类（父级作用域可命中），加一点 DewUI 弹性悬停 */
.skill-tag {
  transition: transform 0.25s var(--dew-bounce);
}

.skill-tag:hover {
  transform: translateY(-2px);
}

.no-skill-tag {
  font-size: 13px;
  color: var(--dew-text-faint);
}

/* 两栏布局：左个人简介 / 右日历+勋章，20px 间隔 */
.profile-layout {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 20px;
  align-items: start;
}

/* 他人主页：隐藏右栏后切单列满宽 */
.profile-layout--single {
  grid-template-columns: 1fr;
}

/* 区块标题与「出勤日历 / 勋章成就」统一：18px / 700 */
.profile-title {
  font-size: 18px;
  font-weight: 700;
}

/* 右侧内容容器 */
.right-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 响应式：窄屏堆叠为单列 */
@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .profile-info-item {
    padding: 8px 0;
  }
}
</style>
