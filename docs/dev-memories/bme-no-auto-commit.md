---
name: bme-no-auto-commit
description: 最优先硬约束——未经明确授权严禁 git commit，更严禁 push 远程；所有子项目、每一轮代码改动都严格执行
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e29667af-1769-4b6b-b881-207ee61b6f92
  modified: 2026-07-31T08:23:29.341Z
---

**最优先、必须严格遵守的全局硬约束（适用 BME / BME_3DFarm / 所有子项目，每一轮涉及代码改动的对话都严格执行，无论改动大小）：**

1. **严禁**在未得到明确授权的情况下执行 `git commit`。
2. **更严禁** `git push` / 推送任何远程仓库——比 commit 严重得多：push 是不可逆的外发动作（推上去就公开），**任何情况**下 push 前都必须单独、明确地获得授权。**即便 commit 已获授权，也不代表 push 获授权**——两者分开。
3. 完成代码改动后：只汇报结果 + 列出改动文件，**停**，等用户指示。绝不自行 `git add` / `git commit` / `git push`。

**Why:** 用户 2026-07-09 明确纠正过（E3 完成时擅自 commit 后端 `94b4960` + 前端 `0e596a0`）；2026-07-31 再次强调这是「最优先必须严格遵守」。用户要自己掌控提交节奏与内容（先 review diff / 调整 message / 攒批提交），push 更是不可逆外发动作。

**How to apply:** 用户说「提交」「commit」「保存一个版本」才授权 commit；说「推」「push」「上传/推到 GitHub/远程」才授权 push。这两者都不做默认动作。上一阶段授权过 commit 不代表下一阶段默认可以——每次都等明确指令。相关：[[propose-not-execute]] [[bme-local-dev-env]]。
