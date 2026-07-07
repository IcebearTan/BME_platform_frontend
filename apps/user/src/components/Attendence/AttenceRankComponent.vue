<template>
  <DewCard :glass="true" :divided="true" size="lg" class="rank-card">
    <template #header>
      <div class="rank-header">
        <div class="rank-title">出勤月榜</div>
        <span class="rank-month">{{ monthLabel }}</span>
      </div>
    </template>

    <div class="rank-list" v-if="userRanks.length > 0">
      <div
        v-for="(user, index) in userRanks"
        :key="index"
        class="rank-row"
      >
        <div class="rank-no" :class="medalClass(index)">{{ index + 1 }}</div>
        <el-avatar :size="38" :src="userAvatars[index]" />
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
import api from '../../api';
import DewCard from '../ui/DewCard.vue';

// 前三名奖牌样式：金 / 银 / 铜
function medalClass(index) {
  if (index === 0) return 'rank-no--gold'
  if (index === 1) return 'rank-no--silver'
  if (index === 2) return 'rank-no--bronze'
  return ''
}

const DEFAULT_AVATAR = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

// Mock 数据：后端 /records_top10 无数据或未启动时展示，有真实数据则覆盖
const mockRanks = [
  { user_id: 1, user_name: '陈思远', total_hours: 47 },
  { user_id: 2, user_name: '林晓彤', total_hours: 42 },
  { user_id: 3, user_name: '王浩然', total_hours: 38 },
  { user_id: 4, user_name: '张雨琪', total_hours: 33 },
  { user_id: 5, user_name: '刘子轩', total_hours: 29 },
  { user_id: 6, user_name: '赵欣怡', total_hours: 25 },
  { user_id: 7, user_name: '黄俊杰', total_hours: 21 },
  { user_id: 8, user_name: '周梦瑶', total_hours: 18 },
]

const monthLabel = `${new Date().getMonth() + 1}月`

const userRanks = ref(mockRanks)
const userIds = ref([])
const userAvatars = ref(mockRanks.map(() => DEFAULT_AVATAR))

const fetchUsersRank = async () => {
    try {
        const response = await api({
            url: '/records_top10',
            method: 'get'
        })
        if (response.data && response.data.length > 0) {
            userRanks.value = response.data
            userIds.value = response.data.map(user => user.user_id)
            await fetchUserAvatars();
        }
        // 后端无数据则保留 mock
    } catch (error) {
        console.log(error)
    }
}
const fetchUserAvatars = async () => {
    userAvatars.value = []; // 初始化头像数组
    for (const userId of userIds.value) {
        try {
            const response = await api({
                url: '/user/user_avatars_id',
                method: 'get',
                params: {
                    User_Id: userId
                }
            });
            if (response.data.User_Avatar) {
                userAvatars.value.push(`data:image/png;base64,${response.data.User_Avatar}`);
            } else {
                userAvatars.value.push(DEFAULT_AVATAR);
            }
        } catch (error) {
            console.log(`Error fetching avatar for user ${userId}:`, error);
            userAvatars.value.push(DEFAULT_AVATAR);
        }
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
