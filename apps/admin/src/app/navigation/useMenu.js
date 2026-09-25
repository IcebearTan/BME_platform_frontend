// 菜单模型：路由清单（meta）× 导航分区 × 登录身份 → 侧栏渲染数据。
// 替代 HomeView 硬编码菜单 + 各自 v-if 的旧三真相源。
import { computed } from 'vue'
import { useStore } from 'vuex'
import { NAV_SECTIONS, ICONS } from './navGroups'
import { menuRoutes } from '../../router/manifest'

export function useMenu() {
  const store = useStore()
  const isStaff = computed(() => store.getters.isStaff)

  const menuSections = computed(() => {
    // 分组收集 showInMenu 路由（staffOnly 项按身份过滤；整个分组无项则不渲染分组）
    const byGroup = new Map()
    for (const r of menuRoutes()) {
      if (r.meta.staffOnly && !isStaff.value) continue
      if (!byGroup.has(r.meta.navGroup)) byGroup.set(r.meta.navGroup, [])
      byGroup.get(r.meta.navGroup).push(r)
    }

    return NAV_SECTIONS
      .map((s) => ({ ...s, iconComp: ICONS[s.icon] }))
      .filter((s) => (s.type === 'group' ? (byGroup.get(s.key) || []).length > 0 : true))
      .map((s) => {
        if (s.type === 'group') {
          const items = [...byGroup.get(s.key)]
            .sort((a, b) => (a.meta.navOrder || 0) - (b.meta.navOrder || 0))
            .map((r) => ({
              path: r.path,
              label: r.meta.menuLabel || r.meta.title,
              iconComp: r.meta.icon ? ICONS[r.meta.icon] : null,
            }))
          return { ...s, items }
        }
        return s
      })
  })

  return { menuSections, isStaff }
}
