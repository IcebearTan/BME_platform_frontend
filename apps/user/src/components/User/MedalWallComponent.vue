<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus'
import { Check, Medal } from '@element-plus/icons-vue'
import api from '../../api';
import { DewCard, DewButton, DewButtonBar } from '../ui'

const currentCategory = ref('');

// 分类切换项（DewButtonBar）
const categories = [
  { value: '', label: '全部' },
  { value: '硬件组', label: '硬件组' },
  { value: '软件组', label: '软件组' },
  { value: '先进制造组', label: '先进制造组' },
  { value: '特殊勋章', label: '特殊勋章' },
]

const medalClass = (getTime) => {
  if (getTime) {
    return 'medal-icon';
  } else {
    return 'medal-icon-unclaimed';
  }
};

const filteredMedals = computed(() => {
  let filtered = currentCategory.value === '' ? medals.value : medals.value.filter(medal => medal.Medal_Tag === currentCategory.value);

  // 排序：已获得的勋章排在前面，未获得的排在后面
  return filtered.sort((a, b) => {
    if (a.Get_Time && !b.Get_Time) {
      return -1;  // a 在前
    } else if (!a.Get_Time && b.Get_Time) {
      return 1;   // b 在前
    }
    return 0;  // 如果都获得或者都未获得，顺序不变
  });
});

const medals = ref([])

const fetchMedals = async () => {
  try {
    const res = await api.get('/medal/user_medal_show');
    console.log(res);
    if (res.data.code === 200) {
      medals.value = res.data.Medal;
    }
    console.log(medals.value);
  } catch (error) {
    console.error('Error fetching medals:', error);
  }
}

const isGetMedal = (getTime) => {
  console.log(getTime);
  if (getTime) {
    return true;
  } else {
    return false;
  }
}

onMounted(() => {
  fetchMedals()
})

// 佩戴勋章，向后端 POST /user/medal_wear，携带 Medal_Id
const wearMedal = async (medal) => {
  try {
    const res = await api.post('/user/medal_wear', { Medal_Id: medal.Medal_Id })
    // 假定后端返回 { code: 200, msg: '...' } 或类似结构
    if (res?.data?.code === 200) {
      ElMessage.success(res.data.msg || '佩戴成功')
      // 可选：刷新勋章列表以确保状态同步
      fetchMedals()
    } else {
      ElMessage.error(res?.data?.msg || '佩戴失败')
    }
  } catch (error) {
    console.error('wearMedal error', error)
    ElMessage.error('请求失败，请稍后重试')
  }
}
</script>

<template>
  <div class="medal-wall-container">
    <!-- 头部区域 -->
    <div class="header">
      <h1 class="title">勋章墙</h1>
      <p class="subtitle">展示您在训练营的成长与收获</p>
    </div>

    <!-- 分类导航（DewButtonBar 分段切换） -->
    <div class="category-nav">
      <DewButtonBar :items="categories" v-model="currentCategory" />
    </div>

    <!-- 勋章网格 -->
    <div class="medals-grid" v-if="filteredMedals.length > 0">
      <DewCard
        v-for="medal in filteredMedals"
        :key="medal.Medal_Id"
        size="md"
        :variant="medal.Get_Time ? 'elevated' : 'inset'"
        :tinted="!!medal.Get_Time"
        :accent="medal.Get_Time ? 'success' : null"
        :class="['medal-card', { 'medal-earned': medal.Get_Time }]"
      >
        <div class="medal-image-wrapper">
          <img
            :src="`/medals/${medal.Medal_Name}.png`"
            :alt="medal.Medal_Name_CN"
            class="medal-image"
          />
          <!-- hover overlay with 佩戴 button: 仅对已获得的勋章显示 -->
          <div class="medal-overlay" v-if="medal.Get_Time">
            <DewButton size="sm" :active="true" @click.stop.prevent="wearMedal(medal)">佩戴</DewButton>
          </div>
          <div v-if="medal.Get_Time" class="earned-badge">
            <el-icon><Check /></el-icon>
          </div>
        </div>
        <div class="medal-details">
          <h3 class="medal-name">{{ medal.Medal_Name_CN }}</h3>
          <p class="medal-status">
            {{ medal.Get_Time ? `获得于 ${medal.Get_Time}` : '尚未获得' }}
          </p>
        </div>
      </DewCard>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-icon class="empty-icon"><Medal /></el-icon>
      <p class="empty-text">还没有勋章</p>
      <p class="empty-hint">等待加速制作专属勋章</p>
    </div>
  </div>
</template>

<style scoped>
.medal-wall-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 32px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 头部区域 */
.header {
  text-align: center;
  margin-bottom: 48px;
}

.title {
  font-size: 40px;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 8px 0;
  letter-spacing: -0.025em;
}

.subtitle {
  font-size: 18px;
  color: #718096;
  margin: 0;
  font-weight: 400;
}

/* 分类导航：DewButtonBar 自带玻璃胶囊 + 弹性滑块，外层只负责居中/窄屏滚动 */
.category-nav {
  display: flex;
  justify-content: safe center;
  margin-bottom: 48px;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-nav::-webkit-scrollbar {
  display: none;
}

/* 勋章网格 */
.medals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 勋章卡片：DewCard 负责玻璃表面（已获得 elevated+success 染色，未获得 inset 凹陷），这里只排版 */
.medal-card {
  text-align: center;
}

/* 勋章图片区域 */
.medal-image-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.medal-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.medal-card:not(.medal-earned) .medal-image {
  opacity: 0.3;
  filter: grayscale(100%);
}

.medal-earned .medal-image {
  box-shadow: 0 8px 20px rgba(66, 153, 225, 0.3);
}

/* hover overlay：高斯模糊 + 居中佩戴按钮 */
.medal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.medal-image-wrapper:hover .medal-overlay {
  opacity: 1;
}

/* 获得标识 */
.earned-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 24px;
  height: 24px;
  background: var(--color-success);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.earned-badge .el-icon {
  font-size: 14px;
}

/* 勋章详情 */
.medal-details {
  margin-top: 16px;
}

.medal-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--dew-text-heading);
  margin: 0 0 8px 0;
}

.medal-status {
  font-size: 14px;
  color: var(--dew-text-muted);
  margin: 0;
}

.medal-earned .medal-status {
  color: var(--color-success);
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 64px 32px;
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 64px;
  color: var(--dew-text-faint);
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 24px;
  font-weight: 600;
  color: var(--dew-text-heading);
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 16px;
  color: var(--dew-text-muted);
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .medal-wall-container {
    padding: 16px;
  }

  .title {
    font-size: 32px;
  }

  .medals-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
}
</style>
