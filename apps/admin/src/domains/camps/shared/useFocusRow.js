// ?focus= 深链契约（设计方案 §6.3）：只定位高亮一条记录，不改变页面取数；
// 工作台待办卡跳转 → 具体 叶子?focus=<id>。el-table 用 row-key + highlight-current-row，
// bindFocusToTable 在数据到齐后把匹配行设为当前行；找不到不跨页翻找（v1 口径）。
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

export function useFocusRow() {
  const route = useRoute()
  const focusId = computed(() => (route.query.focus ? Number(route.query.focus) : null))
  return { focusId }
}

export function bindFocusToTable(tableRef, rowsRef, focusIdRef) {
  // flush: post —— 表格随数据渲染完成后才拿得到组件引用再 setCurrentRow
  watch([() => rowsRef.value?.length, focusIdRef], () => {
    if (!tableRef.value || !focusIdRef.value || !rowsRef.value?.length) return
    const row = rowsRef.value.find((r) => r.id === focusIdRef.value)
    if (row) tableRef.value.setCurrentRow(row)
  }, { immediate: true, flush: 'post' })
}
