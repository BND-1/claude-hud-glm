---
description: 配置 HUD 显示项(布局、语言、预设、显示元素、进度样式),保留高级手动覆盖
allowed-tools: Read, Write, AskUserQuestion
---

# 配置 claude-hud-glm

> **语言**:本流程所有向用户提出的问题与选项一律用**简体中文**呈现(下面的模板已是中文)。仅当用户明确要英文、或 `config.language` 已是 `en` 且用户要求英文时才用英文。

**第一步**:用 Read 工具读取 `~/.claude/plugins/claude-hud-glm/config.json`(若存在)。
记录当前值,并判断 config 是否存在(决定走哪个流程)。

## 默认开启的核心项

这些默认开启,大多数用户会保留。它们可配置(`display.showModel`、`display.showContextBar`),
但引导流程会保持它们开启——需要关就直接改 `config.json`:
- 模型名 `[Opus]`
- 上下文进度 `████░░░░░░ 45%`

以下高级项保存时会被**保留但不由本流程编辑**:`colors.*`、`pathLevels`、`maxWidth`、
`forceMaxWidth`、`elementOrder`、`display.mergeGroups`、`display.timeFormat`、
`display.contextValue`、`display.modelFormat`、`display.modelOverride`、
`display.showProvider`、`display.providerName`、`display.autocompactBuffer`、
`display.autoCompactWindow`、`display.promptCacheTtlSeconds`、`display.usageThreshold`、
`display.sevenDayThreshold`、`display.environmentThreshold`、`display.contextWarningThreshold`、
`display.contextCriticalThreshold`、`display.advisorOverride`、`display.externalUsage*`。

---

## 两个流程(按 config 是否存在选择)

### 流程 A:新用户(无 config)
提问顺序:**布局 → 预设 → 语言 → 进度样式 → 关闭 → 开启 → 自定义文字**

### 流程 B:更新 config(已存在)
提问顺序:**关闭 → 开启 → Git 样式 → 进度样式 → 布局/重置 → 语言 → 自定义文字**

> 每次调用 AskUserQuestion 最多 4 个问题;流程可分多次调用问完。

---

## 流程 A:新用户

### Q1:布局
- header: "布局"
- question: "选择 HUD 布局:"
- multiSelect: false
- options:
  - "展开行(推荐)" - 按语义分行(身份、项目、环境、用量)
  - "紧凑" - 全部挤在一行
  - "紧凑 + 分隔符" - 一行,活动区前加分隔线

### Q2:预设
- header: "预设"
- question: "选择一个起始配置:"
- multiSelect: false
- options:
  - "全部(推荐)" - 所有项都开
  - "精简" - 活动 + git,信息最少
  - "最小" - 仅核心(模型、上下文条)

### Q3:语言
- header: "语言"
- question: "HUD 标签用哪种语言?"
- multiSelect: false
- options:
  - "中文(推荐)" - 标签与状态文字用中文
  - "English" - 用英文标签

存为 `language: "zh-Hans"` 或 `language: "en"`。

### Q4:进度样式
- header: "进度样式"
- question: "进度条用哪种形式?"
- multiSelect: false
- options:
  - "进度条(推荐)" - 经典块状条,如 `███░░░░░░░ 37%`
  - "环形图(饼图样式)" - 紧凑单字符环/饼,如 `◑ 37%`(约 5 档,更省横向空间)

存为 `display.barStyle: "bar"` 或 `"ring"`。

### Q5:关闭(基于所选预设)
- header: "关闭"
- question: "要关掉其中哪些?(这些被你的预设开启了)"
- multiSelect: true
- options: **只列所选预设里为 ON 的项**(最多 4)
  - "工具活动" - ◐ Edit: file.ts | ✓ Read ×3
  - "Agent 状态" - ◐ explore [haiku]: Finding code
  - "待办进度" - ▸ Fix bug (2/5 tasks)
  - "项目名" - my-project 路径显示
  - "新增目录" - +repo +shared(/add-dir 加的目录)
  - "Git 状态" - git:(main*) 分支指示
  - "配置计数" - 2 CLAUDE.md | 4 rules
  - "Token 明细" - (in: 45k, cache: 12k)
  - "输出速度" - out: 42.1 tok/s
  - "用量限制" - 5h: 25% | 7d: 10%
  - "用量重置标签" - 显示/隐藏 `resets in` 前缀
  - "紧凑用量" - 5h: 25% (1h 30m) 更短格式
  - "会话时长" - ⏱️ 5m
  - "会话名" - fix-auth-bug(会话 slug 或自定义标题)
  - "会话 Token" - Tokens 12.8M (in: 7k, out: 28k, cache: 12.8M)
  - "推理强度" - ◑ high (low/medium/high/xhigh/max)
  - "输出风格" - style: explanatory(当前输出风格名)
  - "会话费用" - 💰 $0.42
  - "Skills 活动" - 活跃 skills 计数
  - "MCP 状态" - MCP 服务端状态
  - "内存占用" - 进程内存
  - "Prompt 缓存" - 缓存 TTL 倒计时
  - "Claude Code 版本" - 运行中的 CC 版本
  - "压缩次数" - Compactions: 2(/compact 或自动压缩后)
  - "Advisor 模型" - Advisor: Opus 4.7(配置了 /advisor 时)
  - "GLM 额度行" - GLM 套餐额度整行

### Q6:开启(基于所选预设)
- header: "开启"
- question: "要开启其中哪些?(这些被你的预设关掉了)"
- multiSelect: true
- options: **只列所选预设里为 OFF 的项**(最多 4)
  - (同上清单,筛出 OFF 的)

**注**:若预设全开(全部),Q6 显示"没有可开启的——'全部'预设已全开!";
若预设全关(最小),Q5 显示"没有可关闭的——'最小'预设已经最小!"。

### Q7:自定义文字(可选)
- header: "自定义文字"
- question: "要在 HUD 加一句自定义文字吗?(如座右铭,最多 80 字符)"
- multiSelect: false
- options:
  - "跳过" - 不加
  - "输入文字" - 用 AskUserQuestion 让用户输入(自由文本)

选"输入文字"则用 AskUserQuestion 取文本,存为 `display.customLine`。

---

## 流程 B:更新 config

### Q1:关闭
- header: "关闭"
- question: "要关掉哪些?(当前已开启)"
- multiSelect: true
- options: **只列当前为 ON 的项**(最多 4,优先活动项)
  - "工具活动" - ◐ Edit: file.ts | ✓ Read ×3
  - "Agent 状态" - ◐ explore [haiku]: Finding code
  - "待办进度" - ▸ Fix bug (2/5 tasks)
  - "项目名" - my-project 路径显示
  - "新增目录" - +repo +shared(/add-dir)
  - "Git 状态" - git:(main*) 分支指示
  - "会话名" - fix-auth-bug
  - "会话 Token" - Tokens 12.8M (in: 7k, out: 28k, cache: 12.8M)
  - "推理强度" - ◑ high
  - "输出风格" - style: explanatory
  - "会话费用" - 💰 $0.42
  - "Skills 活动" - 活跃 skills 计数
  - "MCP 状态" - MCP 服务端状态
  - "内存占用" - 进程内存
  - "Prompt 缓存" - 缓存 TTL 倒计时
  - "Claude Code 版本" - 运行中的 CC 版本
  - "压缩次数" - Compactions: 2
  - "Advisor 模型" - Advisor: Opus 4.7
  - "用量条样式" - ██░░ 25% 可视条(仅 usageBarEnabled=true 时)
  - "用量重置标签" - 显示/隐藏 `resets in`
  - "紧凑用量" - 5h: 25% (1h 30m)(仅 usageCompact=false 时)
  - "GLM 额度行" - GLM 套餐额度整行

若 ON 的超过 4 项,优先显示活动项(工具、Agent、待办、项目、Git)。
信息项(计数、Token、用量、速度、时长)可通过 Q5"重置为最小"关闭。

### Q2:开启
- header: "开启"
- question: "要开启哪些?(当前未开启)"
- multiSelect: true
- options: **只列当前为 OFF 的项**(最多 4)
  - "配置计数" - 2 CLAUDE.md | 4 rules
  - "Token 明细" - (in: 45k, cache: 12k)
  - "输出速度" - out: 42.1 tok/s
  - "用量限制" - 5h: 25% | 7d: 10%
  - "用量条样式" - ██░░ 25%(仅 usageBarEnabled=false 时)
  - "用量重置标签" - 显示/隐藏 `resets in`
  - "紧凑用量" - 5h: 25% (1h 30m)(仅 usageCompact=false 时)
  - "新增目录" - +repo +shared(/add-dir)
  - "会话名" - fix-auth-bug
  - "会话 Token" - Tokens 12.8M (...)
  - "会话时长" - ⏱️ 5m
  - "推理强度" - ◑ high
  - "输出风格" - style: explanatory
  - "会话费用" - 💰 $0.42
  - "Skills 活动" / "MCP 状态" / "内存占用" / "Prompt 缓存" / "Claude Code 版本" / "压缩次数" / "Advisor 模型"
  - "GLM 额度行" - GLM 套餐额度整行(showGlmQuota)

### Q3:Git 样式(仅当 Git 当前开启)
- header: "Git 样式"
- question: "Git 信息显示多少?"
- multiSelect: false
- options:
  - "仅分支" - git:(main)
  - "分支 + 修改" - git:(main*) 显示未提交改动
  - "完整" - git:(main* ↑2 ↓1) 含 ahead/behind
  - "文件统计" - git:(main* !2 +1 ?3) Starship 兼容格式

**Git 关闭时跳过 Q3**,直接到 Q4。

### Q4:进度样式
- header: "进度样式"
- question: "进度条用哪种形式?(当前:{bar/ring})"
- multiSelect: false
- options:
  - "保持当前" - 不变
  - "进度条" - `███░░░░░░░ 37%`(bar)
  - "环形图(饼图样式)" - `◑ 37%` 紧凑单字符(ring,约 5 档)

存为 `display.barStyle: "bar"` / `"ring"`。

### Q5:布局/重置
- header: "布局/重置"
- question: "改布局或重置为预设?"
- multiSelect: false
- options:
  - "保持当前" - 不改(当前:展开/紧凑/紧凑+分隔符)
  - "切到展开" - 按语义分行(若当前不是)
  - "切到紧凑" - 全部一行(若当前不是)
  - "重置为全部" - 全部开启
  - "重置为精简" - 仅活动 + git

### Q6:语言
- header: "语言"
- question: "更新 HUD 标签语言?(当前:{English 或 中文})"
- multiSelect: false
- options:
  - "保持当前" - 不变
  - "中文" - 用中文标签
  - "English" - 用英文标签

选"保持当前"则 `language` 不变;选"中文"存 `language: "zh-Hans"`;选"English"存 `language: "en"`。

### Q7:自定义文字(可选)
- header: "自定义文字"
- question: "更新自定义文字?(当前:'{当前 customLine 或 无}')"
- multiSelect: false
- options:
  - "保持当前" - 不变(未设置则跳过)
  - "输入文字" - 设置/更新(最多 80 字符)
  - "移除" - 清除自定义文字(仅当前已设置时显示)

选"输入文字"用 AskUserQuestion 取文本存 `display.customLine`;选"移除"置 `display.customLine: ""`。

---

## 预设定义

**全部**(全开):
- 活动:Tools/Skills/MCP/Agents/Todos ON
- 信息:Added Dirs/Counts/Tokens/Usage/Reset Label/Cost/Duration/Session Name/Session Tokens/Reasoning/Output Style/Memory/Prompt Cache/CC Version/Compactions/Advisor ON
- Git:ON(含修改标记,无 ahead/behind)

**精简**(活动 + git):
- 活动:Tools/Agents/Todos ON
- 信息:Counts/Tokens/Usage OFF,Duration ON,Session Name/Session Tokens OFF
- Git:ON(含修改标记)

**最小**(仅核心——默认):
- 活动:Tools/Agents/Todos OFF
- 信息:Counts/Tokens/Usage/Duration/Session Name/Session Tokens OFF
- Git:ON(含修改标记)

---

## 布局映射

| 选项 | Config |
|--------|--------|
| 展开 | `lineLayout: "expanded", showSeparators: false` |
| 紧凑 | `lineLayout: "compact", showSeparators: false` |
| 紧凑 + 分隔符 | `lineLayout: "compact", showSeparators: true` |

---

## 语言映射

| 选项 | Config |
|--------|--------|
| 中文 | `language: "zh-Hans"` |
| English | `language: "en"` |

---

## 进度样式映射

| 选项 | Config | 示例 |
|--------|--------|---------|
| 进度条 | `display.barStyle: "bar"` | `上下文 ███░░░░░░░ 37%` |
| 环形图 | `display.barStyle: "ring"` | `上下文 ◑ 37%`(约 5 档) |

---

## Git 样式映射

| 选项 | Config |
|--------|--------|
| 仅分支 | `gitStatus: { enabled: true, showDirty: false, showAheadBehind: false, showFileStats: false }` |
| 分支 + 修改 | `gitStatus: { enabled: true, showDirty: true, showAheadBehind: false, showFileStats: false }` |
| 完整 | `gitStatus: { enabled: true, showDirty: true, showAheadBehind: true, showFileStats: false }` |
| 文件统计 | `gitStatus: { enabled: true, showDirty: true, showAheadBehind: false, showFileStats: true }` |

---

## 元素映射(Element → Config Key)

| 元素 | Config Key |
|---------|------------|
| 模型名 | `display.showModel` |
| 上下文条 | `display.showContextBar` |
| 工具活动 | `display.showTools` |
| Skills 活动 | `display.showSkills` |
| MCP 状态 | `display.showMcp` |
| Agent 状态 | `display.showAgents` |
| 待办进度 | `display.showTodos` |
| 项目名 | `display.showProject` |
| 新增目录 | `display.showAddedDirs`(布局 `display.addedDirsLayout`) |
| Git 状态 | `gitStatus.enabled` |
| 配置计数 | `display.showConfigCounts` |
| Token 明细 | `display.showTokenBreakdown` |
| 输出速度 | `display.showSpeed` |
| 会话费用 | `display.showCost` |
| 用量限制 | `display.showUsage` |
| 用量条样式 | `display.usageBarEnabled` |
| **进度样式** | `display.barStyle`(`bar` 进度条 / `ring` 环形图) |
| 紧凑用量 | `display.usageCompact` |
| 用量数值 | `display.usageValue` |
| 用量重置标签 | `display.showResetLabel` |
| **GLM 额度行** | `display.showGlmQuota`(整行总开关) |
| GLM 套餐等级 | `display.showGlmLevel` |
| GLM 月度 MCP 配额 | `display.showGlmMonthlyMcp`(+ `display.showGlmMcpTotal` 显示 已用/总量) |
| GLM 每工具明细 | `display.showGlmMcpBreakdown` |
| GLM 各模型 token | `display.showGlmModels` |
| GLM 近 7 天 token | `display.showGlmWeeklyTokens` |
| GLM 重置倒计时 | `display.showGlmReset` |
| 会话名 | `display.showSessionName` |
| 会话时长 | `display.showDuration` |
| 会话 Token | `display.showSessionTokens` |
| 会话开始时间 | `display.showSessionStartDate` |
| 上次响应时间 | `display.showLastResponseAt` |
| 压缩次数 | `display.showCompactions` |
| 推理强度 | `display.showEffortLevel` |
| 输出风格 | `display.showOutputStyle` |
| 内存占用 | `display.showMemoryUsage` |
| Prompt 缓存 | `display.showPromptCache`(TTL `display.promptCacheTtlSeconds`) |
| Claude Code 版本 | `display.showClaudeCodeVersion` |
| Advisor 模型 | `display.showAdvisor`(覆盖 `display.advisorOverride`) |
| 自定义文字 | `display.customLine` |
| 自定义文字位置 | `display.customLinePosition` |

**默认 ON(可配置,引导流程保持开启):**
- `display.showModel`(默认 `true`)
- `display.showContextBar`(默认 `true`)

---

## 用量样式映射

| 选项 | Config | 示例 |
|--------|--------|---------|
| 条样式 | `usageBarEnabled: true` | `用量 ██░░ 25% (重置剩余 1h 30m)` |
| 文本样式 | `usageBarEnabled: false` | `用量 5h 25% (重置剩余 1h 30m)` |
| 紧凑 | `usageCompact: true` | `5h: 25% (1h 30m)` —— 无"用量"标签,更短 |

`usageCompact` 优先于 `usageBarEnabled`(紧凑模式恒为文本,无条)。

**注**:用量样式仅当 `display.showUsage: true` 生效。7d 用量 ≥80% 时也用相同样式。
手动设 `display.usageValue: "remaining"` 可显示剩余配额%(告警阈值仍按已用算)。

---

## 处理逻辑

### 新用户(流程 A):
1. 应用所选预设为基础
2. 应用所选语言
3. 应用所选进度样式(barStyle)
4. 应用"关闭"选择(置 OFF)
5. 应用"开启"选择(置 ON)
6. 应用所选布局

### 老用户(流程 B):
1. 从当前 config 起步
2. 应用"关闭"选择(置 OFF,含 usageBarEnabled 若选中)
3. 应用"开启"选择(置 ON,含 usageBarEnabled 若选中)
4. 应用 Git 样式(若显示)
5. 应用进度样式(barStyle,若非"保持当前")
6. 若选"重置为[预设]",用预设值覆盖
7. 若选布局变更,应用
8. 若选语言变更,应用

---

## 写入前 —— 校验与预览

**守卫 —— 出现以下情况不要写 config:**
- 用户取消(Esc)→ 说"已取消配置。"
- 与当前 config 无变化 → 说"无需更改——config 未变。"

**保存前展示预览:**

1. **变更摘要:**
```
布局: 紧凑 → 展开
语言: English → 中文
Git 样式: 分支 + 修改
进度样式: 环形图
变更:
  - 用量限制: OFF → ON
  - 配置计数: ON → OFF
```

2. **HUD 预览(展开布局,中文):**
```
[Opus | Pro] │ my-project git:(main*)
上下文 ████░░░░░ 45% │ 用量 ██░░░░░░░░ 25% (重置剩余 1h 30m / 5h)
◐ Edit: file.ts | ✓ Read ×3
▸ 修复登录 (2/5)
```

3. **确认**:"保存这些更改?"

---

## 写入配置

写入 `~/.claude/plugins/claude-hud-glm/config.json`。

与已有 config 合并,保留:
- `pathLevels`(不在流程内)
- `display.usageThreshold`(高级)
- `display.environmentThreshold`(高级)
- `display.contextWarningThreshold`(高级)
- `display.contextCriticalThreshold`(高级)
- `colors`(高级手动调色)

**迁移说明**:旧 config 里 `layout: "default"` / `"separators"` 会在加载时自动迁移为新的 `lineLayout` + `showSeparators`。

---

## 写入后

说:"配置已保存!HUD 会立即反映你的更改。"
