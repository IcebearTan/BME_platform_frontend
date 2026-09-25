// 营内成员远程搜索选择器（奖励发学员 / 座位分配共用，原 fetchMemberOptions + 防抖三件套）。
// 工厂每消费方一个实例：options/loading 状态互不串台。
import { ref } from 'vue'
import api from '../../../api'

export function createMemberPicker(campIdRef, role) {
  let options = ref([])
  let loading = ref(false)
  let timer = null

  async function load(keyword) {
    loading.value = true
    try {
      const res = await api.get(`/camp/sessions/${campIdRef.value}/members`, { params: {
        page: 1, page_size: 30, keyword: (keyword || '').trim() || undefined,
        role: role || undefined,
      } })
      options.value = res.data?.members || []
    } catch {
      options.value = []
    } finally {
      loading.value = false
    }
  }

  function search(keyword) {
    clearTimeout(timer)
    timer = setTimeout(() => load(keyword), 250)
  }

  function onOpen(visible) {
    if (visible && !options.value.length) load('')
  }

  return { options, loading, search, onOpen }
}

