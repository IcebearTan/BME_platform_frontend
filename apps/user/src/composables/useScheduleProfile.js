// 日程偏好单例 — 设置面板与三个编辑弹窗共享（默认提醒提前量、日窗口）。
// 范式对齐 useNotifications：模块级单例状态，避免多组件重复拉取。
import { ref } from 'vue'
import { scheduleService } from '../services/scheduleService'

// ── 模块级单例状态（所有 useScheduleProfile() 实例共享） ──
const profile = ref(null)
const loading = ref(false)
let loadPromise = null

export function useScheduleProfile() {
  /** 拉取（或复用在途请求）；失败静默为 null，弹窗回退 15 分钟默认值 */
  function load(force = false) {
    if (profile.value && !force) return Promise.resolve(profile.value)
    loadPromise ??= scheduleService.fetchPreferences()
      .then((data) => {
        profile.value = data
        return data
      })
      .catch(() => {
        loadPromise = null
        return null
      })
    return loadPromise
  }

  /** 设置面板保存；409（他人已改）时抛给调用方提示并强制重拉 */
  async function save(payload) {
    const data = await scheduleService.updatePreferences(payload)
    profile.value = data
    return data
  }

  return { profile, loading, load, save }
}
