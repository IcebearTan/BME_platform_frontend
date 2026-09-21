// 章节学习页数据层（章节学习内容页桌面端改进方案 §8/§9）：
// 一次拉取章节树 / 课时 / 学习进度 / 课程信息，归一化为统一字段
// （id/title/type/content/duration/resourceUrl/completed），页面不再
// 兼容 Lesson_Id/id、Lesson_Name/Lesson_Title 多套命名。
// 展示态（章节完成数、总进度）全部由课时数据派生，不单独维护一套。
import { computed, ref, unref } from 'vue'
import api, { API_URL } from '../api'
import { courseResourceService } from '../services/courseResourceService'

// 媒体/附件地址：绝对 URL 原样返回；相对路径（/media/... 等）拼后端源
export function resolveMediaUrl(path) {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return API_URL + path
}

// 富文本正文剥标签后是否还有实际内容（判「本课暂未发布学习内容」用）
export function hasRichTextBody(html) {
  if (!html) return false
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
}

export function useCourseLearningData(courseIdRef, { campSidRef = null } = {}) {
  const pageState = ref('loading')        // loading | ready | empty | forbidden | error
  const chapterTree = ref([])
  const courseTitle = ref('')
  const courseMode = ref('camp')           // 学习方式（migrate_52）：open=自主学 / camp=营期学
  const resources = ref([])
  const lastLessonId = ref(null)

  // 全部课时按目录顺序平铺（导航/统计的唯一依据）
  const flatLessons = computed(() => {
    const out = []
    const walk = (nodes) => nodes.forEach((n) => {
      n.lessons.forEach((lesson) => out.push({ lesson, chapter: n }))
      walk(n.children)
    })
    walk(chapterTree.value)
    return out
  })

  // 总进度 = 已完成课时数 / 可学习课时总数（§8）
  const summary = computed(() => {
    const total = flatLessons.value.length
    const completed = flatLessons.value.filter((i) => i.lesson.completed).length
    return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 }
  })

  function normalize(chaptersRaw, lessonsRaw, progressRows) {
    const completedSet = new Set()
    let last = null
    progressRows.forEach((r) => {
      if (r.status === 'completed') completedSet.add(r.lesson_id)
      // 最近学习课时：取 start/completed 时间最新的一条（'YYYY-MM-DD HH:MM:SS' 字符串可比）
      const t = r.completed_time || r.start_time
      if (t && (!last || t > last.t)) last = { id: r.lesson_id, t }
    })
    lastLessonId.value = last ? last.id : null

    const lessonsByChapter = new Map()
    lessonsRaw.forEach((item) => {
      lessonsByChapter.set(item.Chapter_Id, (item.lessons || []).map((l) => ({
        id: l.id,
        title: l.title || '',
        type: l.type || 'text',          // video | text | link | quiz | homework
        content: l.content || '',
        duration: l.duration || 0,
        resourceUrl: l.resource_url || '',
        completed: completedSet.has(l.id)
      })))
    })

    const nodeMap = new Map()
    const roots = []
    chaptersRaw.forEach((c) => {
      nodeMap.set(c.Chapter_Id, {
        id: c.Chapter_Id,
        title: c.Chapter_Name || '',
        order: c.Chapter_Order ?? 0,
        parentId: c.Chapter_Parent_Id ?? null,
        children: [],
        lessons: lessonsByChapter.get(c.Chapter_Id) || [],
        expanded: false
      })
    })
    nodeMap.forEach((node) => {
      if (node.parentId == null || !nodeMap.has(node.parentId)) {
        roots.push(node)
      } else {
        nodeMap.get(node.parentId).children.push(node)
      }
    })
    const sortRec = (nodes) => {
      nodes.sort((a, b) => a.order - b.order)
      nodes.forEach((n) => sortRec(n.children))
    }
    sortRec(roots)
    return roots
  }

  async function load() {
    const cid = Number(unref(courseIdRef))
    if (!cid) {
      pageState.value = 'error'
      return
    }
    pageState.value = 'loading'
    chapterTree.value = []
    resources.value = []
    courseTitle.value = ''
    courseMode.value = 'camp'
    lastLessonId.value = null

    try {
      const sid = unref(campSidRef)
      // 章节/课时为主请求（失败即失败）；进度与课程信息失败不致命
      const [chapterRes, lessonRes, progressRes, infoRes] = await Promise.all([
        api({ url: '/course/chapter_list', method: 'get', params: { Course_Id: cid } }),
        api({ url: '/course/lesson/list', method: 'get', params: { Course_Id: cid } }),
        api({
          url: '/learningProgress/lesson/list',
          method: 'get',
          params: { Course_Id: cid, ...(sid ? { camp_session_id: sid } : {}) }
        }).catch(() => null),
        api({ url: '/course/search', method: 'get', params: { Course_Id: cid } }).catch(() => null)
      ])

      // chapter_list 后端返回裸数组（无 code/data 包装），lesson/list 是包装格式——两种都兼容；
      // 未来聚合接口统一包装后此分支自动走另一边
      const chaptersRaw = Array.isArray(chapterRes.data)
        ? chapterRes.data
        : (chapterRes.data?.code === 200 ? (chapterRes.data.data || []) : null)
      const lessonsRaw = lessonRes.data?.code === 200 ? (lessonRes.data.data || []) : null
      if (!chaptersRaw || !lessonsRaw) {
        throw new Error(chapterRes.data?.message || lessonRes.data?.message || '课程数据加载失败')
      }

      const progressRows = progressRes?.data?.code === 200 ? (progressRes.data.data || []) : []
      courseTitle.value = infoRes?.data?.Course_Title || ''
      courseMode.value = infoRes?.data?.Learning_Mode === 'open' ? 'open' : 'camp'

      chapterTree.value = normalize(chaptersRaw, lessonsRaw, progressRows)

      // 营期学门禁（migrate_52）：未选课不进学习态（forbidden 状态页）。
      // 认 can_learn（后端 can_learn_course 口径：营期选课行/营内分配），
      // 不认 enrolled——A14 前的全局自助选课行 enrolled=true 也不放行。
      // check 失败按未学处理（安全默认）。自主学课登录即学，不设门。
      if (courseMode.value === 'camp') {
        const check = await api({
          url: '/userCourse/check',
          method: 'get',
          params: { Course_Id: cid }
        }).catch(() => null)
        if (!(check?.data?.code === 200 && check.data.data?.can_learn)) {
          pageState.value = 'forbidden'
          return
        }
      }

      // 课程资料（失败不致命：学习页资源区直接不出现）
      resources.value = await courseResourceService.list(cid).catch(() => [])

      pageState.value = chaptersRaw.length ? 'ready' : 'empty'
    } catch (e) {
      if (e?.response?.status === 403) {
        pageState.value = 'forbidden'
      } else {
        console.error('获取课程学习数据失败:', e)
        pageState.value = 'error'
      }
    }
  }

  // ── 目录展开态（命令式）：初始只展开当前课时祖先链（§4.2），切换时按需展开 ──
  // 注意：必须从 chapterTree.value（响应式代理）走树定位再改 expanded，
  // 直接改归一化期的原始对象不会触发重渲染。
  function findChapterInTree(chapterId) {
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n.id === chapterId) return n
        const hit = walk(n.children)
        if (hit) return hit
      }
      return null
    }
    return walk(chapterTree.value)
  }

  function collapseAll() {
    const walk = (nodes) => nodes.forEach((n) => { n.expanded = false; walk(n.children) })
    walk(chapterTree.value)
  }

  function expandTo(chapterId) {
    // 展开目标章节自身 + 全部祖先（当前章节须展开，§4.2）
    let node = findChapterInTree(chapterId)
    while (node) {
      node.expanded = true
      node = node.parentId != null ? findChapterInTree(node.parentId) : null
    }
  }

  function findEntry(lessonId) {
    const id = Number(lessonId)
    return flatLessons.value.find((i) => i.lesson.id === id) || null
  }

  return {
    pageState, chapterTree, flatLessons, summary,
    courseTitle, courseMode, resources, lastLessonId,
    load, collapseAll, expandTo, findEntry
  }
}
