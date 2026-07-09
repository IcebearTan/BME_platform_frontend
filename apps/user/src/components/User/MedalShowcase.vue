<template>
  <DewCard size="lg" divided class="medal-showcase">
    <template #header>
      <div class="medal-header">
        <span class="medal-title">勋章成就</span>
        <span class="medal-count" @click="goToMedalWall">{{ medalCount }} 枚 →</span>
      </div>
    </template>

    <div class="medal-list" v-if="medalList.length > 0">
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
    <div class="medal-empty" v-else @click="goToMedalWall">
      <span>查看全部勋章 →</span>
    </div>
  </DewCard>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api'
import { DewCard } from '../ui'

const router = useRouter()

const medalList = ref([])

const medalCount = computed(() => medalList.value.length)

const getMedalImage = (medalName) => {
  if (medalName) return `/medals/${medalName}.png`
  return '/medals/Default.png'
}

const goToMedalWall = () => {
  router.push('/medal')
}

const fetchMedals = async () => {
  try {
    const res = await api.get('/medal/user_medal_show')
    if (res.data && res.data.Medal) {
      // 只显示已获得的勋章
      medalList.value = res.data.Medal.filter(m => m.Get_Time)
    }
  } catch (error) {
    console.error('获取勋章失败:', error)
  }
}

onMounted(() => {
  fetchMedals()
})
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

@media (max-width: 768px) {
  .medal-list {
    gap: 12px;
  }

  .medal-item {
    width: 88px;
  }
}
</style>
