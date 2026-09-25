<template>
  <div class="org-workspace">
    <div class="page-header">
      <div>
        <div class="page-title">组织架构</div>
        <div class="org-subtitle">组树、职位、任职、归属四个正交概念的工作区</div>
      </div>
    </div>

    <div class="org-nav-wrap">
      <el-radio-group v-model="currentSection" size="default" @change="onSectionChange">
        <el-radio-button v-for="s in sections" :key="s.name" :value="s.name">{{ s.label }}</el-radio-button>
      </el-radio-group>
    </div>

    <router-view />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const sections = [
  { name: 'org.overview', label: '组织总览' },
  { name: 'org.groups', label: '组树' },
  { name: 'org.positions', label: '职位定义' },
  { name: 'org.officers', label: '任职管理' },
  { name: 'org.memberships', label: '成员归属' },
]

// 绑定路由名：浏览器前进/后退时高亮随当前路由派生
const currentSection = computed(() => route.name)

function onSectionChange(name) {
  router.push({ name })
}
</script>

<style scoped>
.org-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.org-subtitle {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.org-nav-wrap {
  display: flex;
  align-items: center;
}
</style>
