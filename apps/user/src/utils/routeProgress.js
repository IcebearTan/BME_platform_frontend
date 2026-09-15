// 路由切换顶部进度条：懒加载分包后，目标页 chunk 首载期用一条细进度遮羞。
// 无依赖（nprogress 同形制）：2.5px 渐变细条，先冲到 ~85% 悬停，导航完成补满淡出。
// 只在「路由切换」用；页面内数据加载仍走 DewSkeleton 三段式（规范 docs/加载态与骨架规范.md）。

const BAR_ID = 'bme-route-progress'
const STYLE_ID = 'bme-route-progress-style'
const CSS = `
@keyframes bme-route-progress-crawl {
  0% { width: 0; }
  25% { width: 45%; }
  60% { width: 70%; }
  100% { width: 85%; }
}
#${BAR_ID} {
  position: fixed;
  top: 0;
  left: 0;
  height: 2.5px;
  width: 0;
  z-index: 3000;
  border-radius: 0 2px 2px 0;
  background: linear-gradient(90deg, var(--color-primary, #3b82f6), #06b6d4);
  box-shadow: 0 0 8px color-mix(in srgb, var(--color-primary, #3b82f6) 45%, transparent);
  pointer-events: none;
  opacity: 0;
}
`

let finishTimer = null

function ensureBar() {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    document.head.appendChild(style)
  }
  let bar = document.getElementById(BAR_ID)
  if (!bar) {
    bar = document.createElement('div')
    bar.id = BAR_ID
    document.body.appendChild(bar)
  }
  return bar
}

export function routeProgressStart() {
  if (finishTimer) { clearTimeout(finishTimer); finishTimer = null }
  const bar = ensureBar()
  bar.style.transition = 'none'
  bar.style.opacity = '1'
  bar.style.width = '0'
  // 强制 reflow 后再挂动画，保证每次导航都从 0 起跳
  void bar.offsetWidth
  bar.style.animation = 'none'
  void bar.offsetWidth
  bar.style.animation = 'bme-route-progress-crawl 6s ease-out forwards'
}

export function routeProgressDone() {
  const bar = document.getElementById(BAR_ID)
  if (!bar) return
  bar.style.animation = 'none'
  bar.style.transition = 'width .2s ease, opacity .35s ease .15s'
  bar.style.width = '100%'
  bar.style.opacity = '0'
  finishTimer = setTimeout(() => {
    bar.style.transition = 'none'
    bar.style.width = '0'
    finishTimer = null
  }, 600)
}
