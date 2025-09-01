# 教育平台前端项目

基于 Vue 3 + Vite 构建的现代化教育平台前端应用。

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发环境

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 预览构建

```bash
npm run preview
```

## 📋 版本管理

### 手动发布版本

```bash
# 发布新版本（推荐方式）
npm run release 2.1.3 "🚀 重大更新" "📚 新增功能" "🐛 修复bug"

# 或者使用内置的版本控制
node release.js 2.1.3 "功能描述1" "功能描述2"
```

### 自动版本升级

```bash
# 补丁版本 (2.1.2 -> 2.1.3)
npm run version:patch

# 次版本 (2.1.2 -> 2.2.0)  
npm run version:minor

# 主版本 (2.1.2 -> 3.0.0)
npm run version:major
```

### 提交规范

项目使用标准化的提交信息格式，可以设置 Git 提交模板：

```bash
git config commit.template .gitmessage
```

## 📁 项目结构

```
src/
├── api.js              # API 接口
├── App.vue             # 根组件
├── main.js             # 入口文件
├── router.js           # 路由配置
├── store.js            # 状态管理
├── config/
│   └── version.js      # 版本配置
├── components/         # 组件库
├── views/             # 页面视图
└── assets/            # 静态资源
```

## 🔧 技术栈

- **框架**: Vue 3
- **构建工具**: Vite  
- **UI 库**: Element Plus
- **状态管理**: Vuex
- **路由**: Vue Router
- **HTTP 客户端**: Axios
- **动画**: GSAP

## 📝 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## 📖 开发指南

### IDE 支持

推荐使用 [VS Code](https://code.visualstudio.com/) + [Vue 官方扩展](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

了解更多 Vue 3 开发信息，请查看 [Vue 文档](https://vuejs.org/guide/scaling-up/tooling.html#ide-support)。
