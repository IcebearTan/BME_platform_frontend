# Dew UI 组件库

基于 Vue 3 的液态玻璃风格组件库。露珠般的晶莹、毛玻璃折射、柔和阴影、水滴弹性过渡。

## 快速开始

```js
import { DewButton, DewButtonBar, DewCard, DewBadge, DewTag } from '@/components/ui'
```

---

## DewButton 按钮

液态玻璃按钮，支持鼠标追踪折射、弹性宽度过渡、可切换点亮状态。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `string` | `'glass'` | 按钮类型：`glass` / `danger` / `ghost` |
| `size` | `string` | `'md'` | 尺寸：`sm` / `md` / `lg` |
| `active` | `boolean` | `false` | 点亮状态，可交互切换 |
| `disabled` | `boolean` | `false` | 禁用 |
| `block` | `boolean` | `false` | 撑满父容器宽度 |

### Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `click` | `Event` | 点击事件 |

### 使用示例

```vue
<template>
  <DewButton>确定</DewButton>
  <DewButton type="danger">删除</DewButton>
  <DewButton type="ghost">取消</DewButton>
  <DewButton :active="isOn" @click="isOn = !isOn">
    {{ isOn ? '已关注' : '关注' }}
  </DewButton>
</template>

<script setup>
import { ref } from 'vue'
import { DewButton } from '@/components/ui'
const isOn = ref(false)
</script>
```

### 视觉特性

- **鼠标追踪折射**：悬停时折射光和色散彩虹跟随鼠标实时变化
- **弹性宽度过渡**：内容变化时以水滴弹性曲线平滑变形
- **点亮状态**：`glass` 白光充盈，`danger` 红色光焰

---

## DewButtonBar 按钮栏

分段选择器，支持滑动指示器、图标、未读计数。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `items` | `Array` | — | 选项列表 `[{ value, label, icon?, badge? }]` |
| `modelValue` | `string/number` | `null` | 当前选中值（v-model） |
| `size` | `string` | `'md'` | 尺寸：`sm` / `md` |

---

## DewCard 卡片

圆角卡片容器，支持多种变体、毛玻璃、色彩底色和可交互模式。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `string` | `'default'` | 卡片变体：`default` / `elevated` / `inset` |
| `size` | `string` | `'md'` | 尺寸：`sm` / `md` / `lg`（控制内边距） |
| `glass` | `boolean` | `false` | 增强毛玻璃效果 |
| `interactive` | `boolean` | `false` | 可交互，带点击反馈 |
| `noHover` | `boolean` | `false` | 禁用悬停上浮效果 |
| `tinted` | `boolean` | `false` | 色彩底色模式 |
| `accent` | `string` | `null` | 强调色：`primary` / `success` / `warning` / `danger` / `info` |
| `divided` | `boolean` | `false` | 显示 header 底部分割线 |

### Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `click` | `Event` | 点击事件（`interactive` 模式下触发） |

### Slots

| 插槽 | 说明 |
|------|------|
| `header` | 卡片头部 |
| `default` | 卡片内容 |
| `footer` | 卡片底部 |

### 使用示例

```vue
<template>
  <DewCard>
    <template #header>标题</template>
    <p>卡片内容</p>
    <template #footer>
      <DewButton size="sm">确认</DewButton>
    </template>
  </DewCard>

  <DewCard variant="elevated">浮起</DewCard>
  <DewCard variant="inset">凹陷</DewCard>
  <DewCard :glass="true">毛玻璃</DewCard>
  <DewCard :tinted="true" accent="primary" :glass="true">色彩底色</DewCard>
  <DewCard :interactive="true" @click="handleClick">可点击</DewCard>
</template>

<script setup>
import { DewCard, DewButton } from '@/components/ui'
</script>
```

### 视觉特性

- **鼠标追踪折射**：折射光和色散彩虹跟随鼠标
- **弹性上浮**：水滴弹性曲线 hover 上浮
- **顶部高光线**：模拟玻璃边缘高光
- **色彩底色**：`tinted` + `glass` 叠加淡色渐变

---

## DewBadge 徽标

数字或文字徽标，用于状态标记和未读计数。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `number / string` | `null` | 显示的数值或文字 |
| `type` | `string` | `'primary'` | 颜色类型：`primary` / `success` / `warning` / `danger` / `info` / `neutral` |

---

## DewTag 标签

分类标签，用于标记类型、状态等。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `string` | `'primary'` | 颜色类型：`primary` / `success` / `warning` / `danger` / `info` / `neutral` |
| `size` | `string` | `'md'` | 尺寸：`sm` / `md` |
| `round` | `boolean` | `false` | 完全圆角（药丸形） |

---

## 设计 Token

所有组件共享 `src/components/ui/tokens.css` 中定义的设计变量，通过 CSS 自定义属性实现完全组件化：

### 基础 Token

| 类别 | 变量示例 | 用途 |
|------|---------|------|
| 字体 | `--dew-font` | 统一字体栈（苹方/微软雅黑回退） |
| 品牌色 | `--color-primary` `--color-primary-light` | 主色调及浅底 |
| 语义色 | `--color-success` `--color-danger` `--color-warning` | 状态颜色 |
| 圆角 | `--radius-sm` `--radius-md` `--radius-lg` `--radius-full` | 8px / 12px / 16px / 全圆 |
| 阴影 | `--shadow-sm` `--shadow-md` `--shadow-lg` | 柔和多层阴影 |
| 毛玻璃 | `--glass-bg` `--glass-blur` `--glass-border` | 半透明 + 模糊参数 |

### 组件级 Token（`--dew-` 前缀）

| 类别 | 变量组 | 覆盖范围 |
|------|--------|---------|
| 文字 | `--dew-text` / `--dew-text-heading` / `--dew-text-muted` / `--dew-text-faint` | 4 级文字色 |
| 动画曲线 | `--dew-bounce` | 水滴弹性曲线，所有组件共享 |
| 按钮 glass | `--dew-btn-bg` / `--dew-btn-border` / `--dew-btn-shadow` | glass 默认态 + hover |
| 按钮 danger | `--dew-btn-danger-*` | danger 全态（bg/border/color/shadow/text-shadow） |
| 按钮 lit | `--dew-btn-lit-*` | 白光点亮全态 |
| 按钮 danger lit | `--dew-btn-danger-lit-*` | 红色光焰全态 |
| 按钮 ghost | `--dew-ghost-hover-*` | 幽灵按钮 hover |
| 光效层 | `--dew-glow-*` | indicator/highlight/ripple/text-active |
| 按钮栏 | `--dew-bar-*` | 容器 + 文字 + badge |
| 卡片 | `--dew-card-*` | 4 种变体（default/elevated/inset/glass）全态 |
| 卡片底色 | `--dew-tint-*-from` / `--dew-tint-*-to` | 6 种 accent 色彩渐变 |

### 暗色模式

所有 `--dew-*` 变量在 `.theme-dark` 下自动覆盖为暗色值。切换主题只需在父元素上挂载 `theme-dark` / `theme-light` class：

```vue
<div :class="isDark ? 'theme-dark' : 'theme-light'">
  <DewButton>按钮</DewButton>
  <DewCard>卡片</DewCard>
</div>
```

自定义主题只需修改 `tokens.css` 中的变量值即可全局生效。

---

## 组件展示页面

开发环境中访问 `/ui-showcase` 可查看所有组件的实时效果和交互演示，含亮/暗模式切换。
