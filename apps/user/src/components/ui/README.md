# BME UI 组件库

基于 Vue 3 的液态玻璃风格组件库。圆润、毛玻璃折射、柔和阴影、弹性水滴过渡。

## 快速开始

```js
import { BmeButton, BmeCard, BmeBadge, BmeTag } from '@/components/ui'
```

---

## BmeButton 按钮

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
  <!-- 默认玻璃按钮 -->
  <BmeButton>确定</BmeButton>

  <!-- 危险按钮 -->
  <BmeButton type="danger">删除</BmeButton>

  <!-- 幽灵按钮（无背景） -->
  <BmeButton type="ghost">取消</BmeButton>

  <!-- 可切换点亮状态 -->
  <BmeButton :active="isOn" @click="isOn = !isOn">
    {{ isOn ? '已关注' : '关注' }}
  </BmeButton>

  <!-- 危险 + 点亮 -->
  <BmeButton type="danger" :active="isAlert" @click="isAlert = !isAlert">
    {{ isAlert ? '已开启' : '开启警告' }}
  </BmeButton>

  <!-- 尺寸 -->
  <BmeButton size="sm">小号</BmeButton>
  <BmeButton size="md">中号</BmeButton>
  <BmeButton size="lg">大号</BmeButton>

  <!-- 撑满宽度 -->
  <BmeButton :block="true">提交</BmeButton>

  <!-- 禁用 -->
  <BmeButton :disabled="true">不可点击</BmeButton>
</template>

<script setup>
import { ref } from 'vue'
import { BmeButton } from '@/components/ui'

const isOn = ref(false)
const isAlert = ref(false)
</script>
```

### 视觉特性

- **鼠标追踪折射**：鼠标悬停移动时，按钮内部折射光和色散彩虹跟随鼠标实时变化
- **弹性宽度过渡**：内容变化时按钮宽度以水滴弹性曲线（`cubic-bezier(0.34, 1.56, 0.64, 1)`）平滑变形
- **点亮状态**：`glass` 默认白光充盈，`danger` 红色光焰，各自带外发光 + 内发光 + 文字辉光

---

## BmeCard 卡片

圆角卡片容器，支持多种变体、毛玻璃、色彩底色和可交互模式。所有卡片都具有鼠标追踪折射和色散效果。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `string` | `'default'` | 卡片变体：`default` / `elevated` / `inset` |
| `size` | `string` | `'md'` | 尺寸：`sm` / `md` / `lg`（控制内边距） |
| `glass` | `boolean` | `false` | 启用增强毛玻璃效果（更强模糊 + 透明） |
| `interactive` | `boolean` | `false` | 可交互卡片，带点击反馈和 `cursor: pointer` |
| `tinted` | `boolean` | `false` | 启用色彩底色模式 |
| `accent` | `string` | `null` | 强调色：`primary` / `success` / `warning` / `danger` / `info`（需配合 `tinted`） |

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
  <!-- 默认卡片 -->
  <BmeCard>
    <template #header>标题</template>
    <p>卡片内容</p>
    <template #footer>
      <BmeButton size="sm">确认</BmeButton>
    </template>
  </BmeCard>

  <!-- 变体：elevated / inset -->
  <BmeCard variant="elevated">浮起效果</BmeCard>
  <BmeCard variant="inset">凹陷效果</BmeCard>

  <!-- 毛玻璃卡片 -->
  <BmeCard :glass="true">
    <p>增强模糊 + 半透明</p>
  </BmeCard>

  <!-- 色彩底色卡片 -->
  <BmeCard :tinted="true" accent="primary" :glass="true">
    <div style="text-align: center;">
      <div style="font-size: 28px; font-weight: 700; color: #3b82f6;">128</div>
      <div>课程总数</div>
    </div>
  </BmeCard>

  <!-- 可交互卡片 -->
  <BmeCard :interactive="true" @click="handleClick">
    <p>点击我有反馈</p>
  </BmeCard>
</template>

<script setup>
import { BmeCard } from '@/components/ui'
</script>
```

### 视觉特性

- **鼠标追踪折射**：鼠标悬停移动时，卡片内折射光和色散彩虹跟随鼠标实时变化
- **弹性上浮**：hover 时以水滴弹性曲线上浮，active 按下时轻微缩放
- **顶部高光线**：卡片顶部 1px 渐变白线，模拟玻璃边缘高光
- **色彩底色**：`tinted` 模式下叠加 35% 透明度的色彩渐变，搭配 `glass` 使用效果最佳

---

## BmeBadge 徽标

数字或文字徽标，用于状态标记和未读计数。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `number / string` | `null` | 显示的数值或文字，不传则为纯标签模式 |
| `type` | `string` | `'primary'` | 颜色类型：`primary` / `success` / `warning` / `danger` / `info` / `neutral` |

### 使用示例

```vue
<template>
  <!-- 数字徽标 -->
  <BmeBadge :value="6" type="danger" />

  <!-- 文字徽标 -->
  <BmeBadge type="success">已读</BmeBadge>

  <!-- 搭配文字使用 -->
  <div style="position: relative; display: inline-flex;">
    <span>消息</span>
    <BmeBadge :value="3" type="danger" style="position: absolute; top: -8px; right: -20px;" />
  </div>
</template>

<script setup>
import { BmeBadge } from '@/components/ui'
</script>
```

---

## BmeTag 标签

分类标签，用于标记类型、状态等。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `string` | `'primary'` | 颜色类型：`primary` / `success` / `warning` / `danger` / `info` / `neutral` |
| `size` | `string` | `'md'` | 尺寸：`sm` / `md` |
| `round` | `boolean` | `false` | 完全圆角（药丸形） |

### 使用示例

```vue
<template>
  <!-- 基础标签 -->
  <BmeTag type="primary">任务</BmeTag>
  <BmeTag type="success">已完成</BmeTag>
  <BmeTag type="warning">待审核</BmeTag>
  <BmeTag type="danger">紧急</BmeTag>

  <!-- 圆角标签 -->
  <BmeTag type="info" :round="true">信息</BmeTag>

  <!-- 小号 -->
  <BmeTag type="success" size="sm">小标签</BmeTag>
</template>

<script setup>
import { BmeTag } from '@/components/ui'
</script>
```

---

## 设计 Token

所有组件共享 `src/components/ui/tokens.css` 中定义的设计变量：

| 类别 | 变量示例 | 用途 |
|------|---------|------|
| 品牌色 | `--color-primary` `--color-primary-light` | 主色调及浅底 |
| 语义色 | `--color-success` `--color-danger` `--color-warning` | 状态颜色 |
| 圆角 | `--radius-sm` `--radius-md` `--radius-lg` `--radius-full` | 8px / 12px / 16px / 全圆 |
| 阴影 | `--shadow-sm` `--shadow-md` `--shadow-lg` | 柔和多层阴影 |
| 毛玻璃 | `--glass-bg` `--glass-blur` `--glass-border` | 半透明 + 模糊参数 |

自定义主题只需修改 `tokens.css` 中的变量值即可全局生效。

---

## 组件展示页面

开发环境中访问 `/ui-showcase` 可查看所有组件的实时效果和交互演示。
