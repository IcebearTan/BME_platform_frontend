// 社团组树前端工具：/admin/club/groups 平铺行 → el-cascader 选项
// 仅收 active 组；excludeId 用于「编辑组挪父」场景——整棵子树排除，防选到自己的子孙成环
// （环与深度兜底校验在后端，这里只是 UX 层先挡一道）
export function buildGroupCascaderOptions(rows, excludeId = null) {
  const banned = new Set()
  if (excludeId) {
    const byParent = new Map()
    rows.forEach(r => {
      if (!byParent.has(r.parent_id)) byParent.set(r.parent_id, [])
      byParent.get(r.parent_id).push(r.id)
    })
    const stack = [excludeId]
    while (stack.length) {
      const id = stack.pop()
      banned.add(id)
      ;(byParent.get(id) || []).forEach(cid => stack.push(cid))
    }
  }

  const nodes = new Map()
  rows.forEach(r => {
    if (r.status !== 'active' || banned.has(r.id)) return
    nodes.set(r.id, { value: r.id, label: r.name, children: [] })
  })

  // 平铺 → 树（保持接口 sort_order 顺序，根与子节点都按行序入位）
  const options = []
  rows.forEach(r => {
    const node = nodes.get(r.id)
    if (!node) return
    if (r.parent_id && nodes.has(r.parent_id)) nodes.get(r.parent_id).children.push(node)
    else options.push(node)
  })
  nodes.forEach(n => { if (!n.children.length) delete n.children })
  return options
}
