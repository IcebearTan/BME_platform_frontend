<template>
  <DewCard size="lg" divided class="medal-showcase" :class="{ 'is-readonly': !isSelf }">
    <template #header>
      <div class="medal-header">
        <span class="medal-title">勋章成就</span>
        <span v-if="loading" class="medal-count is-static"><DewSkeleton variant="text" width="56px" height="13px" /></span>
        <span v-else-if="isSelf" class="medal-count" @click="goToMedalWall">{{ medalCount }} 枚 →</span>
        <span v-else class="medal-count is-static">{{ medalCount }} 枚</span>
      </div>
    </template>

    <!-- 加载中：勋章骨架（复用 .medal-list 布局） -->
    <div class="medal-list" v-if="loading">
      <div v-for="n in 5" :key="'ms-sk-' + n" class="medal-item" style="cursor: default;">
        <DewSkeleton variant="circle" :size="80" />
        <DewSkeleton variant="text" width="80px" height="13px" style="margin-top: 10px;" />
      </div>
    </div>
    <div class="medal-list" v-else-if="medalList.length > 0">
      <div
        v-for="medal in medalList"
        :key="medal.Medal_Id"
        class="medal-item"
        :title="medal.Medal_Name_CN"
        @click="goToMedalWall"
      >
        <img :src="getMedalImage(medal.Medal_Name)" :alt="medal.Medal_Name_CN" class="medal-icon" />
        <span class="medal-name">{{ medal.Medal_Name_CN }}</span>
      </div>
    </div>
    <div v-else-if="isSelf" class="medal-empty" @click="goToMedalWall">
      <span>查看全部勋章 →</span>
    </div>
    <div v-else class="medal-empty is-static">
      <span>TA还没有获得勋章</span>
    </div>
  </DewCard>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import api from '../../api'
import { DewCard, DewSkeleton } from '../ui'

const router = useRouter()
const store = useStore()

// 可选 userId：查看他人主页时取对方勋章；不传则自己
const props = defineProps({
  userId: { type: [Number, String], default: null }
})

// 是否为自己：无 userId（自己的 /user 页）或传入的即登录用户。
// 勋章墙页（MedalWallComponent）只支持查看自己的勋章，看他人主页时不可点进去
const isSelf = computed(() => !props.userId || Number(props.userId) === store.state.user?.User_Id)

const medalList = ref([])

const loading = ref(true)   // 首屏加载态：勋章骨架占位

const medalCount = computed(() => medalList.value.length)

const getMedalImage = (medalName) => {
  if (medalName) return `/medals/${medalName}.png`
  return '/medals/Default.png'
}

// 仅自己主页可进勋章墙；他人主页为纯展示
const goToMedalWall = () => {
  if (!isSelf.value) return
  router.push('/medal')
}

const fetchMedals = async () => {
  try {
    const res = await api.get('/medal/user_medal_show', { params: props.userId ? { user_id: props.userId } : {} })
    if (res.data && res.data.Medal) {
      // 只显示已获得的勋章
      medalList.value = res.data.Medal.filter(m => m.Get_Time)
    }
  } catch (error) {
    console.error('获取勋章失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMedals()
})
// 路由切换不同用户时刷新
watch(() => props.userId, fetchMedals)
</script>

<style scoped>
/* DewCard 负责玻璃表面与头部，这里只管勋章网格排版 */
.medal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.medal-title {
  font-size: 18px;
  font-weight: 700;
}

.medal-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.medal-count:hover {
  opacity: 0.7;
}

.medal-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

/* 单个勋章卡：inset 玻璃质感（凹陷半透），dew-bounce 悬停上浮 */
.medal-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  padding: 14px 8px;
  border-radius: 16px;
  cursor: pointer;
  background: var(--dew-card-inset-bg);
  border: 1px solid var(--dew-card-inset-border);
  box-shadow: var(--dew-card-inset-shadow);
  transition:
    transform 0.3s var(--dew-bounce),
    background 0.3s var(--dew-bounce),
    border-color 0.3s var(--dew-bounce);
}

.medal-item:hover {
  transform: translateY(-5px) scale(1.04);
  background: var(--dew-card-inset-bg-hover);
  border-color: var(--dew-card-inset-border-hover);
}

.medal-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  padding: 5px;
  background: var(--dew-card-bg);
}

.medal-name {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dew-text-muted);
}

.medal-empty {
  text-align: center;
  padding: 28px 0;
  font-size: 14px;
  cursor: pointer;
  color: var(--dew-text-faint);
  transition: color 0.2s ease;
}

.medal-empty:hover {
  color: var(--dew-text-muted);
}

/* 查看他人主页：勋章区为纯展示，禁用点击态与悬停反馈 */
.is-readonly .medal-count,
.is-readonly .medal-item,
.is-readonly .medal-empty {
  cursor: default;
}

/* 非交互的计数用中性色，不占用强调色 */
.is-readonly .medal-count.is-static {
  color: var(--dew-text-muted);
}

.is-readonly .medal-count:hover,
.is-readonly .medal-empty:hover {
  opacity: 1;
  color: var(--dew-text-faint);
}

.is-readonly .medal-item:hover {
  transform: none;
  background: var(--dew-card-inset-bg);
  border-color: var(--dew-card-inset-border);
}

@media (max-width: 768px) {
  .medal-list {
    gap: 12px;
  }

  .medal-item {
    width: 88px;
  }
}
</style>
