<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="八边形三角形分割">
    <g :transform="`translate(${cx},${cy})`" class="octagon-group">
      <path
        v-for="(t, i) in triangles"
        :key="i"
        :d="t.d"
        :fill="t.fill"
        :stroke="strokeColor"
        :stroke-width="strokeWidth"
        :style="{
          transition: 'transform 260ms cubic-bezier(.2,.9,.3,1), opacity 200ms',
          transformOrigin: '0 0'
        }"
        class="oct-triangle"
        @click="$emit('triangle-click', { index: i, triangle: t })"
        @mouseenter="$emit('triangle-hover', { index: i })"
      />
    </g>
  </svg>
</template>

<script setup>
import { computed, toRefs } from 'vue'

const props = defineProps({
  size: { type: Number, default: 240 },          // svg 宽高
  radius: { type: Number, default: 86 },         // 外接圆半径（顶点距离中心）
  cornerRadius: { type: Number, default: 8 },    // 圆角半径（每个三角形的角）
  count: { type: Number, default: 8 },           // 三角形数量（默认 8）
  colors: { type: Array, default: () => ['#409eff', '#67c23a'] },
  strokeColor: { type: String, default: 'rgba(0,0,0,0.12)' },
  strokeWidth: { type: Number, default: 0.8 },
  innerGap: { type: Number, default: 0 },        // 中心偏移
  gap: { type: Number, default: 4 },             // 三角形之间的缝隙，单位：像素（沿边缩进）
  equilateral: { type: Boolean, default: false },// 是否渲染等边三角形（而非中心放射）
  triangleSize: { type: Number, default: 36 }    // 用于等边三角形时的边长（px）
  , uniformColor: { type: String, default: '' }  // 若设置，优先使用此颜色填充所有三角形
})

const emit = defineEmits(['triangle-click', 'triangle-hover'])

const { size, radius, cornerRadius, count, colors, innerGap } = toRefs(props)

const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)

/**
 * 辅助：向量运算
 */
function vec(x, y) { return { x, y } }
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y } }
function add(a, b) { return { x: a.x + b.x, y: a.y + b.y } }
function mul(v, s) { return { x: v.x * s, y: v.y * s } }
function len(v) { return Math.hypot(v.x, v.y) || 1e-6 }
function norm(v) { const L = len(v); return { x: v.x / L, y: v.y / L } }

/**
 * 生成单个三角形的圆角路径（使用二次贝塞尔近似圆角）
 * 顶点顺序： v0 (中心) -> v1 -> v2 （逆时针或顺时针）
 * 算法：
 *  - 对每个顶点 vi，计算沿相邻边距离 r 的两个点（靠近 vi 的点）
 *  - 用直线连接上一个顶点的 end 点到当前顶点的 start 点
 *  - 使用 Q 控制点为 vi 来绘制圆角（平滑）
 */
function roundedPolygonPath(verts, rCorner) {
  const n = verts.length
  if (n === 0) return ''
  // 若 rCorner 为 0，直接 polygon
  if (!rCorner) {
    return verts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' ') + ' Z'
  }

  // 计算每个顶点 start/end 点： start = vi + normalize(v_{i-1}-vi)*r, end = vi + normalize(v_{i+1}-vi)*r
  const starts = []
  const ends = []
  for (let i = 0; i < n; i++) {
    const vi = verts[i]
    const vPrev = verts[(i - 1 + n) % n]
    const vNext = verts[(i + 1) % n]
    // 最大允许半径，避免超出边长度的一半
    const maxR = Math.min(len(sub(vi, vPrev)), len(sub(vi, vNext))) * 0.49
    const r = Math.min(rCorner, maxR)
    const start = add(vi, mul(norm(sub(vPrev, vi)), r)) // 沿到前一个顶点方向移动 r
    const end = add(vi, mul(norm(sub(vNext, vi)), r))   // 沿到下一个顶点方向移动 r
    starts.push(start)
    ends.push(end)
  }

  // 构造路径：从 ends[0] 开始，依次 line 到 starts[i]，然后 Q vi to ends[i]
  let d = ''
  d += `M ${ends[0].x.toFixed(3)} ${ends[0].y.toFixed(3)} `
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n
    // 直线到当前顶点的 start（在上一边末端）
    d += `L ${starts[next].x.toFixed(3)} ${starts[next].y.toFixed(3)} `
    // 绘制二次贝塞尔，控制点为顶点 vi，结束点为 ends[next]
    const vi = verts[next]
    d += `Q ${vi.x.toFixed(3)} ${vi.y.toFixed(3)} ${ends[next].x.toFixed(3)} ${ends[next].y.toFixed(3)} `
  }
  d += 'Z'
  return d
}

/**
 * 生成 8 个三角形（三角形顶点包含中心）
 */
const triangles = computed(() => {
  const arr = []
  const n = props.count
  const step = (Math.PI * 2) / n
  // 如果 innerGap > 0，则中心点向外偏移（减少中心重叠）
  const centerOffset = props.innerGap || 0
  const center = vec(0 + centerOffset, 0)
  for (let i = 0; i < n; i++) {
    const a = i * step
    // 两种模式：放射三角形（中心为顶点）或等边三角形（以外接圆为中心排列）
    if (!props.equilateral) {
      // 放射三角形：两侧顶点在外接圆
      const x1 = Math.cos(a) * props.radius
      const y1 = Math.sin(a) * props.radius
      const x2 = Math.cos(a + step) * props.radius
      const y2 = Math.sin(a + step) * props.radius

      // 处理 gap：在每条边上向内缩进 gap 像素（对应三角形的底边进行缩放）
      const p1 = vec(x1, y1)
      const p2 = vec(x2, y2)
      // 将 p1/p2 向中心移动一段距离，以制造缝隙
      const shrinkDir1 = norm(sub(center, p1))
      const shrinkDir2 = norm(sub(center, p2))
      const p1s = add(p1, mul(shrinkDir1, props.gap))
      const p2s = add(p2, mul(shrinkDir2, props.gap))

      const verts = [
        center,
        p1s,
        p2s
      ]
      // 为了制造更明显的缝隙：计算三角形质心，并把每个顶点向质心移动 gap 像素
      const triCenter = { x: (center.x + p1s.x + p2s.x) / 3, y: (center.y + p1s.y + p2s.y) / 3 }
      const g = props.gap || 0
      const shrinkVertex = (p) => add(p, mul(norm(sub(triCenter, p)), g))
      const v0 = shrinkVertex(center)
      const v1s = shrinkVertex(p1s)
      const v2s = shrinkVertex(p2s)
      const d = roundedPolygonPath([v0, v1s, v2s], props.cornerRadius)
      arr.push({ d, fill: props.uniformColor || props.colors[i % props.colors.length] })
    } else {
      // 等边三角形：以外接点作为三角形中心，三角形顶点按旋转生成
      // 计算每个三角形的中心点（在外接圆上）
      const cxTri = Math.cos(a) * props.radius
      const cyTri = Math.sin(a) * props.radius

      // 等边三角形边长 s = triangleSize，顶点位于中心点附近。我们让三角形朝外（指向外侧）
      const s = props.triangleSize
      const h = Math.sqrt(3) / 2 * s // 高

      // 让等边三角形的一个顶点朝向圆外侧
      const dir = norm(vec(cxTri, cyTri))
      // 外顶点
      const outer = add(vec(cxTri, cyTri), mul(dir, h * 0.33))
      // 另外两个顶点相对于外顶点按 ±60° 计算
      const angle = Math.atan2(dir.y, dir.x)
      const a1 = angle + Math.PI - Math.PI / 3
      const a2 = angle + Math.PI + Math.PI / 3
      const v1 = add(vec(cxTri, cyTri), vec(Math.cos(a1) * s / 2, Math.sin(a1) * s / 2))
      const v2 = add(vec(cxTri, cyTri), vec(Math.cos(a2) * s / 2, Math.sin(a2) * s / 2))

      // 在等边模式下，若需要间隙，可把三个顶点拉向三角形中心
      const triCenter = vec(cxTri, cyTri)
      const gap = props.gap
      const pv0 = add(outer, mul(norm(sub(triCenter, outer)), gap))
      const pv1 = add(v1, mul(norm(sub(triCenter, v1)), gap))
      const pv2 = add(v2, mul(norm(sub(triCenter, v2)), gap))

      const verts = [pv0, pv1, pv2]
  // 等边三角形也使用质心收缩以制造 gap
  const triCenter2 = { x: (pv0.x + pv1.x + pv2.x) / 3, y: (pv0.y + pv1.y + pv2.y) / 3 }
  const g2 = props.gap || 0
  const sv0 = add(pv0, mul(norm(sub(triCenter2, pv0)), g2))
  const sv1 = add(pv1, mul(norm(sub(triCenter2, pv1)), g2))
  const sv2 = add(pv2, mul(norm(sub(triCenter2, pv2)), g2))
  const d = roundedPolygonPath([sv0, sv1, sv2], props.cornerRadius)
  arr.push({ d, fill: props.uniformColor || props.colors[i % props.colors.length] })
    }
  }
  return arr
})
</script>

<style scoped>
/* octagon-group 样式由 transform 管理，无需空规则 */

.oct-triangle {
  cursor: pointer;
  opacity: 0.98;
  transition: transform 260ms cubic-bezier(.2,.9,.3,1), opacity 180ms;
}

.oct-triangle:hover {
  transform: scale(1.05);
  opacity: 1;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,0.12));
}
</style>