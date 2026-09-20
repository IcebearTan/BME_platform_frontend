<template>
  <div class="notification-inbox">
    <!-- 分类 tab 置顶全宽（09-20）：分类最多五项（全部/系统/营期/社区/私信），
         原先挤在 340px 左列塞不下；上移后横贯列表与详情两栏上方，两栏顶边对齐 -->
    <DewButtonBar :items="filterItems" v-model="activeTab" class="inbox-tabs" />

    <div class="inbox-body">
      <div class="inbox-left">
        <NotificationListComponent
          v-model:tab="activeTab"
          :selected-id="selectedId"
          @select="selectedNotice = $event"
          @select-letter="selectedLetter = $event"
        />
      </div>
      <div class="inbox-right">
        <!-- 右栏归属随 tab 切换：私信 tab 显示信件，其余显示通知详情（选中态不在当前 tab 时自然隐藏） -->
        <GratitudeLetterDetail v-if="activeTab === 'message'" :letter="selectedLetter" />
        <NoticeDetailPane v-else :notice="selectedNotice" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DewButtonBar } from '@bme/dew-ui'
import NotificationListComponent from './NotificationListComponent.vue'
import NoticeDetailPane from './NoticeDetailPane.vue'
import GratitudeLetterDetail from '../Gratitude/GratitudeLetterDetail.vue'
import { useNotificationTabs } from '../../composables/useNotificationTabs'

const route = useRoute()
const router = useRouter()

// 分类 tab 选项 + 导生探测（tab 条移到本容器后由这里驱动；单例探测，不与列表组件重复请求）
const { filterItems, detectMentor } = useNotificationTabs()
onMounted(detectMentor)

// 合法 tab：all/system/camp/message（category=业务域；未读是状态不是类别，已并入徽标）。
// legacy：'gratitude' 是旧 tab 值（感谢信曾是独立类别），归一化到私信域 message
const VALID_TABS = ['all', 'system', 'camp', 'community', 'message']
const normalizeTab = (tab) => (tab === 'gratitude' ? 'message' : VALID_TABS.includes(tab) ? tab : 'all')

// URL 即状态：?tab= 由本容器统一持有（铃铛/深链可直达筛选）
const activeTab = ref(normalizeTab(route.query.tab))
const selectedNotice = ref(null)
const selectedLetter = ref(null)

// 左栏选中高亮：随 tab 取对应一侧的选中项
const selectedId = computed(() => (
  activeTab.value === 'message'
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
/* 顶部分类条 + 下方左右分栏：tab 横贯两栏之上（对齐），左列固定宽列表、右列详情 */
.notification-inbox {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* tab 条长度纪律：不 stretch 拉满全宽（内容自适应，紧凑胶囊）——
   本容器是纵向 flex，条会被默认 align-items:stretch 拉满，须显式 flex-start；
   任何屏宽不超过容器；超窄屏（五 tab 全出时）横向滚动兜底 */
.inbox-tabs {
  align-self: flex-start;
  max-width: 100%;
  box-sizing: border-box;   /* 胶囊自带 padding+border，按边框盒钳宽才不越出容器 */
  overflow-x: auto;
  scrollbar-width: none;
}
.inbox-tabs::-webkit-scrollbar {
  display: none;
}

.inbox-body {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
  align-items: start;
}

.inbox-left { min-width: 0; }
.inbox-right { min-width: 0; }

/* 单栏折叠：右栏隐藏，详情回退 DewDialog（列表组件内处理）；tab 条保持置顶全宽 */
@media (max-width: 900px) {
  .inbox-body {
    grid-template-columns: 1fr;
  }
  .inbox-right {
    display: none;
  }
}
</style>
