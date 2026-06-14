<template>
  <div class="seat-board">
    <!-- 房间切换器（由注册表驱动） -->
    <div class="seat-board__tabs">
      <DewButtonBar v-model="currentRoom" :items="tabItems" size="sm" />
    </div>

    <!-- 看板内容：可用房间渲染其组件，否则占位 -->
    <div class="seat-board__view">
      <component
        v-if="currentRoomObj && currentRoomObj.available && currentRoomObj.component"
        :is="currentRoomObj.component"
        :is-dark-mode="isDarkMode"
      />
      <div v-else class="seat-board__placeholder">
        <el-icon class="seat-board__placeholder-icon"><Clock /></el-icon>
        <div class="seat-board__placeholder-title">{{ currentRoomObj?.label || currentRoom }} 自习室</div>
        <div class="seat-board__placeholder-hint">暂未开发，敬请期待</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { Clock } from '@element-plus/icons-vue'
import DewButtonBar from '../ui/DewButtonBar.vue'
import { rooms, defaultRoomId } from './RoomRegistry.js'

const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

const currentRoom = ref(defaultRoomId)
const tabItems = rooms.map(r => ({ value: r.id, label: r.label }))
const currentRoomObj = computed(() => rooms.find(r => r.id === currentRoom.value))
</script>

<style scoped>
.seat-board {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}
.seat-board__tabs {
  display: flex;
}
.seat-board__view {
  width: 100%;
  height: 460px;
}

/* 暂未开发占位 */
.seat-board__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 16px;
  border: 1px dashed var(--dew-card-border);
  background: var(--dew-card-bg);
}
.seat-board__placeholder-icon {
  font-size: 34px;
  color: var(--dew-text-faint);
}
.seat-board__placeholder-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dew-text-heading);
}
.seat-board__placeholder-hint {
  font-size: 13px;
  color: var(--dew-text-faint);
}

@media (max-width: 768px) {
  .seat-board__view {
    height: 410px;
  }
}
</style>
