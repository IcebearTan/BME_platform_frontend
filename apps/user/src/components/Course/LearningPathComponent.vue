<template>
  <div
    class="container"
    ref="containerRef"
    @mouseleave="handleMouseLeave"
  >
    <!-- SVG covers entire container + expand area -->
    <svg class="lines-svg" width="1100" height="300">
      <defs>
        <marker v-for="color in colorList" :key="color.id" :id="'arrow-' + color.id"
          markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" :fill="color.line" fill-opacity="0.5" />
        </marker>
      </defs>
      <path v-for="(line, i) in lines" :key="i"
        :d="line.d" fill="none"
        :stroke="line.color" stroke-width="1.5"
        stroke-dasharray="6,3"
        :marker-end="'url(#arrow-' + line.groupId + ')'"
        opacity="0.6"
      />
    </svg>

    <div class="left-title">
      <div class="title">探索学习路径</div>
      <div class="subtitle">成为卓越工程师</div>
    </div>

    <div class="hint-arrow" :class="{ hide: activeGroup }">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <div class="right-area" ref="rightAreaRef">
      <!-- group buttons: never move -->
      <div class="group-buttons">
        <div
          v-for="node in rootNodes" :key="node.id"
          class="node group-btn"
          :class="[
            'group-' + node.group,
            { active: activeGroup === node.group, dimmed: activeGroup && activeGroup !== node.group }
          ]"
          :data-node-id="node.id"
          @mouseenter="handleGroupEnter(node.group)"
        >
          <span class="dot" :class="'dot-' + node.group"></span>
          <span>{{ node.label }}</span>
        </div>
      </div>

      <!-- expand area: absolutely positioned, does not affect button layout -->
      <transition name="fade-expand">
        <div v-if="activeGroup" class="expand-area" :key="activeGroup" :style="{ left: expandLeft + 'px' }">
          <div class="tree-columns">
            <div class="tree-col">
              <div
                v-for="node in level1Nodes" :key="node.id"
                class="node"
                :class="['level-1', 'group-' + node.group]"
                :data-node-id="node.id"
              >
                <span class="node-text">{{ node.label }}</span>
              </div>
            </div>
            <div class="tree-col" v-if="level2Nodes.length">
              <div
                v-for="node in level2Nodes" :key="node.id"
                class="node"
                :class="['level-2', 'group-' + node.group]"
                :data-node-id="node.id"
              >
                <span class="node-text">{{ node.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

const activeGroup = ref(null)
let leaveTimer = null

const handleGroupEnter = (group) => {
  clearTimeout(leaveTimer)
  activeGroup.value = group
}

const handleMouseLeave = () => {
  leaveTimer = setTimeout(() => { activeGroup.value = null }, 200)
}

const groupColors = {
  hardware: { id: 'hardware', dot: '#ef582a', line: '#ef582a' },
  software: { id: 'software', dot: '#2761ff', line: '#2761ff' },
  manufacturing: { id: 'manufacturing', dot: '#2eaa50', line: '#2eaa50' },
}

const colorList = Object.values(groupColors)

const rootNodes = [
  { id: 'hardware', label: '硬件组', group: 'hardware' },
  { id: 'software', label: '软件组', group: 'software' },
  { id: 'manufacturing', label: '先进制造组', group: 'manufacturing' },
]

const allNodes = [
  { id: 'circuit', label: '电路组', level: 1, group: 'hardware' },
  { id: 'embedded', label: '嵌软组', level: 1, group: 'hardware' },
  { id: 'repair', label: '拆修小队', level: 1, group: 'hardware' },
  { id: 'web', label: 'Web开发组', level: 1, group: 'software' },
  { id: 'robot', label: '机器人组', level: 1, group: 'software' },
  { id: 'ai', label: 'AI组', level: 1, group: 'software' },
  { id: 'vr', label: '虚拟现实组', level: 1, group: 'software' },
  { id: 'print3d', label: '3D打印组', level: 1, group: 'manufacturing' },
  { id: 'modeling', label: '建模仿真组', level: 1, group: 'manufacturing' },
  { id: 'flexible', label: '柔性电子', level: 1, group: 'manufacturing' },
  { id: 'imaging', label: '医学影像', level: 2, parent: 'robot', group: 'software' },
  { id: 'cv', label: '计算机视觉', level: 2, parent: 'robot', group: 'software' },
  { id: 'control', label: '机器人控制', level: 2, parent: 'robot', group: 'software' },
  { id: 'dl', label: '深度学习组', level: 2, parent: 'ai', group: 'software' },
  { id: 'llm', label: '大模型组', level: 2, parent: 'ai', group: 'software' },
]

const allEdges = [
  ['hardware', 'circuit'], ['hardware', 'embedded'], ['hardware', 'repair'],
  ['software', 'web'], ['software', 'robot'], ['software', 'ai'], ['software', 'vr'],
  ['manufacturing', 'print3d'], ['manufacturing', 'modeling'], ['manufacturing', 'flexible'],
  ['robot', 'imaging'], ['robot', 'cv'], ['robot', 'control'],
  ['ai', 'dl'], ['ai', 'llm'],
]

const level1Nodes = computed(() =>
  allNodes.filter(n => n.level === 1 && n.group === activeGroup.value)
)

const level2Nodes = computed(() => {
  const l1Ids = level1Nodes.value.map(n => n.id)
  return allNodes.filter(n => n.level === 2 && n.parent && l1Ids.includes(n.parent))
})

const activeEdges = computed(() => {
  const g = activeGroup.value
  if (!g) return []
  const rootId = rootNodes.find(n => n.group === g)?.id
  return allEdges.filter(([from]) => from === rootId || level1Nodes.value.some(n => n.id === from))
})

function groupColorIdOf(nodeId) {
  const n = allNodes.find(n => n.id === nodeId) || rootNodes.find(n => n.id === nodeId)
  return n?.group || 'hardware'
}

function nodeColor(group) {
  return groupColors[group]?.dot || '#999'
}

const containerRef = ref(null)
const rightAreaRef = ref(null)
const lines = ref([])
const expandLeft = ref(0)

const updateExpandPosition = () => {
  if (!activeGroup.value || !rightAreaRef.value) return
  const rRect = rightAreaRef.value.getBoundingClientRect()
  const activeEl = rightAreaRef.value.querySelector(`.group-btn.group-${activeGroup.value}`)
  if (!activeEl) return
  const bRect = activeEl.getBoundingClientRect()
  expandLeft.value = bRect.right - rRect.left + 50
}

const computeLines = () => {
  const result = []
  if (!activeGroup.value || !containerRef.value) { lines.value = result; return }

  const cRect = containerRef.value.getBoundingClientRect()

  for (const [from, to] of activeEdges.value) {
    const fromEl = containerRef.value.querySelector(`[data-node-id="${from}"]`)
    const toEl = containerRef.value.querySelector(`[data-node-id="${to}"]`)
    if (!fromEl || !toEl) continue

    const fRect = fromEl.getBoundingClientRect()
    const tRect = toEl.getBoundingClientRect()

    const x1 = fRect.right - cRect.left
    const y1 = fRect.top + fRect.height / 2 - cRect.top
    const x2 = tRect.left - cRect.left
    const y2 = tRect.top + tRect.height / 2 - cRect.top

    const cx = (x1 + x2) / 2
    result.push({
      d: `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`,
      color: groupColors[groupColorIdOf(from)]?.line || '#999',
      groupId: groupColorIdOf(from),
    })
  }
  lines.value = result
}

watch(activeGroup, () => {
  nextTick(() => {
    updateExpandPosition()
    nextTick(() => {
      computeLines()
    })
  })
})

onUnmounted(() => {
  clearTimeout(leaveTimer)
})
</script>

<style scoped>
.container {
  max-width: 1174px;
  min-width: 390px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  height: 100%;
  position: relative;
  overflow: visible;
}

.lines-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

/* ---- left title ---- */
.left-title {
  width: 220px;
  flex-shrink: 0;
  padding-right: 24px;
  box-sizing: border-box;
}

.title {
  font-size: 34px;
  font-weight: 700;
  margin-bottom: 6px;
  white-space: nowrap;
  letter-spacing: 1px;
}

.subtitle {
  font-size: 20px;
  color: #555;
  white-space: nowrap;
}

/* ---- hint arrow ---- */
.hint-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  margin: 0 4px;
  animation: arrowPulse 2s ease-in-out infinite;
  transition: opacity 0.3s, transform 0.3s;
  flex-shrink: 0;
}

.hint-arrow.hide {
  opacity: 0;
  transform: translateX(-6px);
}

@keyframes arrowPulse {
  0%, 100% { transform: translateX(0); opacity: 0.5; }
  50% { transform: translateX(6px); opacity: 1; }
}

/* ---- right area ---- */
.right-area {
  flex: 1;
  min-width: 0;
  position: relative;
  display: flex;
  align-items: center;
}

.group-buttons {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
  z-index: 2;
}

/* ---- expand area: absolute, doesn't push buttons ---- */
.expand-area {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  overflow: visible;
  z-index: 0;
}

.fade-expand-enter-active {
  transition: opacity 0.25s ease;
}
.fade-expand-leave-active {
  transition: opacity 0.15s ease;
}
.fade-expand-enter-from,
.fade-expand-leave-to {
  opacity: 0;
}

.tree-columns {
  display: flex;
  align-items: flex-start;
  gap: 80px;
}

.tree-col {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 10px;
}

/* ---- nodes ---- */
.node {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  height: 30px;
  font-size: 13px;
  white-space: nowrap;
  background: #f9f9f9;
  color: #555;
  transition: all 0.2s;
  cursor: default;
}

.node:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
}

/* group buttons */
.group-btn {
  height: 44px;
  padding: 8px 22px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 12px;
  border-width: 1.5px;
  border-style: solid;
  cursor: pointer;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.5),
    0 1px 4px rgba(0,0,0,0.06);
}

.group-btn.dimmed {
  opacity: 0;
}

.group-btn.active {
  transform: scale(1.08);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.6),
    0 4px 16px rgba(0,0,0,0.1);
  z-index: 3;
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.dot-hardware {
  background: radial-gradient(circle at 35% 35%, #ffb89e, #ef582a 70%);
}
.dot-software {
  background: radial-gradient(circle at 35% 35%, #b8d4ff, #2761ff 70%);
}
.dot-manufacturing {
  background: radial-gradient(circle at 35% 35%, #a8e8b8, #2eaa50 70%);
}

/* group colors - glass effect */
.group-hardware { border-color: rgba(240, 140, 110, 0.5); color: #b53318; }
.group-hardware.group-btn { background: rgba(255, 235, 225, 0.65); }
.group-hardware.level-1 { background: rgba(255, 240, 233, 0.55); border-color: rgba(240, 140, 110, 0.35); }
.group-hardware.level-2 { background: rgba(255, 240, 233, 0.45); border-color: rgba(240, 140, 110, 0.3); }

.group-software { border-color: rgba(100, 155, 240, 0.5); color: #1a3fa0; }
.group-software.group-btn { background: rgba(225, 235, 255, 0.65); }
.group-software.level-1 { background: rgba(232, 240, 255, 0.55); border-color: rgba(100, 155, 240, 0.35); }
.group-software.level-2 { background: rgba(232, 240, 255, 0.45); border-color: rgba(100, 155, 240, 0.3); }

.group-manufacturing { border-color: rgba(90, 200, 120, 0.5); color: #1a6e35; }
.group-manufacturing.group-btn { background: rgba(228, 248, 234, 0.65); }
.group-manufacturing.level-1 { background: rgba(235, 250, 240, 0.55); border-color: rgba(90, 200, 120, 0.35); }
.group-manufacturing.level-2 { background: rgba(235, 250, 240, 0.45); border-color: rgba(90, 200, 120, 0.3); }

.level-1 { font-size: 12px; }
.level-2 { font-size: 11px; padding: 4px 10px; height: 26px; border-radius: 5px; }

.node-text { white-space: nowrap; }
</style>
