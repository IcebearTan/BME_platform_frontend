// 完成本课状态机（方案 §6.3）：未完成 → 保存中 → 已完成 / 保存失败。
// 后端确认成功后才翻本地完成态与派生进度；失败保留页面与阅读位置，
// 仅提示重试，不做乐观写（修复「失败仍显示成功」的正确性问题）。
import { ref } from 'vue'
import api from '../api'
import { DewMessage } from '@bme/dew-ui'

export function useLessonCompletion() {
  const completionState = ref('idle')   // idle | saving | saved | error

  async function completeLesson(lesson, courseId, campSid) {
    if (completionState.value === 'saving') return false   // 保存期间禁用重复提交
    completionState.value = 'saving'
    try {
      const res = await api({
        url: '/learningProgress/lesson/update',
        method: 'post',
        data: {
          Lesson_Id: lesson.id,
          Course_Id: courseId,
          Status: 'completed',
          // 营内入口显式带 sid：同课跨营多活营时打点落营准确（后端校验分配行，
          // 无该营分配则回落最新分配推导；非营内路径不带，走全局表）
          ...(campSid ? { camp_session_id: Number(campSid) } : {})
        }
      })
      if (res.data.code !== 200) throw new Error(res.data.message || '保存失败')
      lesson.completed = true
      completionState.value = 'saved'
      return true
    } catch (e) {
      console.warn('保存课时进度失败', e)
      completionState.value = 'error'
      DewMessage.error('保存失败，请重试')
      return false
    }
  }

  function reset() {
    completionState.value = 'idle'
  }

  return { completionState, completeLesson, reset }
}
