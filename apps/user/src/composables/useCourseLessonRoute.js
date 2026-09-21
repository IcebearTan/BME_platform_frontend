// URL ↔ 当前课时同步（方案 §6.1/§6.2）：
// lessonId 是当前课时的首要恢复依据；chapterId 仅作无 lessonId 深链的
// 兜底（选该章第一课），两者不再相互覆盖（修复刷新/分享链接定位错乱）。
// 目录点击、上一课/下一课、快捷键全部收敛到 selectLesson 一个入口，
// 营期参数 sid 与来源参数 from 始终随迁保留。
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useCourseLessonRoute(flatLessons) {
  const route = useRoute()
  const router = useRouter()
  const currentLesson = ref(null)
  const currentChapter = ref(null)

  function findEntry(lessonId) {
    const id = Number(lessonId)
    return flatLessons.value.find((i) => i.lesson.id === id) || null
  }

  // 统一课时切换入口。updateUrl=false 供外部路由变化对齐时使用（避免回写循环）
  function selectLesson(lessonId, { updateUrl = true } = {}) {
    const entry = findEntry(lessonId)
    if (!entry) return false
    if (currentLesson.value && currentLesson.value.id === entry.lesson.id) return false
    currentLesson.value = entry.lesson
    currentChapter.value = entry.chapter
    if (updateUrl) {
      router.replace({
        query: {
          ...route.query,
          chapterId: String(entry.chapter.id),
          lessonId: String(entry.lesson.id)
        }
      })
    }
    return true
  }

  // 外部路由变化（浏览器前进/后退、地址栏深链）：数据就绪且已完成初始定位后才对齐
  watch(
    () => [route.query.lessonId, route.query.chapterId],
    () => {
      if (!flatLessons.value.length || !currentLesson.value) return
      const qLesson = route.query.lessonId
      if (qLesson != null && qLesson !== '') {
        if (Number(qLesson) !== currentLesson.value.id) {
          selectLesson(qLesson, { updateUrl: false })
        }
        return
      }
      const qChapter = route.query.chapterId
      if (qChapter != null && qChapter !== '' && Number(qChapter) !== currentChapter.value?.id) {
        const entry = flatLessons.value.find((i) => i.chapter.id === Number(qChapter))
        if (entry) selectLesson(entry.lesson.id)   // 补写 lessonId，统一口径
      }
    }
  )

  return { currentLesson, currentChapter, selectLesson }
}
