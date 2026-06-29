# Changelog

> 📖 [简体中文](CHANGELOG.zh-CN.md)

All notable changes to Taiga MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.23] - 2026-06-29

### ✨ Added

- **Assignee and watchers on create/update tools**
  - Shared `assignmentUtils` for resolving project members by username, email, full name, or user ID
  - Create/update tools for issues, user stories, tasks, epics, sprints, and wiki pages support optional `assignee` and `watchers`
  - Batch create tools support batch-level defaults with per-item overrides
  - Default assignee is the current logged-in user; default watchers is empty (explicit `unassign` / `none` supported)
  - Watchers are applied via PATCH after create to work around Taiga API create limitations
  - Added `test/assignmentIntegrationTest.js` for live project verification
- **Chinese documentation**
  - Added `README.zh-CN.md` and `CHANGELOG.zh-CN.md`
  - Cross-links between English and Chinese docs; included in npm package `files`

### 🐛 Fixed

- **Assignee display**
  - `getIssue` and assignment summaries now use `full_name_display` when Taiga omits `full_name`
  - Username-based assignee lookup falls back to the authenticated user when member records lack `username`

## [1.9.22] - 2026-06-18

### 🐛 Fixed

- **List pagination**
  - `fetchAllPaginated` now continues through Taiga array pages so `listUserStories` and other list tools return complete results
- **User Story lookup for task creation**
  - `createTask` and `batchCreateTasks` now use `resolveUserStory` instead of listing all user stories
  - `batchCreateTasks` sends correct Taiga API fields (`project`, `user_story`) when creating tasks

### 🔄 Changed

- **Breaking**: `batchCreateTasks` parameter `userStoryRef` renamed to `userStoryIdentifier` (supports internal ID or `#ref`, aligned with `createTask`)

## [1.9.21] - 2026-06-02

### 🐛 Fixed

- **User Story Reference Resolution**
  - `getUserStory` and `updateUserStoryStatus` now accept reference numbers (`#123`) in addition to numeric IDs
  - Added `resolveUserStory` utility and `getUserStoryByRef` API method
  - Implementation by [@Elio9352](https://github.com/Elio9352) (elioq9352@gmail.com)

### 🔄 Changed

- **Community Fork**: New npm package `@elio9352/taiga-mcp-server` maintained by [Elio9352](https://github.com/Elio9352) (elioq9352@gmail.com)
- Original package [`taiga-mcp-server`](https://www.npmjs.com/package/taiga-mcp-server) by [greddychen](https://github.com/greddy7574/taigaMcpServer) is no longer actively maintained
- Repository moved to [Elio9352/taigaMcpServer](https://github.com/Elio9352/taigaMcpServer)

### 📝 Notes

- Install via: `npx @elio9352/taiga-mcp-server`
- Original inspiration: [mcpTAIGA](https://github.com/adriapedralbes/mcpTAIGA) by adriapedralbes

---

## [1.9.20] - 2026-01-19

### ✨ Added

- **Update User Story Status**
  - New `updateUserStoryStatus` tool
  - Allows updating the status of a user story (e.g., "New" -> "In Progress")
  - Validates status against project's workflow
  - Addresses feature gap compared to Issues

## [1.9.15] - 2025-01-XX

### 🎯 Major Features

#### Complete Pagination Support
- **Fixed Issue #2**: [List User Stories does not bring all the user stories](https://github.com/greddy7574/taigaMcpServer/issues/2)
- Added complete pagination support for ALL list operations
- No more missing data - all pages are automatically fetched

### ✨ Added

- **Get User Story by ID** - Completes Issue #2 implementation
  - New `getUserStory(userStoryId)` method in `taigaService.js`
  - New `getUserStory` MCP tool for querying individual user stories
  - Comprehensive user story details including Epic, Sprint, Points, Tasks
  - Test suite: `test/getUserStoryTest.js` (5 validations, 100% pass)

- **Pagination Module** (`src/pagination.js`)
  - New `fetchAllPaginated()` utility function for universal pagination handling
  - Supports multiple Taiga API response formats (paginated and non-paginated)
  - Intelligent detection of pagination metadata
  - Safety limit (max 100 pages) to prevent infinite loops
  - Graceful error handling with partial results

- **Comprehensive Pagination Tests** (`test/paginationTest.js`)
  - 10 test cases covering all pagination scenarios
  - Mock tests for utility functions
  - Real API tests for all list operations
  - 100% test success rate

- **Documentation**
  - New `docs/PAGINATION.md` with complete pagination guide
  - Architecture explanation and best practices
  - Performance considerations and optimization tips

### 🔄 Changed

All list methods in `TaigaService` now support full pagination:

- `listProjects()` - Returns ALL user projects across all pages
- `listUserStories(projectId)` - Returns ALL user stories (not just first page)
- `listIssues(projectId)` - Returns ALL issues across pagination
- `listMilestones(projectId)` - Returns ALL sprints/milestones
- `getIssuesByMilestone(projectId, milestoneId)` - Returns ALL issues in a sprint
- `listEpics(projectId)` - Returns ALL epics
- `listWikiPages(projectId)` - Returns ALL wiki pages

### 🛠️ Technical Improvements

- **Eliminated Circular Dependencies**
  - Separated pagination logic into dedicated module
  - Clean import structure: `taigaService.js` → `pagination.js` (no circular refs)

- **Backward Compatibility**
  - All existing MCP tool calls work without any changes
  - API interfaces remain unchanged
  - Only difference: now returns complete data sets

### 📊 Impact

**Before (v1.9.14 and earlier):**
- Projects with >30 user stories: Only first 30 visible to LLM
- Projects with >30 issues: Only first 30 accessible
- Large projects: Incomplete data caused incorrect analysis

**After (v1.9.15):**
- **100% data coverage** for projects with <3000 items (100 pages × 30 items/page)
- Automatic handling of all pagination scenarios
- LLM has access to complete project state

### 🧪 Testing

**New Test Suite:**
```bash
node test/paginationTest.js
```

**Results:**
- Total Tests: 10
- Passed: 10 (100%)
- Failed: 0

**Coverage:**
- Utility functions (mock data)
- Real API calls (all list operations)
- Edge cases (max page limit, partial failures)

### 📝 Contributors

- Thanks to [@josuelopezv](https://github.com/josuelopezv) for reporting Issue #2
- Implementation by Claude Code + Human collaboration

---

## [1.9.14] - 2025-01-XX

### Added
- 🧠 智能Issue解析功能
- 📚 文檔系統完善

### Changed
- Issue管理功能優化

---

## [1.9.13] - Previous Version

### Added
- Issue status update tool
- Various bug fixes

---

## [Previous Versions]

See Git history for changes in earlier versions:
- v1.9.0 - v1.9.12: Epic and Wiki management features
- v1.8.0: Base64 file upload architecture
- v1.7.0: Comment system
- v1.6.0: Batch operations and advanced queries
- v1.5.0: Modular architecture
- v1.0.0: Initial MCP implementation

---

**Legend:**
- 🎯 Major Features
- ✨ Added
- 🔄 Changed
- 🐛 Fixed
- 🛠️ Technical Improvements
- 📊 Impact
- 🧪 Testing
- 📝 Documentation
