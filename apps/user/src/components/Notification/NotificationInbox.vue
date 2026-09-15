<template>
  <div class="notification-inbox">
    <div class="inbox-left">
      <NotificationListComponent
        v-model:tab="activeTab"
        :selected-id="selectedId"
        @select="selectedNotice = $event"
        @select-letter="selectedLetter = $event"
      />
    </div>
    <div class="inbox-right">
      <!-- 右栏归属随 tab 切换：感谢信 tab 显示信件，其余显示通知详情（选中态不在当前 tab 时自然隐藏） -->
      <GratitudeLetterDetail v-if="activeTab === 'gratitude'" :letter="selectedLetter" />
      <NoticeDetailPane v-else :notice="selectedNotice" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NotificationListComponent from './NotificationListComponent.vue'
import NoticeDetailPane from './NoticeDetailPane.vue'
import GratitudeLetterDetail from '../Gratitude/GratitudeLetterDetail.vue'

const route = useRoute()
const router = useRouter()

// 合法 tab：all/system/camp/gratitude（四个大类；未读是状态不是类别，已并入徽标）
const VALID_TABS = ['all', 'system', 'camp', 'gratitude']

// URL 即状态：?tab= 由本容器统一持有（铃铛/深链可直达筛选）
const activeTab = ref(VALID_TABS.includes(route.query.tab) ? route.query.tab : 'all')
const selectedNotice = ref(null)
const selectedLetter = ref(null)

// 左栏选中高亮：随 tab 取对应一侧的选中项
const selectedId = computed(() => (
  activeTab.value === 'gratitude'
    ? selectedLetter.value?.id ?? null
    : selectedNotice.value?.id ?? null
))

watch(activeTab, (tab) => {
  if (route.query.tab !== tab) {
    router.replace({ query: { ...route.query, tab: tab === 'all' ? undefined : tab } })
  }
})

// 外部路由变化（如铃铛深链 ?tab=gratitude）时同步筛选
watch(() => route.query.tab, (tab) => {
  const next = VALID_TABS.includes(tab) ? tab : 'all'
  if (next !== activeTab.value) activeTab.value = next
})
</script>

<style scoped>
/* 左右分栏：左列固定宽消息列表，右列详情阅读（min-width:0 防内容撑爆） */
.notification-inbox {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
  align-items: start;
}

.inbox-left { min-width: 0; }
.inbox-right { min-width: 0; }

/* 单栏折叠：右栏隐藏，详情回退 DewDialog（列表组件内处理） */
@media (max-width: 900px) {
  .notification-inbox {
    grid-template-columns: 1fr;
  }
  .inbox-right {
    display: none;
  }
}
</style>
