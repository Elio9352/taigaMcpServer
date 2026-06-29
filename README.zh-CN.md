# 🚀 Taiga MCP Server

强大的 **Model Context Protocol (MCP)** 服务器，让你通过自然语言与 **Taiga 项目管理** 系统交互，轻松管理项目、Sprint、用户故事、任务与 Issue。

> 🤖 **AI 辅助开发**：本项目与 [Claude Code](https://claude.ai/code) 协作完成，展示了 AI 辅助软件开发的实践。

> **社区分支**：本仓库是 [greddychen](https://github.com/greddy7574/taigaMcpServer) 维护的 [`taiga-mcp-server`](https://www.npmjs.com/package/taiga-mcp-server) 的社区续维护版本。新 npm 包为 [`@elio9352/taiga-mcp-server`](https://www.npmjs.com/package/@elio9352/taiga-mcp-server)。原始灵感来自 [adriapedralbes](https://github.com/adriapedralbes) 的 [mcpTAIGA](https://github.com/adriapedralbes/mcpTAIGA)。

> 📖 [English README](README.md) · [English Changelog](CHANGELOG.md)

[![npm version](https://badge.fury.io/js/@elio9352%2Ftaiga-mcp-server.svg)](https://badge.fury.io/js/@elio9352%2Ftaiga-mcp-server)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![GitHub](https://img.shields.io/badge/GitHub-taigaMcpServer-blue?logo=github)](https://github.com/Elio9352/taigaMcpServer)

## ✨ 功能特性

### 📊 完整项目管理

- **项目**：列出并查看项目详情
- **Sprint**：创建、列出 Sprint，查看进度与统计
- **用户故事**：创建与管理用户故事
- **任务**：创建与用户故事关联的任务
- **Issue**：完整 Issue 生命周期管理，含 Sprint 关联

### 👤 委派人与关注者（v1.9.23+）

- **委派人 `assignee`**：创建/更新时可指定项目成员（用户名、邮箱、全名、用户 ID）
- **关注者 `watchers`**：支持为 Issue、用户故事、任务、Epic、Sprint、Wiki 设置关注者列表
- **默认行为**：委派人默认为当前登录用户；关注者默认为空（不关注）
- **显式取消**：`assignee: "unassign"` 或 `"none"` 表示不委派；`watchers: "none"` 或 `[]` 表示不关注
- **批量覆盖**：`batchCreateIssues` 等工具支持批次默认值 + 单条记录覆盖
- **Taiga 兼容**：创建时 POST 写入关注者无效，服务端会在创建后通过 PATCH 补写

### 🔗 Sprint 与 Issue 追踪

- 按 Sprint 查看 Issue 及关联关系
- Issue 详情含 Sprint 分配信息
- Sprint 进度统计与完成率
- 实时状态更新

### 🚀 批量操作

- 批量创建 Issue（最多 20 条）
- 批量创建用户故事（含故事点）
- 批量创建任务
- 单条失败不影响其他条目
- 逐条返回成功/失败报告

### 🔍 高级查询语法

- 类 SQL 语法：`field:operator:value`
- 逻辑运算：`AND`、`OR`、`NOT`
- 文本匹配、通配符、日期范围
- `ORDER BY`、`LIMIT` 控制结果

### 💬 团队协作

- 评论增删改查
- 完整讨论历史
- 实时同步

### 📎 附件管理

- 文件路径或 Base64 上传
- 适配 Claude Desktop
- 多格式支持，下载与删除

### 🏛️ Epic 管理

- 大型功能组织
- 用户故事与 Epic 关联
- 进度统计与路线图

### 📖 Wiki 知识库

- Markdown 文档页
- 按 ID 或 slug 访问
- 关注/取消关注变更通知
- 版本控制防冲突

### 💬 自然语言示例

- 「列出所有项目」
- 「查看 Sprint 5 的进度统计」
- 「在项目 X 创建一个高优先级 Bug」
- 「Sprint 3 里有哪些 Issue？」
- 「获取 Issue #123 的详情」

## 🛠️ 安装与配置

### 前置要求

- **Node.js** v14+ — [下载](https://nodejs.org)
- 可访问 Taiga API 的账号

### 方式一：NPX（推荐）

无需全局安装，自动使用最新版本：

```bash
npx @elio9352/taiga-mcp-server
```

### 方式二：全局安装

```bash
npm install -g @elio9352/taiga-mcp-server
taiga-mcp
```

### 方式三：Docker

```bash
docker build -t taiga-mcp-server .
docker run --rm -i --env-file .env taiga-mcp-server

# 或使用 docker-compose
docker-compose up --build
```

## ⚙️ 配置

### Claude Desktop 集成

```json
{
  "mcpServers": {
    "taiga-mcp": {
      "command": "npx",
      "args": ["@elio9352/taiga-mcp-server"],
      "env": {
        "TAIGA_API_URL": "https://api.taiga.io/api/v1",
        "TAIGA_USERNAME": "your_username",
        "TAIGA_PASSWORD": "your_password"
      }
    }
  }
}
```

### 自建 Taiga 实例

```json
{
  "env": {
    "TAIGA_API_URL": "https://your-taiga-domain.com/api/v1",
    "TAIGA_USERNAME": "your_username",
    "TAIGA_PASSWORD": "your_password"
  }
}
```

## 🎯 使用示例

### 委派人与关注者

```
🗣️ 创建 Issue（默认委派给自己，不关注）
createIssue({ projectIdentifier: "my-app", subject: "修复登录页" })

🗣️ 创建 Issue 并指定关注者
createIssue({
  projectIdentifier: "my-app",
  subject: "需要评审",
  assignee: "unassign",
  watchers: ["alice", "bob"]
})

🗣️ 批量创建（批次默认 + 单条覆盖）
batchCreateIssues({
  projectIdentifier: "my-app",
  assignee: "john",
  issues: [
    { subject: "任务 A" },
    { subject: "任务 B", assignee: "unassign" },
    { subject: "任务 C", watchers: ["mary"] }
  ]
})

🗣️ 更新用户故事状态时同时设置关注者
updateUserStoryStatus({
  projectIdentifier: "my-app",
  userStoryId: "#33",
  status: "In progress",
  watchers: ["jiahui"]
})
```

**参数说明**

| 参数 | 类型 | 说明 |
|------|------|------|
| `assignee` | 字符串（可选） | 省略则创建时默认当前用户；`"unassign"` / `"none"` 表示不委派 |
| `watchers` | 字符串数组或 `"none"`（可选） | 省略则默认不关注；支持用户名、邮箱、全名、用户 ID |

### Sprint 管理

```
🗣️ 「列出项目 MyApp 的所有 Sprint」
🗣️ 「获取 Sprint 5 的详细信息与统计」
🗣️ 「创建 Sprint Q1 Release，时间 2024-01-01 至 2024-03-31」
```

### Issue 追踪

```
🗣️ 「列出项目 MyApp 的所有 Issue」
🗣️ 「查看 Issue #123 详情」
🗣️ 「将 Issue 838 状态改为 In Progress」
🗣️ 「把 Issue 838 分配给张三」
🗣️ 「将 Issue 838 加入 Sprint 1.0.95」
```

### 项目管理

```
🗣️ 「创建一个高优先级 Bug：登录页无法访问」
🗣️ 「列出项目 MyApp 的所有用户故事」
🗣️ 「批量创建 5 个 Issue」
```

### 高级查询

```
🗣️ status:open AND priority:high AND assignee:john AND type:bug
🗣️ points:>=5 AND created:this_week ORDER BY points DESC
```

## 🔧 可用工具（46 个）

### 🔐 认证（1）

| 工具 | 说明 |
|------|------|
| `authenticate` | Taiga 用户认证 |

### 📁 项目管理（2）

| 工具 | 说明 |
|------|------|
| `listProjects` | 列出可访问项目 |
| `getProject` | 项目详情 |

### 🏃 Sprint 管理（5）

| 工具 | 说明 |
|------|------|
| `listMilestones` | 列出 Sprint |
| `getMilestone` | Sprint 完整详情（用户故事、关注者、负责人、指标等） |
| `getMilestoneStats` | Sprint 进度统计 |
| `createMilestone` | 创建 Sprint |
| `getIssuesByMilestone` | Sprint 内 Issue 列表 |

### 🐛 Issue 管理（6）

| 工具 | 说明 |
|------|------|
| `listIssues` | 列出 Issue（含 Sprint 信息） |
| `getIssue` | Issue 详情 |
| `createIssue` | 创建 Issue（支持 `assignee` / `watchers`） |
| `updateIssueStatus` | 更新状态（支持 `assignee` / `watchers`） |
| `addIssueToSprint` | 分配/移出 Sprint（支持 `assignee` / `watchers`） |
| `assignIssue` | 委派/取消委派（支持 `watchers`） |

### 📝 用户故事（5）

| 工具 | 说明 |
|------|------|
| `listUserStories` | 列出用户故事 |
| `getUserStory` | 用户故事详情 |
| `createUserStory` | 创建（支持 `assignee` / `watchers`） |
| `updateUserStoryStatus` | 更新状态（支持 `assignee` / `watchers`） |
| `assignUserStoryToSprint` | 分配/移出 Sprint（支持 `assignee` / `watchers`） |

### ✅ 任务（1）

| 工具 | 说明 |
|------|------|
| `createTask` | 创建任务（支持 `assignee` / `watchers`） |

### 🚀 批量操作（3）

| 工具 | 说明 |
|------|------|
| `batchCreateIssues` | 批量创建 Issue（批次/单条 `assignee` / `watchers`） |
| `batchCreateUserStories` | 批量创建用户故事 |
| `batchCreateTasks` | 批量创建任务 |

### 🔍 高级搜索（3）

| 工具 | 说明 |
|------|------|
| `advancedSearch` | 高级查询 |
| `queryHelp` | 语法帮助 |
| `validateQuery` | 校验查询语法 |

### 💬 评论（4）

| 工具 | 说明 |
|------|------|
| `addComment` | 添加评论 |
| `listComments` | 评论列表 |
| `editComment` | 编辑评论 |
| `deleteComment` | 删除评论 |

### 📎 附件（4）

| 工具 | 说明 |
|------|------|
| `uploadAttachment` | 上传附件 |
| `listAttachments` | 附件列表 |
| `downloadAttachment` | 下载附件 |
| `deleteAttachment` | 删除附件 |

### 🏛️ Epic（6）

| 工具 | 说明 |
|------|------|
| `createEpic` | 创建 Epic（`assignee` 映射为 owner） |
| `listEpics` | Epic 列表 |
| `getEpic` | Epic 详情 |
| `updateEpic` | 更新 Epic（支持 `assignee` / `watchers`） |
| `linkStoryToEpic` | 关联用户故事 |
| `unlinkStoryFromEpic` | 取消关联 |

### 📖 Wiki（6）

| 工具 | 说明 |
|------|------|
| `createWikiPage` | 创建 Wiki 页（支持 `watchers`） |
| `listWikiPages` | Wiki 列表 |
| `getWikiPage` | Wiki 详情 |
| `updateWikiPage` | 更新 Wiki（支持 `watchers`） |
| `deleteWikiPage` | 删除 Wiki |
| `watchWikiPage` | 当前用户关注/取消关注 |

## 🚀 为什么选择 Taiga MCP Server？

- **🔥 零配置**：`npx` 即可运行
- **🧠 AI 原生**：面向对话式项目管理
- **🔗 完整集成**：覆盖 Taiga 主要 API，46 个工具
- **👤 委派与关注**：创建/更新流程内置成员解析
- **📊 丰富数据**：进度、统计、Sprint 关联
- **🚀 批量操作**：适合大规模录入
- **🛡️ 安全**：凭据通过环境变量管理
- **🔍 高级搜索**：类 SQL 查询语法

## 🙏 致谢

本项目灵感来自 [mcpTAIGA](https://github.com/adriapedralbes/mcpTAIGA)（adriapedralbes），在全新架构上重写与扩展，采用相同 ISC 许可证。

🤖 与 [Claude Code](https://claude.ai/code) 协作开发。

## 📚 文档

- **英文 README**：[README.md](README.md)
- **中文更新日志**：[CHANGELOG.zh-CN.md](CHANGELOG.zh-CN.md)
- **Wiki**（多语言）：[GitHub Wiki](https://github.com/Elio9352/taigaMcpServer/wiki)

## 🚀 自动发布

```bash
npm version patch              # 创建新版本
git push origin main --tags    # 触发 CI 发布
```

**流程**：测试 → NPM 发布 → GitHub Packages → GitHub Release

## 🤝 贡献

欢迎 Issue 与 Pull Request：[GitHub 仓库](https://github.com/Elio9352/taigaMcpServer)

## 📄 许可证

ISC License — 与原始 [mcpTAIGA](https://github.com/adriapedralbes/mcpTAIGA) 相同。

### 项目信息

- **原始灵感**：[adriapedralbes](https://github.com/adriapedralbes) / [mcpTAIGA](https://github.com/adriapedralbes/mcpTAIGA)
- **早期实现**：[greddychen](https://github.com/greddy7574/taigaMcpServer)（[taiga-mcp-server](https://www.npmjs.com/package/taiga-mcp-server)）
- **当前维护**：[Elio9352](https://github.com/Elio9352)（[@elio9352/taiga-mcp-server](https://www.npmjs.com/package/@elio9352/taiga-mcp-server)）

---

**为使用 Taiga 的敏捷团队而打造 ❤️**
