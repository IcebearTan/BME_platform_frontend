# Frontend AI Development Rules

Before editing this repository, every AI coding agent must read these files in order:

1. `docs/ARCHITECTURE.md`
2. `README.md`
3. The existing components, services, and tests related to the requested feature

When this repository is inside the AMEII workspace, also read `../开发AMELL项目规范.md`.

Mandatory rules:

- Do not use emoji in new UI, user-visible copy, icons, Toast messages, logs, or source comments.
- Use `@element-plus/icons-vue` or an existing SVG asset for icons.
- Do not develop from `BK备份/` or legacy repositories.
- Keep `.env.development` on the real API at `http://127.0.0.1:5001`.
- Run `pnpm check:no-emoji`, `pnpm build`, and `pnpm test:e2e` before committing.
