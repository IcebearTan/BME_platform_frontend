const NAVIGATION_KEYS = new Set(['sid', 'tab', 'scope', 'unit', 'unit_id', 'binding', 'node', 'page', 'view', 'record', 'entry', 'month', 'chapterId', 'lessonId', 'perspective'])

export function feedbackPageContext() {
  const url = new URL(window.location.href)
  for (const key of [...url.searchParams.keys()]) {
    if (!NAVIGATION_KEYS.has(key)) url.searchParams.delete(key)
  }
  url.hash = ''
  return {
    url: url.href, title: document.title,
    viewport_width: window.innerWidth, viewport_height: window.innerHeight,
    scroll_y: Math.round(window.scrollY),
    theme: document.body.classList.contains('theme-dark') ? 'dark' : 'light',
    app_version: __APP_VERSION__, user_agent: navigator.userAgent,
    captured_at: new Date().toISOString(),
  }
}

export async function capturePageSnapshot() {
  const context = feedbackPageContext()
  const sourceLocation = window.location.href
  const { default: html2canvas } = await import('html2canvas-pro')
  if (window.location.href !== sourceLocation) throw new Error('页面已切换，请重新采集快照')
  const canvas = await html2canvas(document.documentElement, {
    x: window.scrollX, y: window.scrollY,
    width: context.viewport_width, height: context.viewport_height,
    windowWidth: context.viewport_width, windowHeight: context.viewport_height,
    scale: Math.min(1.5, Math.sqrt(2_000_000 / (context.viewport_width * context.viewport_height))),
    useCORS: true, allowTaint: false, imageTimeout: 1500, logging: false,
    ignoreElements: element => element.hasAttribute('data-feedback-ui')
      || element.classList.contains('feedback-report-overlay'),
    onclone: doc => {
      // 仅修改截图副本，密码/验证码等敏感输入不进入图片。
      doc.querySelectorAll('input, textarea, [data-feedback-private]').forEach(element => {
        const identity = [element.type, element.name, element.id, element.autocomplete, element.placeholder].join(' ')
        if (element.hasAttribute('data-feedback-private') || /password|secret|token|otp|one-time|验证码|密码/i.test(identity)) {
          if ('value' in element) element.value = ''
          else element.textContent = '已隐藏'
          element.setAttribute('placeholder', '已隐藏')
        }
      })
    },
  })
  if (window.location.href !== sourceLocation) throw new Error('页面已切换，请重新采集快照')
  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    value => value ? resolve(value) : reject(new Error('页面快照生成失败')), 'image/jpeg', 0.8,
  ))
  if (blob.size > 5 * 1024 * 1024) throw new Error('页面快照过大，请手动上传截图')
  return { file: new File([blob], 'page-snapshot.jpg', { type: 'image/jpeg' }), context }
}
