// 课程资料服务（09-21 从 CourseResources.vue 抽取）：
// 「课程资料」的取数与 Down_Code 一次性码下载策略收口于此，
// 课程详情页资料 tab 与章节学习页「课程资源」区共用，不各存一份。
import api, { API_URL } from '../api'

export const courseResourceService = {
  // 课程资料列表（失败抛错，由调用方决定降级）
  async list(courseId) {
    const res = await api({
      url: '/course/resources',
      method: 'get',
      params: { Course_Id: courseId }
    })
    return res.data.code === 200 ? (res.data.data || []) : []
  },

  // Down_Code 一次性码换真实下载地址并打开；ids 为空 = 该课程全部资源打包
  async download(courseId, ids = []) {
    const res = await api({
      url: '/course/resource_down',
      method: 'get',
      params: {
        Course_Id: courseId,
        ...(ids.length ? { Resource_Ids: ids.join(',') } : {})
      }
    })
    if (res.data.code === 200) {
      const url = `${API_URL}/course/resource_download?Down_Code=${encodeURIComponent(res.data.Down_Code)}`
      window.open(url, '_blank')
    } else {
      throw new Error(res.data.message || '获取下载链接失败')
    }
  }
}
