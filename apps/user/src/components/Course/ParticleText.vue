<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  text: { type: String, default: 'React Bits' },
  particleSize: { type: Number, default: 2 },
  density: { type: Number, default: 4 },
  color: { type: String, default: '#ffffff' },
  highlightColor: { type: String, default: '#8b5cf6' },
  scatter: { type: Number, default: 180 },
  gatherDuration: { type: Number, default: 1600 },
  stagger: { type: Number, default: 420 },
  pointerRepel: { type: Number, default: 40 },
  repelRadius: { type: Number, default: 120 },
  idleDrift: { type: Number, default: 0.7 },
  trigger: { type: String, default: 'mount' },
  fontSize: { type: [Number, String], default: 'clamp(2.5rem, 6vw, 5rem)' },
  fontWeight: { type: [Number, String], default: 800 },
  fontFamily: { type: String, default: 'inherit' },
  glow: { type: Boolean, default: true },
})

const containerRef = ref(null)
const canvasRef = ref(null)

let context
let particles = []
let animationFrame = null
let resizeFrame = null
let resizeObserver
let reduceMotionQuery
let buildId = 0
let gathering = false
let gatherStart = 0
let reducedMotion = false
let width = 0
let height = 0

const pointer = { active: false, x: 0, y: 0, smoothX: 0, smoothY: 0 }
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const easeOutCubic = value => 1 - Math.pow(1 - value, 3)

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

const mixRgb = (from, to, amount) => ({
  r: Math.round(from.r + (to.r - from.r) * amount),
  g: Math.round(from.g + (to.g - from.g) * amount),
  b: Math.round(from.b + (to.b - from.b) * amount),
})

const rgbToCss = rgb => `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`

const waitForFonts = async (font) => {
  if (!('fonts' in document)) return
  try {
    await document.fonts.load(font)
  } catch {
    // The system font stack remains available if an individual face cannot load.
  }
  await document.fonts.ready
}

const resolveFontSize = (value, container, fontFamily) => {
  if (typeof value === 'number') return value
  const probe = document.createElement('span')
  probe.textContent = 'M'
  Object.assign(probe.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    fontSize: value,
    fontWeight: String(props.fontWeight),
    fontFamily,
  })
  container.appendChild(probe)
  const size = parseFloat(window.getComputedStyle(probe).fontSize) || 64
  probe.remove()
  return size
}

const startGather = (fromScatter = true) => {
  if (!particles.length) return
  const spread = reducedMotion ? 0 : props.scatter
  particles.forEach((particle) => {
    if (fromScatter) {
      const angle = particle.seed * Math.PI * 2
      const distance = spread * (0.35 + particle.depth * 0.75)
      particle.x = particle.targetX + Math.cos(angle) * distance + (particle.depth - 0.5) * spread * 0.55
      particle.y = particle.targetY + Math.sin(angle) * distance + (particle.seed - 0.5) * spread * 0.55
    }
    particle.startX = particle.x
    particle.startY = particle.y
    particle.delay = reducedMotion ? 0 : particle.seed * props.stagger
  })
  gatherStart = performance.now()
  gathering = true
}

const drawParticle = (particle) => {
  context.fillStyle = particle.color
  if (particle.size <= 2.1) {
    context.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size)
    return
  }
  context.beginPath()
  context.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2)
  context.fill()
}

const render = (now) => {
  context.clearRect(0, 0, width, height)
  context.shadowBlur = props.glow && !reducedMotion ? props.particleSize * 3 : 0
  context.shadowColor = props.highlightColor
  pointer.smoothX += (pointer.x - pointer.smoothX) * 0.18
  pointer.smoothY += (pointer.y - pointer.smoothY) * 0.18

  let complete = true
  particles.forEach((particle) => {
    let baseX = particle.targetX
    let baseY = particle.targetY
    let progress = 1
    if (gathering) {
      const local = (now - gatherStart - particle.delay) / Math.max(1, reducedMotion ? 1 : props.gatherDuration)
      progress = clamp(local, 0, 1)
      const eased = easeOutCubic(progress)
      baseX = particle.startX + (particle.targetX - particle.startX) * eased
      baseY = particle.startY + (particle.targetY - particle.startY) * eased
      if (progress < 1) complete = false
    } else if (!reducedMotion && props.idleDrift > 0) {
      const driftTime = now * 0.001
      baseX += Math.sin(driftTime * 0.9 + particle.seed * 10) * props.idleDrift * particle.depth
      baseY += Math.cos(driftTime * 0.75 + particle.depth * 10) * props.idleDrift * particle.depth
    }

    if (pointer.active && !reducedMotion && props.pointerRepel > 0 && props.repelRadius > 0) {
      const dx = baseX - pointer.smoothX
      const dy = baseY - pointer.smoothY
      const distance = Math.hypot(dx, dy)
      if (distance > 0 && distance < props.repelRadius) {
        const force = Math.pow(1 - distance / props.repelRadius, 2) * props.pointerRepel
        baseX += (dx / distance) * force
        baseY += (dy / distance) * force
      }
    }

    const follow = reducedMotion ? 1 : 0.22
    particle.x += (baseX - particle.x) * follow
    particle.y += (baseY - particle.y) * follow
    context.globalAlpha = clamp(0.35 + progress * 0.65, 0, 1)
    drawParticle(particle)
  })

  context.globalAlpha = 1
  context.shadowBlur = 0
  if (gathering && complete) gathering = false
  animationFrame = window.requestAnimationFrame(render)
}

const sampleText = async () => {
  const container = containerRef.value
  const canvas = canvasRef.value
  if (!container || !canvas || !context) return
  const currentBuild = ++buildId
  const rect = container.getBoundingClientRect()
  width = Math.floor(rect.width)
  height = Math.floor(rect.height)
  if (width <= 0 || height <= 0) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.max(1, Math.floor(width * dpr))
  canvas.height = Math.max(1, Math.floor(height * dpr))
  context.setTransform(dpr, 0, 0, dpr, 0, 0)

  const computed = window.getComputedStyle(container)
  const resolvedFamily = props.fontFamily === 'inherit' ? computed.fontFamily || 'sans-serif' : props.fontFamily
  let resolvedSize = resolveFontSize(props.fontSize, container, resolvedFamily)
  let font = `${props.fontWeight} ${resolvedSize}px ${resolvedFamily}`
  await waitForFonts(font)
  if (currentBuild !== buildId) return

  const offscreen = document.createElement('canvas')
  const offscreenContext = offscreen.getContext('2d', { willReadFrequently: true })
  if (!offscreenContext) return
  const content = String(props.text || ' ')
  const maxTextWidth = width * 0.88
  offscreenContext.font = font
  let metrics = offscreenContext.measureText(content)
  if (metrics.width > maxTextWidth) {
    resolvedSize = Math.max(20, resolvedSize * (maxTextWidth / Math.max(1, metrics.width)))
    font = `${props.fontWeight} ${resolvedSize}px ${resolvedFamily}`
    await waitForFonts(font)
    if (currentBuild !== buildId) return
    offscreenContext.font = font
    metrics = offscreenContext.measureText(content)
  }

  const left = Math.ceil(metrics.actualBoundingBoxLeft || 0)
  const right = Math.ceil(metrics.actualBoundingBoxRight || metrics.width)
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || resolvedSize * 0.78)
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || resolvedSize * 0.22)
  const padding = Math.max(12, Math.ceil(resolvedSize * 0.08))
  offscreen.width = Math.max(1, left + right + padding * 2)
  offscreen.height = Math.max(1, ascent + descent + padding * 2)
  offscreenContext.font = font
  offscreenContext.textAlign = 'left'
  offscreenContext.textBaseline = 'alphabetic'
  offscreenContext.fillStyle = '#ffffff'
  offscreenContext.fillText(content, padding - left, padding + ascent)

  const imageData = offscreenContext.getImageData(0, 0, offscreen.width, offscreen.height)
  const targets = []
  const step = Math.max(2, Math.floor(props.density))
  for (let y = 0; y < offscreen.height; y += step) {
    for (let x = 0; x < offscreen.width; x += step) {
      const alpha = imageData.data[(y * offscreen.width + x) * 4 + 3]
      if (alpha > 40) {
        targets.push({
          x: width / 2 - offscreen.width / 2 + x,
          y: height / 2 - offscreen.height / 2 + y,
          alpha: alpha / 255,
        })
      }
    }
  }

  const maxParticles = Math.max(900, Math.min(5200, Math.floor((width * height) / 90)))
  const stride = Math.max(1, Math.ceil(targets.length / maxParticles))
  const baseRgb = hexToRgb(props.color)
  const highlightRgb = hexToRgb(props.highlightColor)
  particles = targets.filter((_, index) => index % stride === 0).map((target, index) => {
    const seed = ((index * 9301 + 49297) % 233280) / 233280
    const depth = 0.45 + (((index * 233 + 97) % 1000) / 1000) * 0.9
    const blend = baseRgb && highlightRgb
      ? clamp(target.x / Math.max(1, width) + (seed - 0.5) * 0.35, 0, 1)
      : 0
    const particleColor = baseRgb && highlightRgb
      ? rgbToCss(mixRgb(baseRgb, highlightRgb, blend))
      : props.color
    const angle = seed * Math.PI * 2
    const distance = (reducedMotion ? 0 : props.scatter) * (0.35 + depth * 0.75)
    const startX = target.x + Math.cos(angle) * distance + (seed - 0.5) * props.scatter * 0.45
    const startY = target.y + Math.sin(angle) * distance + (depth - 0.9) * props.scatter * 0.45
    return {
      x: reducedMotion ? target.x : startX,
      y: reducedMotion ? target.y : startY,
      startX,
      startY,
      targetX: target.x,
      targetY: target.y,
      size: Math.max(0.6, props.particleSize * (0.75 + target.alpha * 0.45)),
      color: particleColor,
      seed,
      depth,
      delay: seed * props.stagger,
    }
  })

  pointer.x = width / 2
  pointer.y = height / 2
  pointer.smoothX = pointer.x
  pointer.smoothY = pointer.y
  startGather(false)
  if (animationFrame === null) animationFrame = window.requestAnimationFrame(render)
}

const queueSample = () => {
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame)
  resizeFrame = window.requestAnimationFrame(sampleText)
}

const handlePointerMove = (event) => {
  const rect = canvasRef.value.getBoundingClientRect()
  pointer.x = event.clientX - rect.left
  pointer.y = event.clientY - rect.top
  pointer.active = true
}

const handlePointerEnter = (event) => {
  handlePointerMove(event)
  if (props.trigger === 'hover') startGather(true)
}

const handlePointerLeave = () => { pointer.active = false }
const handleClick = () => { if (props.trigger === 'click') startGather(true) }
const handleReduceMotionChange = (event) => {
  reducedMotion = event.matches
  sampleText()
}

onMounted(async () => {
  await nextTick()
  context = canvasRef.value?.getContext('2d')
  if (!context) return
  reduceMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  reducedMotion = reduceMotionQuery?.matches ?? false
  reduceMotionQuery?.addEventListener('change', handleReduceMotionChange)
  resizeObserver = new ResizeObserver(queueSample)
  resizeObserver.observe(containerRef.value)
  sampleText()
})

watch(() => [props.text, props.particleSize, props.density, props.color, props.highlightColor, props.fontSize, props.fontWeight, props.fontFamily], queueSample)

onBeforeUnmount(() => {
  buildId += 1
  resizeObserver?.disconnect()
  reduceMotionQuery?.removeEventListener('change', handleReduceMotionChange)
  if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame)
})
</script>

<template>
  <div ref="containerRef" class="particle-text" :aria-label="text">
    <canvas
      ref="canvasRef"
      class="particle-text__canvas"
      aria-hidden="true"
      @pointerenter="handlePointerEnter"
      @pointermove="handlePointerMove"
      @pointerleave="handlePointerLeave"
      @click="handleClick"
    />
    <span class="particle-text__sr">{{ text }}</span>
  </div>
</template>

<style scoped>
.particle-text {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 220px;
  overflow: hidden;
  touch-action: pan-y;
  isolation: isolate;
  font-family: var(--dew-font);
}

.particle-text__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.particle-text__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
