<script setup>
// 日程服务页（批次 A 只读观测）：概览 / 运行记录 / 服务设置 三页签，
// ?tab= URL 深链（工作台风险行直达）；页签范式对齐 MedalCenterPage。
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScheduleOverviewPanel from './ScheduleOverviewPanel.vue'
import ScheduleRecordsPanel from './ScheduleRecordsPanel.vue'
import ScheduleSettingsPanel from './ScheduleSettingsPanel.vue'

const route = useRoute()
const router = useRouter()

const VALID_TABS = ['overview', 'records', 'settings']
const normalizeTab = (tab) => (VALID_TABS.includes(tab) ? tab : 'overview')
const activeTab = ref(normalizeTab(route.query.tab))

watch(activeTab, (tab) => {
  if (route.query.tab !== tab) {
    router.replace({ query: { ...route.query, tab: tab === 'overview' ? undefined : tab } })
  }
})
watch(() => route.query.tab, (tab) => {
  const next = normalizeTab(tab)
  if (next !== activeTab.value) activeTab.value = next
})
</script>

<template>
  <div class="schedule-service-page selectable">
    <div class="page-header">
      <div class="page-title">日程服务</div>
      <el-radio-group v-model="activeTab" size="small">
        <el-radio-button value="overview">运行概览</el-radio-button>
        <el-radio-button value="records">运行记录</el-radio-button>
        <el-radio-button value="settings">服务设置</el-radio-button>
      </el-radio-group>
    </div>

    <ScheduleOverviewPanel v-show="activeTab === 'overview'" />
    <ScheduleRecordsPanel v-show="activeTab === 'records'" />
    <ScheduleSettingsPanel v-show="activeTab === 'settings'" />
  </div>
</template>

<style scoped>
.schedule-service-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
