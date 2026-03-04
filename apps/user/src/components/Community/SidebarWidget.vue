<template>
  <div :class="['sidebar-widget', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <div class="widget-header">
      <h3 class="widget-title">{{ title }}</h3>
      <span v-if="showMore" class="widget-more-link" @click="$emit('more')">
        查看更多
      </span>
    </div>
    <div class="widget-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'

defineProps({
  title: {
    type: String,
    required: true
  },
  showMore: {
    type: Boolean,
    default: false
  }
})

defineEmits(['more'])

const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)
</script>

<style scoped>
.sidebar-widget {
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.theme-light .sidebar-widget {
  background: #ffffff;
  border: 1px solid #d0d7de;
}

.theme-dark .sidebar-widget {
  background: #161b22;
  border: 1px solid #30363d;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
}

.theme-light .widget-header {
  border-bottom: 1px solid #d0d7de;
}

.theme-dark .widget-header {
  border-bottom: 1px solid #30363d;
}

.widget-title {
  font-size: 13px;
  font-weight: 500;
  margin: 0;
}

.theme-light .widget-title {
  color: #24292f;
}

.theme-dark .widget-title {
  color: #c9d1d9;
}

.widget-more-link {
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.1s;
}

.theme-light .widget-more-link {
  color: #0969da;
}

.theme-dark .widget-more-link {
  color: #58a6ff;
}

.widget-more-link:hover {
  opacity: 0.7;
}

.widget-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
