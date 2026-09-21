<template>
  <div class="access-denied">
    <el-result icon="warning" title="无管理权限" sub-title="该页面需要营期管理权限（管理员身份）。你当前对营期内容只读。">
      <template #extra>
        <el-button type="primary" @click="goOverview">返回营期概览</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const goOverview = () => router.replace({ name: 'camp.overview' })
</script>

<style scoped>
.access-denied {
  padding: 32px 0;
}
</style>
