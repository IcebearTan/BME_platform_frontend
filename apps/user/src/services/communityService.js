import api from '../api'

export const countWords = (text = '') => Array.from(text).filter(c => !/[\s\p{P}\p{C}]/u.test(c)).length
export const contentLength = (text = '') => Array.from(text.trim()).length
export const newRequestId = () => globalThis.crypto?.randomUUID?.() || `community-${Date.now()}-${Math.random().toString(36).slice(2)}`
export const communityService = {
  tags: () => api.get('/community/tags').then(r => Array.isArray(r.data.data) ? r.data.data : []),
  tag: id => api.get(`/community/tags/${id}`).then(r => r.data.data),
  books: id => api.get(`/community/tags/${id}/books`).then(r => Array.isArray(r.data.data) ? r.data.data : []),
  bookThreads: id => api.get(`/community/books/${id}/threads`).then(r => Array.isArray(r.data.data) ? r.data.data : []),
}
