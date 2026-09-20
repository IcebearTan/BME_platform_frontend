// 通知分类 tab — 收件箱顶部筛选条与列表组件共享的 tab 选项/导生探测。
// 范式对齐 useNotifications：模块级单例状态，双组件使用不重复打 /camp/sessions。
// 09-20 随「tab 条上移出 340px 左列」从 NotificationListComponent 抽出。
import { ref, computed } from 'vue'
import { Bell, ChatDotRound } from '@element-plus/icons-vue'
import { campService } from '../services/campService'
import { useNotifications } from './useNotifications'
import { useGratitude } from './useGratitude'

// ── 模块级单例状态（所有 useNotificationTabs() 实例共享） ──
const isMentor = ref(false)
let mentorProbe = null      // 探测只发一次；失败置空允许下次重试

export function useNotificationTabs() {
  const { notificationList, unreadCount, unreadByCategory } = useNotifications()
  const { letters, unreadCount: letterUnread, fetchLetters } = useGratitude()

  /** 导生身份探测：感谢信 tab 仅导生可见（信件只有导生会收到）。
   *  身份解耦后无全局导生角色，以「任一营期 my_role=mentor」判定
   *  （/camp/sessions 对成员含已结营营，历史导生保留入口）；
   *  判定失败静默——仅失去私信 tab，不影响通知主流程。 */
  function detectMentor() {
    mentorProbe ??= campService.fetchSessions()
      .then((data) => {
        isMentor.value = (data.sessions || []).some((s) => s.my_role === 'mentor')
        if (isMentor.value) fetchLetters()   // 预载：供私信域通知点击时定位信件
      })
      .catch(() => { mentorProbe = null })
    return mentorProbe
  }

  // 筛选 tab 选项。
  // 分类体系：category=业务域（system/camp/community/message），source_type=具体事件。
  // tab = 全部 / 系统 / 营期 / 社区（有内容才浮出） / 私信（导生；感谢信是私信的第一种，
  // 未来用户互信同 tab）。未读是状态不是类别——撤独立 tab，未读徽标挂「全部」+ 各分类。
  const filterItems = computed(() => {
    const cat = (c) => unreadByCategory.value[c] || undefined
    const items = [
      { value: 'all', label: '全部', icon: Bell, badge: unreadCount.value || undefined },
      { value: 'system', label: '系统', icon: Bell, badge: cat('system') },
      { value: 'camp', label: '营期', icon: Bell, badge: cat('camp') },
    ]
    // 社区域预留：社区广场点赞/评论通知落地日（category='community'），tab 自动浮现
    if (notificationList.value.some(n => n.category === 'community') || unreadByCategory.value.community) {
      items.push({ value: 'community', label: '社区', icon: Bell, badge: cat('community') })
    }
    if (isMentor.value) {
      items.push({ value: 'message', label: '私信', icon: ChatDotRound, badge: letterUnread.value || undefined })
    }
    return items
  })

  return { isMentor, detectMentor, filterItems, letters, letterUnread, fetchLetters }
}
