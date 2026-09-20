/**
 * 官方富文本导入服务（方案 §7.2/§10.1）。
 * 剪贴板 text/html + 本地图片文件 -> POST /v2/article/admin/html/import，
 * 服务端完成归一化/图片转存/白名单清洗，前端只拿干净 HTML 插入画布。
 *
 * 注意：这里必须用原生 fetch 而不是共享 api 客户端——
 * @bme/api 的 axios 实例默认 Content-Type: application/json，axios 1.x 会把
 * FormData 序列化成 JSON 体（丢 multipart boundary），后端 request.form 全空
 * （2026-09-20 粘贴报「缺少 article_id」的根因）。fetch 发 FormData 由浏览器
 * 自动设置带 boundary 的 multipart 头。
 */
import { API_URL } from '../api'

const TOKEN_KEY = 'bme-admin-token'

// 弱特征来源识别（仅提示与报告口径，安全由服务端清洗保证）
export function detectSource(html) {
  const low = (html || '').toLowerCase()
  if (low.includes('xiumi.us')) return 'xiumi'
  if (low.includes('mmbiz.qpic.cn') || low.includes('data-src=') || low.includes('data-ratio=')) return 'wechat'
  if (low.includes('<')) return 'web'
  return 'unknown'
}

async function postForm(path, fd, timeoutMs = 180000) {
  const headers = {}
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers['Authorization'] = `Bearer ${token}`
  const resp = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: fd,
    signal: AbortSignal.timeout(timeoutMs),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const err = new Error(data.message || `请求失败（${resp.status}）`)
    err.status = resp.status
    throw err
  }
  return data
}

/**
 * 导入剪贴板 HTML。
 * @returns {Promise<{html:string, report:object, files:string[]}>}
 */
export async function importHtml(articleId, html, files = [], sourceHint = 'unknown') {
  const fd = new FormData()
  fd.append('article_id', String(articleId))
  fd.append('html', html)
  fd.append('source_hint', sourceHint)
  files.forEach((f) => fd.append('files', f))
  const data = await postForm('/v2/article/admin/html/import', fd)
  return (data && data.data) || {}
}

/** 编辑器内单图直传（拖拽图片文件用，同走 multipart，理由同上）。@returns {Promise<string>} /media URL */
export async function uploadEditorImage(file) {
  const fd = new FormData()
  fd.append('image', file)
  const data = await postForm('/v2/article/upload_image', fd)
  if (!data || !data.url) throw new Error('上传返回缺少 url')
  return data.url
}
