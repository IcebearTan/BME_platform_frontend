// 营期面包屑名注册表：工作区壳加载营期后写入，HomeView（壳祖先，inject 上行不可达）读取。
// 模块级单例是营期上下文「不建模块 store」纪律的唯一例外——按 campId 键控、只存展示名。
import { reactive } from 'vue'

export const campLabels = reactive({})

export function setCampLabel(campId, name) {
  if (campId && name) campLabels[campId] = name
}
