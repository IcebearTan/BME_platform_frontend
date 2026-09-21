<template>
  <div class="medal-center">
    <div class="view-switch">
      <el-radio-group :model-value="view" @change="onViewChange">
        <el-radio-button value="definitions">勋章定义</el-radio-button>
        <el-radio-button value="grants">发放记录</el-radio-button>
      </el-radio-group>
    </div>

    <MedalGrant v-if="view === 'grants'" />
    <MedalManage v-else />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MedalManage from '../../components/MedalManage.vue'
import MedalGrant from '../../components/MedalGrant.vue'

const route = useRoute()
const router = useRouter()

// 勋章中心内部视图：定义 / 发放记录（?view= 深链可分享，旧 /medal/grant 重定向至此）
const view = computed(() => (route.query.view === 'grants' ? 'grants' : 'definitions'))

function onViewChange(v) {
  router.replace({ query: { ...route.query, view: v === 'grants' ? 'grants' : undefined } })
}
</script>

<style scoped>
.medal-center {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.view-switch {
  display: flex;
  align-items: center;
}
</style>
