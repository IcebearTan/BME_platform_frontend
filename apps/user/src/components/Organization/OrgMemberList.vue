<script setup>
// 组展开区的成员条列表：第一行组长（is_leader），其后组员（primary 在前、secondary 带「辅」标）。
// 点击进个人主页；站内消息上线后在此加消息按钮位。
import { useRouter } from 'vue-router'
import { DewTag } from '@bme/dew-ui'
import DewImage from '@bme/dew-ui/DewImage.vue'
import { assetUrl } from '../../services/campService'

defineProps({
  members: { type: Array, default: () => [] },
})

const router = useRouter()
const goProfile = (id) => {
  if (id) router.push(`/profile/${id}`)
}
</script>

<template>
  <div v-if="members.length" class="oml">
    <div v-for="m in members" :key="m.id" class="oml-row" @click="goProfile(m.id)">
      <DewImage shape="circle" :size="24" :src="assetUrl(m.avatar) || null" :initial="m.username || '?'" class="oml-avatar" />
      <span class="oml-name">{{ m.username }}</span>
      <DewTag v-if="m.title" type="warning" size="sm" round>{{ m.title }}</DewTag>
      <DewTag v-if="m.slot === 'secondary'" type="neutral" size="sm" round>辅</DewTag>
    </div>
  </div>
  <div v-else class="oml-empty">暂无成员 · 招新中</div>
</template>

<style scoped>
.oml {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.oml-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.oml-row:hover {
  background: var(--color-bg-muted, rgba(127, 127, 127, 0.1));
}

.oml-avatar {
  flex-shrink: 0;
  background: var(--color-bg-muted, rgba(127, 127, 127, 0.15));
  color: var(--dew-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.oml-name {
  font-size: 13px;
  color: var(--dew-text-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.oml-empty {
  font-size: 12px;
  color: var(--dew-text-muted);
  padding: 4px 8px;
}
</style>
