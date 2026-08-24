---
name: bme-article-system
description: BME 文章系统全貌——存储约定、评论/收藏复用 discussion、页面结构、URL 入口、测试工具；开发文章相关功能时参考
metadata: 
  node_type: memory
  type: project
  originSessionId: 57812809-959a-4059-a89d-31a8ea3a7cf8
  modified: 2026-07-29T03:39:51.812Z
---

BME 文章功能（2026-07-28 重新启用并扩展），后端 `BME_platform_flask` + 前端 `BME_frontend`。

**存储约定（跨文件，易踩坑）**：
- 文章正文存 `data/article/{id}_{title}.html`，文件内容 = `json.dumps(html字符串)`（不是裸 HTML！）——前端 `ArticleDetailComponent` 用 `JSON.parse(response.data.html_content)` 还原。造测试数据用 `mock_article.py`。
- `ArticleModel`(models.py)：id / title / introduction / publish_time / url / author_id（+ author 关系→UserModel）。
- `ArticleComment` 表**不是评论**，是浏览/点赞统计表（like_time / view_time / article_id / user_id，一用户一条）。文章浏览/点赞走 `GET/POST /article/statistic`。

**评论 & 收藏复用 discussion（不新建表）**：
- 文章评论 = discussion 的 `scope_type='article'` 体系。每篇文章一个"汇总 thread"（`GET /discussions/article/{id}/thread` get-or-create），评论 = 该 thread 的 replies（`/discussions/threads/{tid}/replies` GET 列表 / POST 发表）。
- 文章收藏 = discussion reaction `bookmark`（`POST /discussions/reactions {target_type:'thread', target_id:汇总tid, reaction_type:'bookmark'}`）；`GET /discussions/threads/{tid}/reactions/me` 返回 `{liked, bookmarked}`。
- 收藏列表 `GET /discussions/article/favorites/me`（join bookmark + article 文章）。
- ⚠️ discussion 的 `list_threads` 权限过滤**不含 article scope**（普通用户查不到），所以文章评论只能走 get-or-create + list_replies，**不要走 list_threads**。
- 文章"点赞"仍走 `/article/statistic`（原有），**不走** discussion。

**前端结构**：
- `views/ArticleView.vue`（布局 + theme-dark/light 根，修过暗色级联）→ `components/Article/ArticleDetailComponent.vue`（正文 DewCard flat + 底部点赞/评论/分享/收藏 + 侧栏 TOC/作者卡，TOC 有 IntersectionObserver 滚动高亮）→ `components/Article/ArticleCommentSection.vue`（评论壳）。
- 个人中心"我的收藏"：`/user-center/my-favorites` → `components/User/MyFavoritesComponent.vue`（侧栏入口在 `UserCenterComponent.vue` 的 navItems）。
- 入口 URL：`http://localhost:8081/AMEII/article?Article_Id=X`（vite `base:'/AMEII/'`，路由 `requiresAuth` 需登录）。

**社区广场混合信息流**（2026-07-29 新增）：文章现在会出现在社区广场。后端聚合接口 `GET /community/feed`（`blueprints/community.py`，已注册 `community_bp`）混合「global 讨论帖 + 全部文章」为统一格式（`type`/`article_id`/`reply_count`=文章评论数/作者头像），按时间倒序分页——**前端两处社区广场都改拉它，不再拉 `/discussions/threads`**（那个对普通用户只返 global 讨论帖、不含文章，是当初"文章帖点不进"的真因——根本没显示）。前端：主广场 `CommunityView` 按 `item.type` 分发——文章帖用 `components/Community/ArticleCard.vue`（DewCard **flat** + indigo「文章」标签 + 阅读全文，整卡点击 `router.push({path:'/article',query:{Article_Id}})`），讨论帖仍用 `DiscussionCard`（玻璃、内联互动不变）；首页 `StudyHub` compact 预览用 `DewPostCard` + `badge:'文章'` 区分、文章帖点击跳 `/article`、讨论帖跳 `/community`。视觉区分=材质（flat 阅读卡 vs 玻璃对话卡）+ 标签，遵循无 emoji。移动端 `MobileMenuComponent` 顺带补了社区广场入口（旧 `/discuss` 换成 `/community`）。

**DewUI flat 变体**：文章正文/侧栏用 `<DewCard variant="flat">`（纯色扁平、hover 静态），见 [[bme-dewui-flat-variant]]。

**测试工具（dev_* / mock_* 前缀，gitignored）**：`mock_article.py`（造测试文章 Article_Id=1）、`dev_test_article_comment.py`、`dev_test_favorite.py`、`dev_test_favorites_list.py`（都用 `create_access_token` 绕登录，走真 HTTP；`os._exit` 防后台 scheduler 阻塞，需 `PYTHONUNBUFFERED=1` 才看得到 print）。

关联：[[bme-dewui-flat-variant]] [[bme-local-dev-env]] [[bme-no-auto-commit]]
