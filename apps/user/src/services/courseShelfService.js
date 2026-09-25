// 课程书架服务（2026-09-21）：用户收藏课程的独立关系，与 user_course 选课
// 完全解耦——不建立选课、不影响 can_learn/营期归属/学习进度/课成判定。
// 详情页「加入书架」按钮与后续书架页共用此处接口。
import api from '../api'

export const courseShelfService = {
  // 查询某课程是否已在书架
  async check(courseId) {
    const res = await api({
      url: '/courseShelf/check',
      method: 'get',
      params: { Course_Id: courseId }
    })
    return res.data.code === 200 ? !!res.data.data?.in_shelf : false
  },

  // 加入书架（幂等）
  async add(courseId) {
    const res = await api({
      url: '/courseShelf/add',
      method: 'post',
      data: { Course_Id: courseId }
    })
    if (res.data.code !== 200) throw new Error(res.data.message || '加入书架失败')
    return true
  },

  // 移出书架（幂等）
  async remove(courseId) {
    const res = await api({
      url: '/courseShelf/remove',
      method: 'post',
      data: { Course_Id: courseId }
    })
    if (res.data.code !== 200) throw new Error(res.data.message || '移出书架失败')
    return false
  },

  // 我的书架列表（课程摘要 + 收藏时间，按时间倒序）
  async list() {
    const res = await api({
      url: '/courseShelf/list',
      method: 'get'
    })
    return res.data.code === 200 ? (res.data.data || []) : []
  }
}
