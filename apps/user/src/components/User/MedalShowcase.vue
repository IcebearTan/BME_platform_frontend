<template>
  <div class="medal-showcase" :class="{ 'theme-dark': isDarkMode }">
    <div class="medal-header">
      <span class="medal-title">勋章成就</span>
      <span class="medal-count" @click="goToMedalWall" style="cursor: pointer;">
        {{ medalCount }} 枚 →
      </span>
    </div>
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
    <div class="medal-empty" v-else @click="goToMedalWall" style="cursor: pointer;">
      <span>查看全部勋章 -></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import api from '../../api'

const router = useRouter()
const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

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
.medal-showcase {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.medal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.medal-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.medal-count {
  font-size: 14px;
  color: #888;
}

.medal-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: flex-start;
}

.medal-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  cursor: pointer;
  transition: transform 0.25s ease;
  padding: 12px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.medal-item:hover {
  transform: translateY(-6px) scale(1.05);
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}

.medal-icon {
  width: 86px;
  height: 86px;
  border-radius: 50%;
  object-fit: cover;
  background: #eee;
  padding: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.medal-name {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  text-align: center;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.medal-empty {
  text-align: center;
  padding: 30px 0;
  color: #aaa;
  font-size: 14px;
}

/* 暗黑模式 */
.theme-dark .medal-showcase {
  background: rgba(40, 40, 40, 0.9);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.theme-dark .medal-header {
  border-bottom-color: #3a3a3a;
}

.theme-dark .medal-title {
  color: #f5f5f5;
}

.theme-dark .medal-count {
  color: #888;
}

.theme-dark .medal-item {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
}

.theme-dark .medal-item:hover {
  background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
}

.theme-dark .medal-icon {
  background: #1f2937;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.theme-dark .medal-name {
  color: #cbd5e1;
}

.theme-dark .medal-empty {
  color: #666;
}
</style>
