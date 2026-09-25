---
name: bme-admin-page
description: 新增或修改 BME admin 管理端页面(列表页/管理页/表格页/CRUD 弹窗)时使用。给出页面骨架模板、全局类清单、挂载三步与禁止事项。触发词:管理页、列表页、admin 页面、加表格、加弹窗、新建 XX 管理。
---

# BME admin 管理页开发规程

> 权威源:`docs/ARCHITECTURE.md` §7(冲突以文档与代码为准)。本 skill 是它的可执行投影。

## 页面骨架(直接粘贴起步)

```vue
<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">页面标题</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" :model="query" @submit.prevent>
          <el-form-item label="查询">
            <el-input v-model="query.key" placeholder="输入关键字" clearable
              @keyup.enter="handleSearch" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch"><el-icon><Search /></el-icon></el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading">
        <!-- 列定义 -->
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination @current-change="handlePageChange" layout="prev, pager, next"
          :total="total" :current-page="page" :page-size="pageSize" />
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { DewCard } from '@bme/dew-ui';
import api from '../api';
// …业务逻辑
</script>

<style scoped>
.table-card :deep(.dew-card__body) { padding: 0; }
/* 高度约束按需: .table-card { max-height: 600px; overflow: hidden; } */
</style>
```

## 全局类(已单源,scoped 里禁止重定义)

来自 `apps/admin/src/styles/pages.css`:
`.page-header` / `.page-title` / `.header-actions` / `.form-inline` / `.pagination-wrapper` / `.dialog-footer` / `.selectable` / LLM 家族类(`.admin-llm-page` `.page-hero` `.section-card` 等,仅 LLM 三页使用)。

## CRUD 弹窗模式

```vue
<el-dialog v-model="dlg.visible" :title="dlg.id ? '编辑' : '新建'" width="520px">
  <el-form :model="dlg.form" label-width="90px">…</el-form>
  <template #footer>
    <div class="dialog-footer">
      <el-button @click="dlg.visible = false">取消</el-button>
      <el-button type="primary" :loading="dlg.submitting" @click="submit">确认</el-button>
    </div>
  </template>
</el-dialog>
```

- 删除/危险操作:`ElMessageBox.confirm(…, { type: 'warning' })`,catch 里区分用户取消;
- 错误处理约定(catch 统一范式):

```js
catch (e) {
  const data = e.response?.data
  let msg = '操作失败，请稍后重试'
  if (typeof data?.message === 'string') msg = data.message
  else if (data?.message && typeof data.message === 'object') {
    const k = Object.keys(data.message)[0]
    msg = data.message[k]?.[0] || msg
  }
  ElMessage.error(msg)
}
```

## 挂载(2026-09-21 IA 重构后:路由 meta 单源,一步到位)

在对应域的路由模块(`router/routes/misc.js` 或 `domains/<域>/routes.js`)加一条带完整 meta 的路由——侧栏/标题/面包屑/排序/激活态全部自动派生,不再改 HomeView:

```js
{
  path: '/operations/xxx',
  name: 'operations_xxx',
  component: loadXxx,
  meta: { title: '页面标题', domain: 'operations', navGroup: 'operations',
          navOrder: 70, showInMenu: true, icon: 'Tickets', staffOnly: true },
}
```

- 分区与 icon 注册表在 `app/navigation/navGroups.js`(新 icon 先进 ICONS 表);
- 不进菜单的详情页给 `showInMenu: false` + `meta.activeMenu: '<父菜单路径>'`;
- 换路径必须同步加旧路径函数式 redirect(保 query)——兼容期至少一个发布周期;
- 权威说明见 `docs/ARCHITECTURE.md` §7.3。

## 禁止事项(历史返训)

- ❌ scoped 里重定义全局类(page-header/form-inline/pagination-wrapper/dialog-footer/selectable)
- ❌ 硬编码色值(`#fff` 白底实心条、旧紫 `#3b5cd5`、`#C4C4C4` 边框)→ 用 tokens 变量(`var(--primary-color)` 等)
- ❌ 手写玻璃配方(backdrop-filter)→ 容器一律 DewCard
- ❌ 裸 div + 手写边框阴影包表格 → DewCard no-hover
- ❌ 留 console.log、注释掉的死代码块、未用 import
- ❌ `:rules` 绑定不存在的变量、模板引用未定义方法(提交前 grep 一遍 handleXxx)
- ❌ emoji 当图标;图标用 `@element-plus/icons-vue`
- ❌ localStorage 新键不带 `bme-admin-` 前缀

## 完成前

- 新页面补一条 e2e 用例(用 `bme-e2e` skill 的 mock 策略)
- `pnpm build:admin` + `pnpm test:e2e` 全绿
