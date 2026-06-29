# 更新日志

本项目的所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> 📖 [English](CHANGELOG.md)

## [1.9.23] - 2026-06-29

### ✨ 新增

- **创建/更新工具支持委派人与关注者**
  - 新增共享模块 `assignmentUtils`，支持通过用户名、邮箱、全名或用户 ID 解析项目成员
  - Issue、用户故事、任务、Epic、Sprint、Wiki 等创建/更新工具均支持可选参数 `assignee` 与 `watchers`
  - 批量创建工具支持批次级默认值，并允许单条记录覆盖
  - 委派人默认为当前登录用户；关注者默认为空（支持显式传 `unassign` / `none`）
  - 创建后通过 PATCH 写入关注者，以规避 Taiga 创建接口的限制
  - 新增 `test/assignmentIntegrationTest.js`，用于在真实项目上验证
- **中文文档**
  - 新增 `README.zh-CN.md` 与 `CHANGELOG.zh-CN.md`
  - 中英文文档互相链接；已纳入 npm 包 `files` 字段

### 🐛 修复

- **委派人显示**
  - 当 Taiga 未返回 `full_name` 时，`getIssue` 与委派摘要改用 `full_name_display`
  - 当成员记录缺少 `username` 时，基于用户名的委派解析会回退到当前认证用户

## [1.9.22] - 2026-06-18

### 🐛 修复

- **列表分页**
  - `fetchAllPaginated` 现在会遍历 Taiga 数组分页，`listUserStories` 等列表工具可返回完整结果
- **任务创建时的用户故事查找**
  - `createTask` 与 `batchCreateTasks` 改用 `resolveUserStory`，不再列出全部用户故事
  - `batchCreateTasks` 创建任务时使用正确的 Taiga API 字段（`project`、`user_story`）

### 🔄 变更

- **破坏性变更**：`batchCreateTasks` 参数 `userStoryRef` 重命名为 `userStoryIdentifier`（支持内部 ID 或 `#ref`，与 `createTask` 一致）

## [1.9.21] - 2026-06-02

### 🐛 修复

- **用户故事引用号解析**
  - `getUserStory` 与 `updateUserStoryStatus` 除数字 ID 外，也支持引用号（`#123`）
  - 新增 `resolveUserStory` 工具函数与 `getUserStoryByRef` API 方法
  - 实现者：[@Elio9352](https://github.com/Elio9352)（elioq9352@gmail.com）

### 🔄 变更

- **社区分支**：新 npm 包 `@elio9352/taiga-mcp-server` 由 [Elio9352](https://github.com/Elio9352) 维护
- 原包 [`taiga-mcp-server`](https://www.npmjs.com/package/taiga-mcp-server)（[greddychen](https://github.com/greddy7574/taigaMcpServer)）已不再积极维护
- 仓库迁移至 [Elio9352/taigaMcpServer](https://github.com/Elio9352/taigaMcpServer)

### 📝 说明

- 安装：`npx @elio9352/taiga-mcp-server`
- 原始灵感：[mcpTAIGA](https://github.com/adriapedralbes/mcpTAIGA)（adriapedralbes）

---

## [1.9.20] - 2026-01-19

### ✨ 新增

- **更新用户故事状态**
  - 新增 `updateUserStoryStatus` 工具
  - 支持更新用户故事状态（如「New」→「In Progress」）
  - 按项目工作流校验状态名称
  - 补齐与 Issue 侧对等的能力

## [1.9.15] - 2025-01-XX

### 🎯 主要特性

#### 完整分页支持

- **修复 Issue #2**：[List User Stories does not bring all the user stories](https://github.com/greddy7574/taigaMcpServer/issues/2)
- 所有列表操作均支持完整分页
- 自动拉取全部页，不再遗漏数据

### ✨ 新增

- **按 ID 获取用户故事**（完成 Issue #2）
  - `taigaService.js` 新增 `getUserStory(userStoryId)`
  - 新增 MCP 工具 `getUserStory`
  - 返回 Epic、Sprint、点数、任务等完整信息
  - 测试：`test/getUserStoryTest.js`（5 项验证，100% 通过）

- **分页模块**（`src/pagination.js`）
  - 通用分页工具 `fetchAllPaginated()`
  - 兼容多种 Taiga API 响应格式
  - 安全上限（最多 100 页）防止死循环

- **分页测试**（`test/paginationTest.js`）
  - 10 个测试用例，100% 通过

### 🔄 变更

以下 `TaigaService` 列表方法均支持完整分页：

- `listProjects()`、`listUserStories()`、`listIssues()`、`listMilestones()`
- `getIssuesByMilestone()`、`listEpics()`、`listWikiPages()`

### 📊 影响

**v1.9.14 及更早**：超过 30 条的用户故事/Issue 只能看到第一页。

**v1.9.15 起**：在常规规模项目下可获取接近 100% 的数据覆盖。

---

## [1.9.14] - 2025-01-XX

### 新增

- 智能 Issue 解析
- 文档系统完善

### 变更

- Issue 管理功能优化

---

## [1.9.13] 及更早版本

- Issue 状态更新工具
- 多项 Bug 修复

---

## 历史版本概览

更早版本详见 Git 历史：

- v1.9.0 - v1.9.12：Epic 与 Wiki 管理
- v1.8.0：Base64 文件上传架构
- v1.7.0：评论系统
- v1.6.0：批量操作与高级查询
- v1.5.0：模块化架构
- v1.0.0：初始 MCP 实现

---

**图例：** 🎯 主要特性 · ✨ 新增 · 🔄 变更 · 🐛 修复 · 🛠️ 技术改进 · 📊 影响 · 🧪 测试 · 📝 文档
