# 历史静态资源留存

> 2026-09-11 清理：以下素材已无任何代码引用，从会被打包/复制的目录（`src/assets`、`public/`）迁出，按用户要求作为历史资源留存。不参与构建，仅供回溯取用。

| 目录 | 来源 | 内容 |
|---|---|---|
| `user-src-assets/` | `apps/user/src/assets/` | badge.png、mentor-market-grab.png/.webp（同事 jiayuanpush 带入的市集截图）、New_Logo.png、VTK.svg、暑期训练营.png（旧 banner）、vue.svg（脚手架默认） |
| `admin-src-assets/` | `apps/admin/src/assets/` | vue.svg（脚手架默认） |
| `user-public/` | `apps/user/public/` | New_Logo.png（旧站 logo，src/assets 同名件一并归档） |
| `admin-public-tinymce/` | `apps/admin/public/tinymce/` | TinyMCE 自托管副本——admin 端已随清债批次 5 移除 TinyMCE（user 端 v1 编辑器走 npm 包，与此目录无关） |

注意：`public/medals/` 下 1-3.6MB 的勋章大图（user/admin 双份，约 40MB×2）仍被命名约定引用（`/medals/${name}.png`），**未动**——属功能债 #3（勋章存储方案）范畴，待该债处理时一并优化。
