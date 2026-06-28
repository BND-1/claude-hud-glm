# claude-hud-glm

一个 Claude Code 状态栏插件——展示上下文、工具、Agent、待办,**并常驻显示 GLM / 智谱(或 Z.ai)套餐额度**。[jarrodwatts/claude-hud](https://github.com/jarrodwatts/claude-hud) 的 fork。

> 🌐 [English](README.md) | 中文文档 | [GLM 额度接入说明](GLM_QUOTA.md)

![claude-hud-glm 效果](claude-hud-preview-5-2.png)

状态栏示例(带 GLM 行,`ring` 样式):
```
[GLM-5.2 (1M context)] │ my-project git:(main*)
上下文 ◑ 37% │ 用量 ◔ 7% (重置剩余 2h 38m)
GLM max │ MCP月 ◔ 18% (744/4000) │ 重置剩余 16d 14h
◐ Edit: auth.ts │ ▸ 修复登录 (2/5)
```

## 这个 fork 新增了什么

一条可配置的 **GLM 额度行**,由后台快照驱动(HUD 渲染时不发任何网络请求):

- **5 小时 token 额度** —— 复用原生 Usage 进度条/环形
- **月度 MCP 工具调用配额**(如 `744/4000`)
- 每工具明细 · 各模型 token · 近 7 天 token 近似 · 重置倒计时
- 8 个独立可勾选的 `display.showGlm*` 开关

完整开关列表与设置说明:**[GLM_QUOTA.md](GLM_QUOTA.md)**。

> 智谱后端**没有"周"配额**(那个 7 天数字是自己累加的 token 总量,不是百分比);"月额度"是 **MCP 工具调用**配额(次数),不是 token。

## 安装

在 Claude Code 里依次运行:
```
/plugin marketplace add BND-1/claude-hud-glm
/plugin install claude-hud-glm@claude-hud-glm
/claude-hud-glm:setup
```

`/claude-hud-glm:setup` 会写好 statusLine(已接好 GLM fetcher)、备份原 statusLine、并验证渲染。

**要显示 GLM 行**,在 `~/.claude/plugins/claude-hud/config.json` 加:
```jsonc
{ "display": { "showGlmQuota": true } }
```
> 配置目录硬编码为 `claude-hud`,所以即使装的是本插件,路径仍是 `~/.claude/plugins/claude-hud/config.json`——这是正常的,不是写错。

**GLM 额度的前提**:环境里要有 `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL`(指向 `open.bigmodel.cn` 或 `api.z.ai`)。Claude Code 本身就靠这俩跑智谱/Z.ai,所以智谱机器上天然就有;若是 Anthropic 官方环境,HUD 照常工作,只是 GLM 行没数据(自动隐藏,不报错)。

## 进度样式

`display.barStyle`:
- `bar`(默认)—— `███░░░░░░░ 37%`
- `ring` —— 紧凑 `◑ 37%`(单个 Unicode 环/饼字符,约 5 档)

## 其它

本插件是 [jarrodwatts/claude-hud](https://github.com/jarrodwatts/claude-hud) 的**超集**——原版所有功能都在:上下文进度、活跃工具、运行中 Agent、待办进度、用量限制、会话 token、缓存、git 状态、费用、内存等。用 `/claude-hud-glm:configure` 或直接编辑 `~/.claude/plugins/claude-hud/config.json` 配置。完整功能清单见[上游 README](https://github.com/jarrodwatts/claude-hud#readme)。

## 与上游同步

```bash
git remote add upstream https://github.com/jarrodwatts/claude-hud   # 只需一次
git fetch upstream && git rebase upstream/main
```
GLM 相关改动集中在 `src/config.ts`、`src/render/index.ts`、`src/glm-snapshot.ts`、`src/render/lines/glm-quota.ts`、`fetch.mjs`,rebase 很少冲突。

## 致谢

Fork 自 [jarrodwatts/claude-hud](https://github.com/jarrodwatts/claude-hud)(作者 Jarrod Watts)。本 fork 在其基础上增加了 GLM/智谱额度集成并做了品牌化。MIT 协议。
