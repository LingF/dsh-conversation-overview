# dsh-conversation-overview

DeepSeek Harness（DSH）插件：在对话/轨迹旁增加「概览」标签页，并在右侧边栏提供同名面板，把一个会话折叠成三块可读的摘要——**进展**（目标、任务计划、关键步骤）、**产物**（生成/交付的文件与变更审阅）、**引用**（上下文注入、记忆、技能、文件、会话引用）。

> An Overview tab beside Chat/Trajectory plus a matching right-sidebar page for DeepSeek Harness: session progress (goal, todos, key steps), artifacts, and references (context injections, memories, skills, files), with per-turn scoping and OpenViking memory preview.

![会话概览截图](https://cdn.jsdelivr.net/npm/dsh-conversation-overview@1/assets/overview.png)

## 功能特性


- **进展**
  - 目标（goal）与阶段徽标；任务计划（todos）进度条与逐条状态；
  - 无任务计划的轮次显示「本轮关键步骤」：最近 6 次工具调用，时间正序（旧上新下），新步骤底部渐入、旧步骤顶部浅出；
  - 等待人为确认（权限审批/提问/计划确认）的步骤以琥珀色确认风格高亮；
  - 点击步骤行复制其完整目标文本（命令/文件路径/查询等），悬停查看全文；
  - 点击 todo 行把「重新执行指定步骤」的完整提示词模板填入聊天输入框（不自动发送）。
- **产物**：产出/交付文件列表、按轮次分组的变更审阅入口、Finder/系统定位。
- **引用**：上下文注入、OpenViking 记忆（`viking://`）、技能目录、文件与会话引用；
  - 类型多选下拉筛选（选中类型以 chips 显示）、「过滤常见」隐藏每轮都出现的注入、排序（最新/类型/次数）；
  - `viking://` 记忆在右侧边栏新标签页内预览（frontmatter 结构化 + Markdown 渲染 + 预览/源码切换，经 OpenViking HTTP API）；
  - 运行时上下文注入可点击打开快照预览标签页；文件路径点击定位。
- **范围选择器**：最新一轮 / 第 N 轮 / 全部轮次；轮次统计胶囊（用时、工具调用、命令、修改文件、失败数）。
- **快速导航联动**：可强制显示内置轮次导航轨（含窄容器下），轨道刻度带轮次号提示，点击刻度联动概览切换到对应轮次。
- **设置页**：DSH 设置中的独立分区 + 插件行内配置，全部选项即时生效。

## 安装

要求 DSH `>= 0.2.1-rc.2`（Web GUI）。

方式一：在 DSH 会话中让 Agent 执行插件管理器的 `install_bundle`，安装目标填：

```
dsh-conversation-overview
```

方式二：GUI「插件管理」中选择安装 bundle，输入上面的 npm 包名（或 `dsh-conversation-overview@latest`）。

安装后在「设置 → 会话概览」或插件行内配置中调整选项；对话页刷新即可看到「概览」标签页与右侧边栏入口。

> 注意：若此前安装过开发版 `@local/dsh-conversation-overview`，请先移除它再安装本包——两者使用相同的插件行 id（`conversation-overview`）与插槽 key，不应同时启用。

## 配置项

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `showProgress` | `true` | 显示「进展」分区 |
| `showArtifacts` | `true` | 显示「产物」分区 |
| `showReferences` | `true` | 显示「引用」分区 |
| `placement` | `both` | 显示位置：`conversation` 对话页 / `sidebar` 侧边栏 / `both` |
| `sectionFullHeight` | `false` | 分区完整展示（关闭时限高 320px、内部滚动） |
| `quickNav` | `true` | 强制显示内置轮次导航轨（关闭为强制隐藏） |
| `quickNavLink` | `true` | 点击导航轨刻度联动概览切换到对应轮次 |
| `vikingPreview` | `true` | 启用 `viking://` 记忆侧边栏预览 |
| `vikingUrl` | `http://127.0.0.1:1933` | OpenViking HTTP API 地址 |
| `vikingAccount` | `""` | OpenViking 账户（预览记忆必填） |
| `vikingUser` | `""` | OpenViking 用户（预览记忆必填） |

## 开发与测试

包内无构建步骤：`index.js`（Host 侧，schemastery Config + 资源定位）与 `client.js`（浏览器侧，`window.__ModuleLoader__` 工厂格式）均为源文件直发。

离线测试用真实会话日志（`session.v4.jsonl.zstd`）驱动折叠逻辑与设置表单断言：

```bash
node .scratch/test.mjs <path/to/session-a.jsonl.zstd> <path/to/session-b.jsonl.zstd>
```

## License

MIT © 2026
