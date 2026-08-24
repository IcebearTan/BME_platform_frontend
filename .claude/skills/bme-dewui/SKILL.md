---
name: bme-dewui
description: 在 BME 前端使用/新增 DewUI 组件,或做任何视觉与样式调整时使用。给出组件范式、tokens 纪律与六条视觉硬约束。触发词:Dew 组件、DewCard、样式调整、UI 微调、改颜色、加卡片、新组件、深色模式。
---

# DewUI 与视觉调整规程

> 权威源:`docs/ARCHITECTURE.md` §4/§5;设计语言全文:`docs/dev-memories/bme-dewui-design-language.md`。

## 高频范式

```vue
<!-- 内容/表单卡片:登录、注册、信息面板 -->
<DewCard :glass="true" :divided="true" size="lg">…</DewCard>

<!-- 表格容器(admin):no-hover + 清零 padding -->
<DewCard no-hover class="table-card">
<style scoped>.table-card :deep(.dew-card__body){padding:0}</style>

<!-- 表单输入:配 el-form-item 获得校验 -->
<DewInput v-model="form.email" type="email" size="lg" :prefix-icon="User" />
<DewButton :block="true" size="lg" :loading="submitting">登录</DewButton>

<!-- 阅读场景:flat(纯色无玻璃无 hover,长文本不晃) -->
<DewCard variant="flat">…文章正文…</DewCard>
```

导入:`import { DewCard, DewInput, DewButton } from '@bme/dew-ui'`(19 个组件清单见 ARCHITECTURE §4.3)。

## 色彩与变量纪律

- **禁硬编码色值**。优先级:`--dew-*`(玻璃配方,tokens.css)> admin `variables.css` 结构变量(`--primary-color`/`--surface-solid`/`--text-*`)> user 端 main.css;
- 玻璃卡片出彩依赖**极光衬底**(admin `.aurora-bg` 单源):不要在玻璃下再垫纯色块;
- 深色模式选择器 `.theme-dark`:任何新样式必须明暗两态各看一遍;
- EP 结构组件(el-table/el-form/el-dialog)不逐个换 Dew,视觉由 EP 桥接层统一;**对话框/抽屉保持 EP 实心底,禁走玻璃**(浮层无衬底,半透明透字)。

## 六条硬约束(违反必返工)

1. **禁 emoji 当图标**;图标 `@element-plus/icons-vue` 或 SVG,克制使用
2. **禁默认蓝紫渐变**装饰;用中性/玻璃/语义色
3. **Toast 极简**:DewMessage 单图标+色,不加彩色底/图标色块
4. **新 Dew 组件先上 `UiShowcaseView`**(apps/user)验证,再接业务页
5. **UI 调整大胆做**,别每次只挪 2px
6. **禁外网 CDN**(字体走系统栈;编辑器高亮走 `@bme/editor` 自托管)

## 新增 Dew 组件流程

1. 判定是否真缺:EP 有结构等价物则用 EP+桥接;
2. 组件零业务 props,放 `packages/dew-ui/` 根,index.js 导出;
3. 四层结构(玻璃底/折射/色散/高光)复用 tokens 变量,动效用 `--dew-bounce`;
4. UiShowcaseView 加示例,明暗两态截图对照;
5. 两端目检受影响页面;`pnpm build` 全绿。

## 修改既有 Dew 组件 = 改两端视觉

变更必须在 UiShowcaseView 有前后对照;涉及 tokens.css(`--dew-*`)时按"全站视觉变更"对待,PR 附截图。
