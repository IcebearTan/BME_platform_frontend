<template>
  <div class="camp-progress-page">
    <div class="page-header">
      <div class="page-title">学习进度</div>
      <div class="header-actions">
        <span class="hint">按导生组分桶的章节认证子矩阵（导生端同口径只见本组）</span>
      </div>
    </div>

    <CampProgressBoard :sid="campId" />
  </div>
</template>

<script setup>
import CampProgressBoard from '../../../components/CampProgressBoard.vue'
import { useCampContext } from '../context/campContext'

const ctx = useCampContext()
const { campId } = ctx
</script>

<style scoped>
.camp-progress-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hint {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
