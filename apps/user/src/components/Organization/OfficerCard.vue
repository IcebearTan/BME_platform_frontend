<script setup>
// 社团干事卡片：头像 + 姓名 + 职位/组徽标，点击进个人主页。
// 站内消息上线后在此加消息按钮位（设计方案 §5.2）。
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { DewCard, DewTag } from '@bme/dew-ui'

const props = defineProps({
  officer: { type: Object, required: true },   // {id, username, avatar, title, group?}
  hero: { type: Boolean, default: false },      // 社长主卡放大
})

const router = useRouter()
const goProfile = () => {
  if (props.officer.id) router.push(`/profile/${props.officer.id}`)
}
const initial = computed(() => (props.officer.username || '?').slice(0, 1))
</script>

<template>
  <DewCard class="officer-card" :class="{ 'officer-card--hero': hero }" size="md" glass interactive @click="goProfile">
    <div class="oc-row">
      <el-avatar :size="hero ? 56 : 40" :src="officer.avatar || undefined" class="oc-avatar">
        {{ initial }}
      </el-avatar>
      <div class="oc-main">
        <span class="oc-name">{{ officer.username }}</span>
        <div class="oc-badges">
          <DewTag type="warning" size="sm" round>{{ officer.title }}</DewTag>
          <DewTag v-if="officer.group" type="info" size="sm" round>{{ officer.group }}</DewTag>
        </div>
      </div>
    </div>
  </DewCard>
</template>

<style scoped>
.officer-card {
  cursor: pointer;
}

.oc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.oc-avatar {
  flex-shrink: 0;
  background: var(--color-bg-muted, rgba(127, 127, 127, 0.15));
  color: var(--dew-text-muted);
  font-weight: 600;
}

.oc-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.oc-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--dew-text-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.oc-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 社长主卡：居中排布 */
.officer-card--hero .oc-row {
  flex-direction: column;
  gap: 10px;
  text-align: center;
}

.officer-card--hero .oc-main {
  align-items: center;
}

.officer-card--hero .oc-name {
  font-size: 17px;
}
</style>
