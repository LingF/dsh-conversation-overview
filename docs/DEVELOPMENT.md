# 开发与测试

## 代码结构

包内**没有构建步骤**，两个源文件直接就是发布物：

| 文件 | 运行位置 | 职责 |
| --- | --- | --- |
| `index.js` | Host（Node） | schemastery 配置字段定义、`dsh-resource://` 资源定位与 Host 侧数据接口 |
| `client.js` | 浏览器（Web UI） | 概览页/侧边栏 UI、会话事件折叠、标签页注册，以 `window.__ModuleLoader__` 工厂函数形式被加载 |

改完文件后：Host 侧（`index.js`、`cordis.patch.yml` 的配置项）需要**重启 DSH** 才生效；纯客户端（`client.js`）**刷新页面**即可。

## 本地调试安装

```bash
# 让 profile 直接引用本地目录（改完刷新即生效，不必反复装包）
dsh plugin --profile web add link:/absolute/path/to/dsh-conversation-overview

# 确认装的是开发版而不是 npm 版
grep dsh-conversation-overview ~/.dsh/profiles/web/package.json   # 应看到 link:/…
```

## 运行测试

测试脚本随包发布，无需构建、无需联网。它会在 Node 里用桩（stub）替代浏览器环境——`window`、`localStorage`、`React`——然后加载 `client.js`，对**真实会话日志**做一遍完整折叠并断言结果。

```bash
# 默认自动取本机最近的 2 个会话日志
npm test

# 或指定任意日志（可传多个，跨会话、跨工作区都行）
node .scratch/test.mjs ~/.dsh/sessions/<workspace>/<session-id>/session.v4.jsonl.zstd \
                       ~/.dsh/sessions/<workspace>/<other-session-id>/session.v4.jsonl.zstd
```

- 依赖 **Node ≥ 20** 与 **`zstdcat`**（日志是 zstd 压缩的；macOS：`brew install zstd`）。
- 会话日志位置：`~/.dsh/sessions/<工作区>/<session-id>/session.v4.jsonl.zstd`，每一轮对话都在里面。
- 全部通过时输出 `ALL TESTS PASSED`，并列出实际检查了哪几个日志；任一断言失败会直接给出断言信息与所在行号。

## 测试覆盖范围

共 18 组、约 520 条断言，全部离线运行：

| # | 覆盖内容 |
| --- | --- |
| 1 | `zh`/`en` 词典键完全对齐（少一个键就失败，避免界面出现原始 key） |
| 2 | `apply()` 注册的标签页/插槽，以及每个配置开关的显隐效果 |
| 3 | 用真实日志跑完整折叠：待办、关键步骤、产物、引用、统计、里程碑 |
| 4 | 地址解析、助手提及、变更事件等纯函数 |
| 5 | 文件类型分类与工作区变更聚合 |
| 6 | OpenViking 预览与 Markdown 渲染 |
| 7 | frontmatter、面包屑、引用排序 |
| 8 | 按轮次折叠（`latest` / `all`）与上下文快照 |
| 9 | 全量引用识别（正文出现过的资源是否都被收集） |
| 10 | 关键步骤流与轮次导航轨的联动刻度 |
| 11 | 「新标签打开」确实落到宿主的 Markdown 文档页 |
| 12 | 「本轮结论」只在该轮结束后出现 |
| 13 | 结论自动打开：仅在观察到该轮运行后打开一次（刷新不重开） |
| 14 | 子代理界面只在真有子代理工作时出现（压缩里程碑不算） |
| 15 | 文档标签刷新后仍能恢复正文（快照镜像到 `localStorage`） |
| 16 | 代理身份判定：`origin: "subagent"` 才是子代理，分叉/续聊算主会话 |
| 17 | 子代理/团队委派的待办归属、步骤窗口边界、代理互跳概览、结论页渲染一致性 |
| 18 | 目标模式：`goal/change` 折叠、投影合并、可选服务的反射访问 |

> 这些断言同时充当回归护栏：改动 `client.js` 的折叠或显隐逻辑后先跑 `npm test`，比在浏览器里逐个点要快得多。

## 发布流程（维护者）

```bash
# 发布目录（本仓库）
npm test                                   # 必须先全绿
npm version patch                          # 或 minor / major
npm publish --registry https://registry.npmjs.org/
git push origin main --tags
```

GitHub 上的 `main` 与本仓库内容一致；npm 包只包含 `files` 里列出的文件（含本测试脚本）。
