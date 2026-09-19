// 项目广场服务层（功能扩展轮 §五；后端 blueprints/showcase.py）
// 双来源：camp=营期项目发布投影（显式动作）；community=用户自由分享（免审上架）
import api from '../api'

export const PROJECT_STATUS_TEXT = { idea: '构思中', ongoing: '进行中', done: '已完成' }
export const SOURCE_TEXT = { camp: '营期项目', community: '自由分享' }

export const showcaseService = {
  // 列表（?source=&project_status=&tag=&q=；回包带 all_tags 聚合与我的收藏标记）
  fetchProjects: (params = {}) =>
    api.get('/showcase/projects', { params }).then(r => r.data),
  fetchProject: (id) =>
    api.get(`/showcase/projects/${id}`).then(r => r.data),
  // community 分享（免审上架）
  createProject: (form) =>
    api.post('/showcase/projects', form).then(r => r.data),
  // 编辑投影覆盖字段（camp 条目编辑不回写营期数据——展示与营期流程单向）
  updateProject: (id, form) =>
    api.put(`/showcase/projects/${id}`, form).then(r => r.data),
  // 上下架治理（admin 任意条目；创建人可自行下架）
  setProjectStatus: (id, status) =>
    api.put(`/showcase/projects/${id}/status`, { status }).then(r => r.data),
  // 营期项目发布到广场（负责人/admin 显式动作；重复发布 409）
  publishFromCamp: (body) =>
    api.post('/showcase/projects/publish-camp', body).then(r => r.data),
  // 封面：上传/替换（multipart；转码 16:9 母版+缩略，回包相对路径）+ 删除
  uploadCover: (id, file) => {
    const fd = new FormData();
    fd.append('cover', file);
    return api.post(`/showcase/projects/${id}/cover`, fd).then(r => r.data);
  },
  removeCover: (id) =>
    api.post(`/showcase/projects/${id}/cover/delete`).then(r => r.data),
  // 图集：追加多图（单次+存量 ≤9）+ 按 url 删单张
  uploadImages: (id, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    return api.post(`/showcase/projects/${id}/images`, fd).then(r => r.data);
  },
  removeImage: (id, url) =>
    api.post(`/showcase/projects/${id}/images/delete`, { url }).then(r => r.data),
  // 收藏（幂等）
  favorite: (id, favorited) =>
    (favorited ? api.put(`/showcase/projects/${id}/favorite`)
      : api.delete(`/showcase/projects/${id}/favorite`)).then(r => r.data),
}
