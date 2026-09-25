<template>
  <div class="camp-settings-page">
    <AccessDenied v-if="!canManage" />
    <template v-else>
      <div class="page-header">
        <div class="page-title">营期设置</div>
        <div class="header-actions">
          <span class="hint">配置决定规则；运行操作在各业务页（配置页与运行页分离）</span>
        </div>
      </div>

      <CampSettingsTab :session="session" :camp-id="campId"
        :manage-writable="manageWritable" :all-courses="allCourses" @saved="reload" />
    </template>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import CampSettingsTab from '../../../components/CampSettingsTab.vue'
import { useCampContext } from '../context/campContext'
import AccessDenied from '../workspace/AccessDenied.vue'

const ctx = useCampContext()
const { campId, session, canManage, manageWritable, load, options } = ctx
const { allCourses, ensureCourses } = options

// 设置保存后重读营期基本信息（引用整体替换 → CampSettingsTab watch 重新回填）
const reload = () => load()

onMounted(ensureCourses)
</script>

<style scoped>
.camp-settings-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hint {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
