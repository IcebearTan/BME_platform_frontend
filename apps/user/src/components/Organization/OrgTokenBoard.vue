<script setup>
// 组别令牌墙（三省六部意象）：竖排组名大令牌，强玻璃质感 + 鱼贯入场。
// 点击令牌 = 钻入该组（导航与面包屑由父层 OrganizationView 负责）。
// 计数含子孙上卷（/organization 契约 §4.1），0 人显示招新中。
import { DewCard } from '@bme/dew-ui'

defineProps({
  groups: { type: Array, default: () => [] },
  dense: { type: Boolean, default: false },   // 子组层令牌略小
})
defineEmits(['select'])

const total = (node) => {
  const c = node.counts || {}
  return (c.primary || 0) + (c.secondary || 0)
}
</script>

<template>
  <div class="token-board" :class="{ 'token-board--dense': dense }">
    <DewCard
      v-for="(g, i) in groups"
      :key="g.id || g.name"
      class="token"
      :class="{ 'token--dense': dense }"
      glass
      interactive
      :style="{ '--i': i }"
      @click="$emit('select', g)"
    >
      <!-- 令牌形制：穿绳孔 + 内刻线框 + 竖排大名 + 脚注计数，无交互语义 -->
      <span class="token-hole" aria-hidden="true"></span>
      <span class="token-frame" aria-hidden="true"></span>
      <span class="token-name" :title="g.name">{{ g.name }}</span>
      <span class="token-foot">
        <span class="token-divider" aria-hidden="true"></span>
        <span class="token-count" :class="{ 'token-count--empty': !total(g) }">
          {{ total(g) ? `${total(g)} 人` : '招新中' }}
        </span>
      </span>
    </DewCard>
  </div>
</template>

<style scoped>
.token-board {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px;
}

/* 令牌本体：强玻璃壳 + 窄高形制（高度定死保证一排齐整，一级组名 ≤6 字富余） */
.token {
  width: 168px;
  height: 292px;
  border-radius: 18px;
}

.token--dense {
  width: 132px;
  height: 240px;
  border-radius: 16px;
}

/* body 掏空自带 padding，改立式三段：孔 / 名 / 脚注 */
.token :deep(.dew-card__body) {
  height: 100%;
  padding: 20px 0 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 穿绳孔：环 + 穿透阴影 */
.token-hole {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid var(--dew-card-border);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
}

/* 内刻线框（令牌镶边） */
.token-frame {
  position: absolute;
  inset: 10px;
  border-radius: 11px;
  border: 1px solid color-mix(in srgb, var(--dew-text-heading) 12%, transparent);
  pointer-events: none;
}

.token--dense .token-frame {
  inset: 8px;
  border-radius: 9px;
}

/* 竖排组名：CJK 直立，大字重拉字距见筋骨。
   字形走系统宋体栈（纯系统字体，不引外源）——竖排宋体是牌匾/令牌的母语；
   阴刻深度：亮色下缘细高光（玻璃面凹字），暗色换压印暗影 */
.token-name {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  padding-top: 14px;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 0.3em;
  font-family: "Songti SC", "STSong", "SimSun", "Noto Serif CJK SC", serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
  color: var(--dew-text-heading);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55);
  overflow: hidden;
}

/* 暗色主题：刻痕改为压印暗影（祖先 .theme-dark 在页面根上，末位选择器命中本组件作用域即可） */
.theme-dark .token-name {
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.45);
}

.token--dense .token-name {
  padding-top: 10px;
  font-size: 19px;
  letter-spacing: 0.24em;
}

/* 脚注：短横线 + 计数 */
.token-foot {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

.token-divider {
  width: 18px;
  height: 1px;
  background: color-mix(in srgb, var(--dew-text-muted) 45%, transparent);
}

.token-count {
  font-size: 12px;
  letter-spacing: 0.05em;
  color: var(--dew-text-muted);
  white-space: nowrap;
}

.token-count--empty {
  opacity: 0.85;
}

/* 鱼贯入场：令牌依次升座（整墙重挂载即重放；backwards 填充——
   动画结束后不再占住 transform，DewCard 的 hover 上浮才能接管） */
.token {
  animation: token-rise 0.55s var(--dew-bounce) backwards;
  animation-delay: calc(var(--i, 0) * 55ms);
}

@keyframes token-rise {
  from {
    opacity: 0;
    transform: translateY(26px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端：3×2 令牌阵 */
@media (max-width: 768px) {
  .token-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .token {
    width: auto;
    height: 212px;
    border-radius: 14px;
  }

  .token--dense {
    width: auto;
    height: 188px;
  }

  .token :deep(.dew-card__body) {
    padding: 14px 0 12px;
  }

  .token-name {
    padding-top: 10px;
    font-size: 17px;
  }

  .token--dense .token-name {
    font-size: 15px;
  }
}
</style>
