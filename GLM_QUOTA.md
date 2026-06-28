# GLM / 智谱 套餐额度接入(claude-hud-glm)

本仓库是 [`jarrodwatts/claude-hud`](https://github.com/jarrodwatts/claude-hud) 的 fork,
额外把**智谱 GLM Coding Plan(或 Z.ai)的套餐额度**常驻显示在状态栏上,并且像 HUD
既有的每一行一样**逐项可勾选**。

> 智谱后端只暴露两个真正的"额度"维度:**5 小时 token 滚动窗口** 和 **月度 MCP 工具调用配额**。
> 没有"周配额"。本插件用 `model-usage` 接口自己累加近 7 天 token,作为**近似**展示(绝对量,非配额百分比)。

---

## 数据流

```
fetch.mjs  ──(每 4 分钟/快照过期时后台刷新)──▶  ~/.claude/glm-usage.json  ──▶  HUD 渲染时读取
```

HUD 渲染必须很快,**绝不在渲染时发网络请求**。所以由独立的 `fetch.mjs` 定时把额度写进
快照文件,HUD 只读文件。鉴权复用 Claude Code 已注入会话的 `ANTHROPIC_AUTH_TOKEN` /
`ANTHROPIC_BASE_URL`,无需额外配置 token。

---

## 展示项与配置开关

在 `~/.claude/plugins/claude-hud-glm/config.json` 的 `display` 里开关(全部默认按需,`showGlmQuota`
默认 `false`,开启它才会出现 GLM 行):

| 展示项 | config 开关 | 默认 | 示例 |
|---|---|---|---|
| GLM 行总开关 | `showGlmQuota` | `false` | (开启才显示整行) |
| 套餐等级 | `showGlmLevel` | `true` | `GLM max` |
| 月度 MCP 配额(进度条+%) | `showGlmMonthlyMcp` | `true` | `MCP月 ██░░ 18%` |
| MCP 已用/总量 | `showGlmMcpTotal` | `true` | `(744/4000)` |
| MCP 每工具明细 | `showGlmMcpBreakdown` | `false` | `search-prime 452 · zread 149` |
| 各模型 token | `showGlmModels` | `false` | `GLM-5.2 3.3B · GLM-4.7 21M` |
| 近 7 天 token(近似) | `showGlmWeeklyTokens` | `false` | `7d≈3.3B` |
| 重置倒计时 | `showGlmReset` | `true` | `resets in 16d 14h` |
| 快照文件路径 | `glmQuotaPath` | `~/.claude/glm-usage.json` | |
| 快照新鲜度容忍 | `glmQuotaFreshnessMs` | `300000`(5 分钟) | |

> **5 小时 token 额度**(智谱 `TOKENS_LIMIT`)直接复用 HUD 原生的 **Usage** 进度条
> (把数据喂进 `usageData.fiveHour`),所以无需另开一行。它跟随 `showGlmQuota` 生效:
> 关掉 `showGlmQuota`,5h 进度条也会一并消失(因为它本就是 GLM 数据)。

### 最小示例

```jsonc
{
  "display": {
    "showGlmQuota": true,
    "showGlmModels": true,
    "showGlmWeeklyTokens": true
  }
}
```

渲染效果(中文,`language: "zh-Hans"`):
```
[GLM-5.2] │ my-project
上下文 ████░░░░░░ 37% │ 用量 █░░░░░░░░░ 7% (重置剩余 2h 38m)
GLM max │ MCP月 ██░░░░░░░░ 18% (744/4000) │ GLM-5.2 3.3B · GLM-4.7 21M │ 周≈3.3B │ 重置剩余 16d 14h
```

---

## 安装

> 两种等价方式,配置文件共用同一路径(`~/.claude/plugins/claude-hud-glm/config.json`),切换不丢配置。

### 方式 A:作为插件安装(推荐,纯插件体验)

在 Claude Code 里:

```
/plugin marketplace add BND-1/claude-hud-glm
/plugin install claude-hud-glm@claude-hud-glm
```

装好后运行 `/configure` 勾选 GLM 各项,或直接编辑 config:

```jsonc
{ "display": { "showGlmQuota": true } }
```

statusLine 指向插件缓存里的 launcher(自动解析版本目录,launcher 内部会在快照过期时后台跑 `fetch.mjs`):

```bash
bash -c 'd=$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claude-hud-glm/claude-hud-glm/*/ 2>/dev/null | sort -V | tail -1); exec bash "${d}run-statusline.sh"'
```

### 方式 B:本地开发(clone 仓库直接跑,改代码 `npm run build` 后即时生效)

```bash
git clone https://github.com/BND-1/claude-hud-glm && cd claude-hud-glm
git remote add upstream https://github.com/jarrodwatts/claude-hud   # 便于以后 rebase 上游
npm install && npm run build                                         # 产出 dist/
node fetch.mjs --force                                               # 首次拉取额度
```

statusLine 直接指向 clone 的 launcher(脚本自解析目录、从 PATH/nvm/homebrew 找 node,无需改路径):

```json
"statusLine": { "type": "command", "command": "bash /绝对路径/claude-hud-glm/run-statusline.sh" }
```

然后在 `~/.claude/plugins/claude-hud-glm/config.json` 的 `display` 加 `"showGlmQuota": true`。

---

## 命令

- `node fetch.mjs` — 节流刷新(快照新鲜则不发请求)
- `node fetch.mjs --force` — 强制刷新
- `node fetch.mjs --print` — 只打印快照、不写文件

环境变量覆盖:`GLM_USAGE_PATH`(快照路径)、`GLM_TTL_MS`(节流毫秒,默认 240000)、
`GLM_FETCH_MODELS=0`(跳过 model-usage 调用)。

---

## 注意事项 / 取舍

- **"周额度"是近似**:智谱无周配额,`weekly_tokens` 是近 7 天 token 累加的绝对量,不是百分比。
- **"月额度"是 MCP 工具调用配额**(次数,如 744/4000),不是 token。
- **`/configure`**:本 fork 自带的 `/configure` 已认识所有 `showGlm*` 键(见 `commands/configure.md`
  的 Element Mapping)。请确保启用的是 `claude-hud-glm` 而非原 `claude-hud` 插件,否则旧插件的
  `/configure` 保存时可能丢掉这些键(GLM 行若消失,重新加 `"showGlmQuota": true` 即可)。
- **接口非公开文档化**:智谱 `/api/monitor/usage/*` 字段若变动,`fetch.mjs` 需跟进;缺字段时
  对应展示项会隐藏而非崩溃。
- **token 明文**:`ANTHROPIC_AUTH_TOKEN` 本就明文存于 `settings.json.env`(现状);fetcher 只复用,
  快照文件不含 token,权限 0600。
- **平台**:自动按 `ANTHROPIC_BASE_URL` 切换 ZHIPU(`open.bigmodel.cn`)与 Z.ai(`api.z.ai`)。

## 上游同步

```bash
git fetch upstream && git rebase upstream/main
```
冲突基本只在 `src/config.ts`、`src/render/index.ts` 两处(GLM 改动集中的文件)。
