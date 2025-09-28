<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus'
import api from '../../api';

const currentCategory = ref('');

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
    
    <!-- 分类导航 -->
    <div class="category-nav">
      <button 
        class="category-btn" 
        :class="{active: currentCategory === ''}" 
        @click="currentCategory = ''"
      >
        全部
      </button>
      <button 
        class="category-btn" 
        :class="{active: currentCategory === '硬件组'}" 
        @click="currentCategory = '硬件组'"
      >
        硬件组
      </button>
      <button 
        class="category-btn" 
        :class="{active: currentCategory === '软件组'}" 
        @click="currentCategory = '软件组'"
      >
        软件组
      </button>
      <button 
        class="category-btn" 
        :class="{active: currentCategory === '先进制造组'}" 
        @click="currentCategory = '先进制造组'"
      >
        先进制造组
      </button>
      <button 
        class="category-btn" 
        :class="{active: currentCategory === '特殊勋章'}" 
        @click="currentCategory = '特殊勋章'"
      >
        特殊勋章
      </button>
    </div>

    <!-- 勋章网格 -->
    <div class="medals-grid" v-if="filteredMedals.length > 0">
      <div 
        class="medal-card" 
        v-for="medal in filteredMedals" 
        :key="medal.Medal_Id"
        :class="{ 'medal-earned': medal.Get_Time }"
      >
        <div class="medal-image-wrapper">
          <img 
            :src="`/medals/${medal.Medal_Name}.png`" 
            :alt="medal.Medal_Name_CN" 
            class="medal-image"
          />
          <!-- hover overlay with wear button: 仅对已获得的勋章显示 -->
          <div class="medal-overlay" v-if="medal.Get_Time">
            <div class="overlay-inner">
              <button class="wear-btn" @click.stop.prevent="wearMedal(medal)">佩戴</button>
            </div>
          </div>
          <div v-if="medal.Get_Time" class="earned-badge">✓</div>
        </div>
        <div class="medal-details">
          <h3 class="medal-name">{{ medal.Medal_Name_CN }}</h3>
          <p class="medal-status">
            {{ medal.Get_Time ? `获得于 ${medal.Get_Time}` : '尚未获得' }}
          </p>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">🏆</div>
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

/* 分类导航 */
.category-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}

.category-btn {
  padding: 12px 24px;
  border: 2px solid #e2e8f0;
  border-radius: 50px;
  background: white;
  color: #4a5568;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 15px;
}

.category-btn:hover {
  border-color: #4299e1;
  color: #2b6cb0;
  transform: translateY(-1px);
}

.category-btn.active {
  background: #4299e1;
  border-color: #4299e1;
  color: white;
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
}

/* 勋章网格 */
.medals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 勋章卡片 */
.medal-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 1px solid #f7fafc;
}

.medal-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
}

.medal-card.medal-earned {
  border-color: #68d391;
  background: linear-gradient(135deg, #fff 0%, #f0fff4 100%);
}

/* 勋章图片区域 */
.medal-image-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

/* hover overlay: 使用 backdrop-filter 做高斯模糊，并居中按钮 */
.medal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.35);
  border-radius: 50%;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.medal-image-wrapper:hover .medal-overlay {
  opacity: 1;
}

.overlay-inner {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 佩戴按钮样式，和项目整体风格保持一致（蓝色主色、圆角、轻微阴影） */
.wear-btn {
  background: linear-gradient(180deg, #4a90e2 0%, #2b6cb0 100%);
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(43,108,176,0.18);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.wear-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(43,108,176,0.22);
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

/* 获得标识 */
.earned-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 24px;
  height: 24px;
  background: #48bb78;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 勋章详情 */
.medal-details {
  margin-top: 16px;
}

.medal-name {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.medal-status {
  font-size: 14px;
  color: #718096;
  margin: 0;
}

.medal-earned .medal-status {
  color: #38a169;
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
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 24px;
  font-weight: 600;
  color: #4a5568;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 16px;
  color: #718096;
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
  
  .category-nav {
    gap: 4px;
  }
  
  .category-btn {
    padding: 8px 16px;
    font-size: 14px;
  }
}
</style>