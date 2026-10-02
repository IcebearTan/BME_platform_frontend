// 日历范围加载与对象适配（W1 工作台日历面板用）。
// 契约要点（BMEMate 计划 §5.2）：
// - FullCalendar datesSet 给出的 end 是排他边界，agenda 接口按闭区间日期收
//   参——适配层显式换算（end - 1 天），并按相交查询覆盖跨天对象（后端口径）。
// - FC 事件 id 加类型前缀（event:123 / block:456），保留原始对象映射供
//   点击编辑；日历只是数据投影，提交仍走 BME 服务。
import { ref, computed } from 'vue'
import { scheduleService } from '../services/scheduleService'

const pad = (n) => String(n).padStart(2, '0')
export const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fmtMinute = (d) => `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`

/** FC 排他 end → agenda 闭区间 to（往前一天） */
export function exclusiveEndToInclusive(end) {
  const d = new Date(end)
  d.setDate(d.getDate() - 1)
  return fmtDate(d)
}

export function useScheduleCalendar() {
  const range = ref({ from: null, to: null })
  const agenda = ref(null)
  const loading = ref(false)
  const error = ref('')
  let seq = 0

  async function load(from, to, { force = false } = {}) {
    if (!from || !to || from > to) return
    if (!force && range.value.from === from && range.value.to === to && agenda.value) return
    const cur = ++seq
    range.value = { from, to }
    loading.value = true
    error.value = ''
    try {
      const data = await scheduleService.fetchAgenda(from, to)
      if (cur !== seq) return                  // 丢弃过期响应
      agenda.value = data
    } catch (err) {
      if (cur === seq) {
        agenda.value = null
        error.value = err.message || '日历加载失败'
      }
    } finally {
      if (cur === seq) loading.value = false
    }
  }

  /** 点击解析：id 前缀 → 原始对象（events/blocks 原样透传给既有编辑弹窗） */
  const byKey = computed(() => {
    const map = new Map()
    for (const e of agenda.value?.events || []) map.set(`event:${e.id}`, e)
    for (const b of agenda.value?.blocks || []) map.set(`block:${b.id}`, b)
    return map
  })

  const fcEvents = computed(() => {
    if (!agenda.value) return []
    const events = (agenda.value.events || []).map((e) => ({
      id: `event:${e.id}`,
      title: e.title,
      start: e.start_at.replace(' ', 'T'),
      end: e.end_at.replace(' ', 'T'),
      allDay: !!e.all_day,
      classNames: ['sw-ev-event'],
    }))
    const blocks = (agenda.value.blocks || [])
      .filter((b) => b.status !== 'cancelled')
      .map((b) => ({
        id: `block:${b.id}`,
        title: b.task_title || '任务时间',
        start: b.start_at.replace(' ', 'T'),
        end: b.end_at.replace(' ', 'T'),
        classNames: ['sw-ev-block'],
      }))
    return [...events, ...blocks]
  })

  function refresh() {
    return load(range.value.from, range.value.to, { force: true })
  }

  return { range, agenda, loading, error, byKey, fcEvents, load, refresh }
}
