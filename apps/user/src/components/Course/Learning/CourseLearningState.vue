<script setup>
// 学习页页面级状态（方案 §7）：加载失败 / 课程无章节 / 无访问权限。
// 首屏加载骨架由视图按整页布局搭（顶栏+目录+正文各自占位），不在此组件内。
import { CircleCheck, Lock, WarningFilled } from '@element-plus/icons-vue'
import { DewButton } from '@bme/dew-ui'

defineProps({
  // error | empty | forbidden
  state: { type: String, required: true }
})
const emit = defineEmits(['retry', 'back'])

const PANEL = {
  error: {
    icon: WarningFilled,
    iconClass: 'is-warning',
    title: '课程内容加载失败',
    desc: '请检查网络后重试，已保存的学习进度不会受影响。'
  },
  empty: {
    icon: CircleCheck,
    iconClass: 'is-muted',
    title: '课程内容尚未发布',
    desc: '课程章节还在准备中，可以先返回课程详情看看其他内容。'
  },
  forbidden: {
    icon: Lock,
    iconClass: 'is-muted',
    title: '你暂时无法学习本课程',
    desc: '本课程为营期学习，请先经营期选课加入后再来。'
  }
}
</script>

<template>
  <div class="learning-state">
    <div class="state-panel">
      <el-icon class="state-icon" :class="PANEL[state].iconClass">
        <component :is="PANEL[state].icon" />
      </el-icon>
      <h2 class="state-title">{{ PANEL[state].title }}</h2>
      <p class="state-desc">{{ PANEL[state].desc }}</p>
      <div class="state-actions">
        <DewButton v-if="state === 'error'" size="lg" class="state-retry" @click="emit('retry')">
          重新加载
        </DewButton>
        <DewButton size="lg" type="ghost" @click="emit('back')">返回课程</DewButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.learning-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.state-panel {
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 32px;
  border-radius: var(--radius-lg);
  background: var(--dew-card-flat-bg);
  border: 1px solid var(--dew-card-flat-border);
  box-shadow: var(--dew-card-flat-shadow);
}

.state-icon { font-size: 40px; }
.state-icon.is-warning { color: var(--color-warning); }
.state-icon.is-muted { color: var(--dew-text-faint); }

.state-title {
  margin: 16px 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

.state-desc {
  margin: 0 0 24px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--dew-text-muted);
}

.state-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
