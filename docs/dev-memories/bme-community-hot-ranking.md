---
name: bme-community-hot-ranking
description: 社区广场信息流的「类型tab×排序」正交控件 + 半衰期热度排序机制及关键设计决策
metadata: 
  node_type: memory
  type: project
  originSessionId: fd03a923-1171-48c0-89d8-614b81ab3532
  modified: 2026-07-29T06:02:40.537Z
---

`/community/feed`（`BME_platform_flask/blueprints/community.py`）从"纯置顶+时间倒序"改为支持两个正交参数：
- `type`：all(默认) / article / discussion —— 内容类型筛选
- `sort`：hot(默认) / latest —— hot=半衰期热度，latest=活跃时间倒序

**热度公式**：`HOT = (I + 1) * 0.5 ** (age_days / 14)`
- 互动分 I：讨论帖 `like_count + 2*reply_count`；文章 `2*reply_count`（=文章评论数）
- 活跃时间 T：讨论帖 `last_reply_at or created_at`；文章 `max(publish_time, 最近评论时间)`
- `+1` 给零互动新内容基础分（不沉底）；半衰期 `_HALF_LIFE_DAYS=14` 是**唯一主调节旋钮**（好内容掉太快就调大到 21~30，先动它再动权重）

**Why（几个非显而易见的决策）**：
- **view_count 故意不计入热度**：`DiscussionCard.vue` 的 IntersectionObserver 在卡片每次进 feed 视口时调详情接口、`discussion.py` 让 `view_count+=1`，所以 view_count 衡量的是"在 feed 挂了多久"而非兴趣，且形成反馈循环（高热度→排前→展示更多→浏览更高→热度更高）。若未来想加回 view，先修这个噪声埋点。
- **文章用半衰期而非多项式 `(age+2)^1.2`**：多项式下 14 天前 5 回复的帖反而输给零回复新帖，对教育长尾内容是错的。
- **article_last_reply_map 让文章可 bump**：在 article-scope 评论汇总的同一循环里顺带建最近评论时间 map，文章 T 取 `max(publish_time, 最近评论)`，否则文章热度排序退化成 publish_time 倒序。
- **置顶 `is_pinned` 绝对优先**；但 `ArticleModel` 无 is_pinned 字段，文章暂不可置顶（要置顶文章需改 schema）。
- 排序用真实 datetime（私有 `_rank_dt` 等字段，返回前剔除，不下发客户端），不用格式化字符串。
- `now` 整请求取一次 `datetime.now()`（与模型 default 同源），**勿用 utcnow**（会扭曲所有排名）。

**前端**（`BME_frontend/src/views/CommunityView.vue`）：两个 DewButtonBar（类型 md + 排序 sm）正交；`fetchThreads(reset)` 真分页；`enrichDiscussion` 只补全新拉到的项（避免追加 O(n²)）；`loadMore` 接真分页（按 `pages` 判 hasMore）。

**第二调用者**：首页 `StudyHub.vue` 也调 `/community/feed`，但显式传 `sort:'latest'` 且不传 type，故默认值改 hot 对它无影响。详见 [[bme-article-system]]。
