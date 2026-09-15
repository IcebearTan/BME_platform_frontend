// 感谢信 Composable — 收件箱「感谢信」tab 与右栏信件共享的响应式状态
// 范式对齐 useNotifications：模块级单例，乐观更新 + 失败回滚
import { ref, computed } from 'vue'
import { gratitudeService } from '../services/gratitudeService'
import { assetUrl } from '../services/campService'

// ── 模块级单例状态（所有 useGratitude() 实例共享同一份数据） ──
const letters = ref([])
const loading = ref(true)

// 已读但尚未确认完成的信件 id：fetchLetters 重拉后兜底应用，
// 防止「打开即已读」的乐观更新被并发刷新的旧数据覆盖（如切 tab 触发重拉）
const pendingReadIds = new Set()

export function useGratitude() {
  const unreadCount = computed(() => letters.value.filter(l => !l.is_read).length)

  /** 拉取收到的感谢信（默认拉 100 封，客户端渲染） */
  async function fetchLetters(params = {}) {
    loading.value = true
    try {
      const r = await gratitudeService.fetchReceived({ per_page: 100, ...params })
      if (r.code === 200) {
        // 形状异常保底空数组：防 unreadCount 的 filter 白屏（同 useNotifications 教训）
        // 寄信人头像为后端相对路径（/media/ 或旧 /data/avatars/），这里统一拼全
        const list = (r.data?.letters || []).map((l) => ({
          ...l,
          sender: l.sender ? { ...l.sender, avatar: assetUrl(l.sender?.avatar) } : l.sender,
        }))
        list.forEach((l) => {
          if (pendingReadIds.has(l.id)) l.is_read = true
        })
        letters.value = list
      }
    } catch (e) {
      console.error('[useGratitude] fetchLetters 失败:', e)
    } finally {
      loading.value = false
    }
  }

  /** 标记信件已读（乐观更新；后端会连带把关联通知标为已读）
   *  成功后仍保留 pending 标记：若后续重拉先于服务端已读落库返回，
   *  继续兜底应用，避免「点开又跳回未读」的闪变 */
  async function markLetterRead(id) {
    pendingReadIds.add(id)
    const target = letters.value.find(l => l.id === id)
    if (target) target.is_read = true
    try {
      await gratitudeService.markRead(id)
    } catch (e) {
      pendingReadIds.delete(id)
      if (target) target.is_read = false
      console.error('[useGratitude] markLetterRead 失败:', e)
    }
  }

  return {
    // 状态
    letters,
    loading,
    unreadCount,
    // 方法
    fetchLetters,
    markLetterRead,
  }
}
