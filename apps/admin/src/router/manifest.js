// 路由清单（单一真相源，P-06）：路由记录的 meta 驱动侧栏、标题、面包屑、菜单激活。
// 组装顺序：具名业务路由在前，旧路径重定向垫后（新路由优先命中）。
import { workbenchRoutes } from './routes/workbench'
import { campsRoutes, campsRedirects } from '../domains/camps/routes'
import { organizationRoutes } from '../domains/organization/routes'
import { feedbackRoutes } from '../domains/feedback/routes'
import { miscRoutes, miscRedirects } from './routes/misc'

// HomeView 壳的路由子表（authRoutes 在壳外，见 router.js）
export const shellChildren = [
  ...workbenchRoutes,
  ...campsRoutes,
  ...organizationRoutes,
  ...feedbackRoutes,
  ...miscRoutes,
  ...campsRedirects,
  ...miscRedirects,
]

// 供菜单/激活态使用的扁平路由索引
function flatten(routes, out = []) {
  for (const r of routes) {
    if (r.children) flatten(r.children, out)
    else if (r.path) out.push(r)
  }
  return out
}

export function menuRoutes() {
  return flatten(shellChildren).filter((r) => r.meta?.showInMenu)
}

export function allLeafRoutes() {
  return flatten(shellChildren)
}
