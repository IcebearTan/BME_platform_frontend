<template>
  <DewCard :glass="true" :divided="true" size="lg" class="rank-card">
    <template #header>
      <div class="rank-header">
        <div class="rank-title">出勤月榜</div>
        <span class="rank-month">{{ monthLabel }}</span>
      </div>
    </template>

    <!-- 加载中：榜单骨架 -->
    <div class="rank-list" v-if="loading">
      <div v-for="n in 5" :key="'rk-sk-' + n" class="rank-row">
        <DewSkeleton variant="circle" :size="28" />
        <DewSkeleton variant="circle" :size="38" />
        <DewSkeleton variant="text" width="40%" />
        <DewSkeleton variant="text" width="40px" height="16px" />
      </div>
    </div>
    <div class="rank-list" v-else-if="userRanks.length > 0">
      <div
        v-for="(user, index) in userRanks"
        :key="index"
        class="rank-row"
        :class="{ 'rank-row--clickable': isRealData }"
        @click="openProfile(user.user_id)"
      >
        <div class="rank-no" :class="medalClass(index)">{{ index + 1 }}</div>
        <el-avatar :size="38" :src="user.avatar">{{ (user.user_name || '?').charAt(0) }}</el-avatar>
        <div class="rank-name">{{ user.user_name }}</div>
        <div class="rank-hours">{{ user.total_hours }}<span class="rank-unit">h</span></div>
      </div>
    </div>
    <div v-else class="rank-empty">本月还没有人上榜哦～</div>
  </DewCard>
</template>

<script setup>
import { defineComponent } from 'vue'
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api';
import DewCard from '../ui/DewCard.vue';
import DewSkeleton from '../ui/DewSkeleton.vue';

// 前三名奖牌样式：金 / 银 / 铜
function medalClass(index) {
  if (index === 0) return 'rank-no--gold'
  if (index === 1) return 'rank-no--silver'
  if (index === 2) return 'rank-no--bronze'
  return ''
}

const monthLabel = `${new Date().getMonth() + 1}月`

const router = useRouter()

// 无真实数据时显示空状态（不再用 mock 占位，避免假 id 误导）
const userRanks = ref([])
const isRealData = ref(false)
const loading = ref(true)   // 首屏加载态：榜单骨架

// 点击排行榜用户 → 进入其个人主页
const openProfile = (id) => {
  if (!isRealData.value || id == null) return
  router.push('/profile/' + id)
}

const fetchUsersRank = async () => {
    try {
        const response = await api({
            url: '/records_top10',
            method: 'get'
        })
        if (response.data && response.data.length > 0) {
            userRanks.value = response.data
            isRealData.value = true
        }
        // 后端无数据则保留空状态
    } catch (error) {
        console.log(error)
    } finally {
        loading.value = false
    }
}


onMounted(() => {
    fetchUsersRank();
})
</script>

<style scoped>
.rank-card {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--dew-font, inherit);
}

/* ── 标题区：标题 + 月份徽标 ── */
.rank-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.rank-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: var(--dew-text-heading);
}
.rank-month {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  color: var(--dew-text-muted);
  background: var(--dew-popover-item-hover);
}

/* ── 排行列表 ── */
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 8px;
  border-radius: 10px;
  transition: background 0.25s ease;
}

.rank-row:hover {
  background: var(--dew-popover-item-hover);
}

/* 真实数据行可点进个人主页 */
.rank-row--clickable {
  cursor: pointer;
}

/* 名次徽标：默认淡灰圆，前三名金/银/铜 */
.rank-no {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  color: var(--dew-text-faint);
  background: rgba(127, 127, 127, 0.1);
  font-variant-numeric: tabular-nums;
}
.rank-no--gold {
  color: #d4a017;
  background: rgba(255, 200, 50, 0.2);
}
.rank-no--silver {
  color: #9aa0a8;
  background: rgba(160, 168, 180, 0.22);
}
.rank-no--bronze {
  color: #c0683a;
  background: rgba(205, 127, 50, 0.2);
}

.rank-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--dew-text-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-hours {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--dew-text-heading);
  font-variant-numeric: tabular-nums;
}
.rank-unit {
  font-size: 11px;
  font-weight: 500;
  color: var(--dew-text-muted);
  margin-left: 1px;
}

.rank-empty {
  text-align: center;
  padding: 32px 0;
  font-size: 13px;
  color: var(--dew-text-muted);
}

/* 窄列收紧 */
@media (max-width: 1200px) {
  .rank-row {
    gap: 10px;
    padding: 6px 6px;
  }
  .rank-name {
    font-size: 13px;
  }
  .rank-hours {
    font-size: 14px;
  }
}
</style>
