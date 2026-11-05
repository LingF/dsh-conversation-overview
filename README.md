# dsh-conversation-overview

DeepSeek Harness（DSH）插件：在对话旁增加「概览」标签页，把一个会话折叠成 **进展 / 产物 / 引用** 三块可读摘要。

An Overview tab for DeepSeek Harness: folds a session into progress, artifacts, and references.

![会话概览截图](https://cdn.jsdelivr.net/npm/dsh-conversation-overview@1/assets/overview.png)

## 功能特性

- **进展**：会话目标与目标模式、待办进度、本轮关键步骤、团队成员；双击待办可生成重跑提示词。
- **产物**：文件与变更列表、按轮次审阅；本轮结束可把结论作为 Markdown 文档开在新标签，排版与对话一致，文件链接点开即预览。
- **引用**：上下文注入、OpenViking 记忆、技能、文件、会话；可筛选与排序。
- **回看**：时间轴拖动还原任意时刻；范围可切「最新 / 第 N 轮 / 全部」，与内置轮次导航轨联动。
- **预览**：Markdown 与 Mermaid 渲染、代码块复制。

## 安装

DSH 需 `>= 0.2.1-rc.2`（Web GUI）。

```bash
dsh plugin --profile web add dsh-conversation-overview
```

重启 `dsh` 生效。也可在 GUI「插件管理」中安装同名 bundle，或在会话里让 Agent 用插件管理器的 `install_bundle` 安装（这两种装完刷新页面即可）。

若之前用 `link:` 装过本地开发副本，请先移除再安装——两者插件行 id 相同，不应同时启用。

## 更新

```bash
dsh plugin --profile web update dsh-conversation-overview
```

或重装最新版：`dsh plugin --profile web add dsh-conversation-overview@latest`。更新后重启 `dsh`；若新版本增加了配置字段或改了宿主端，必须重启一次。

## 卸载

```bash
dsh plugin --profile web remove dsh-conversation-overview
```

## 配置

选项在「设置 → 会话概览」中调整，即时生效。全部 17 个字段（分区显隐、时间显示、结论标签页、里程碑置顶、提示词模板、OpenViking 预览等）见 [配置项](https://github.com/LingF/dsh-conversation-overview/blob/main/docs/CONFIGURATION.md)。

## 更多

- [开发与测试](https://github.com/LingF/dsh-conversation-overview/blob/main/docs/DEVELOPMENT.md) — 代码结构、本地调试安装、运行测试、发布流程
- [版本更新](https://github.com/LingF/dsh-conversation-overview/blob/main/CHANGELOG.md) — 每个版本的变化
- [问题反馈](https://github.com/LingF/dsh-conversation-overview/issues)

## License

MIT © 2026 lingf