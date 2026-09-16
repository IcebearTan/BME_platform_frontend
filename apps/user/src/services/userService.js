// 用户域服务层 — /user/* 的薄封装（全站搜索·用户域，2026-09-16 第一步）
import api from '../api'

export const userService = {
  /** 站内用户搜索 { keyword, page?, page_size? } → { total, page, page_size, users }
   *  仅公开字段（id/username/avatar_url/level/institute/major），不含邮箱学号 */
  async search(params = {}) {
    return api.get('/user/search', { params }).then(r => r.data)
  },
}
