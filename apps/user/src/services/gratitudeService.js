// 感谢信服务层 — 学员给导生的感谢留言（信件独立成表；通知仅作送达提醒）
import api from '../api'

export const gratitudeService = {
  /** 寄出感谢信 { recipient_id, camp_session_id?, content } → { id } */
  async send(payload) {
    return api.post('/gratitude', payload).then(r => r.data)
  },

  /** 我收到的感谢信列表（导生侧） */
  async fetchReceived(params = {}) {
    return api.get('/gratitude/received', { params }).then(r => r.data)
  },

  /** 标记信件已读（后端同时把关联通知标记已读） */
  async markRead(id) {
    return api.post('/gratitude/read', { id }).then(r => r.data)
  },
}
