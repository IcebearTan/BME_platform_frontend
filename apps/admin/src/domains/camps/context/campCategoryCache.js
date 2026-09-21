// campId → { category, capabilities } 暖缓存：路由守卫在营期详情加载前无法异步等待，
// 用上下文每次加载后的记录做「已知不适用 → 进叶前重定向」的快路径（权威校验在壳的加载后复核）。
const cache = new Map()

export function recordCampSnapshot(id, category, policy) {
  if (!id) return
  cache.set(Number(id), {
    category: category || null,
    capabilities: policy?.capabilities || null,
  })
}

export function peekCamp(id) {
  return cache.get(Number(id))
}
