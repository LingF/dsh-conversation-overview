# 配置项

在「设置 → 会话概览」或插件行内配置中调整，选项即时生效（`vikingUrl` 之外的字段都不需要重启）。

## 字段说明

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `showProgress` | `true` | 显示「进展」分区 |
| `showArtifacts` | `true` | 显示「产物」分区 |
| `showReferences` | `true` | 显示「引用」分区 |
| `showStats` | `true` | 显示轮次统计胶囊（用时、工具调用等） |
| `timeMode` | `clock` | 时间显示：`clock` 时间点 / `elapsed` 本轮计时（从 0s 起） |
| `stepAnchors` | `false` | 里程碑步骤置顶：上下文压缩/用户审批/失败调用固定在关键步骤顶部 |
| `conclusionTab` | `true` | 本轮结束后把结论作为 Markdown 文档自动开在新标签（关闭后仍可从「产物」点开） |
| `placement` | `both` | 显示位置：`conversation` 对话页 / `sidebar` 侧边栏 / `both` |
| `sectionFullHeight` | `false` | 分区完整展示（关闭时限高 320px、内部滚动） |
| `todoPrompt` | `true` | 双击待办行生成重执行提示词并填入输入框 |
| `todoPromptTemplate` | `""` | 自定义提示词模板；留空用内置模板，支持 `{index}`、`{content}` 占位符 |
| `quickNav` | `true` | 强制显示内置轮次导航轨（关闭为强制隐藏） |
| `quickNavLink` | `true` | 点击导航轨刻度联动概览切换到对应轮次 |
| `vikingPreview` | `true` | 启用 `viking://` 记忆侧边栏预览 |
| `vikingUrl` | `http://127.0.0.1:1933` | OpenViking HTTP API 地址 |
| `vikingAccount` | `""` | OpenViking 账户（预览记忆必填） |
| `vikingUser` | `""` | OpenViking 用户（预览记忆必填） |

## 常见组合

| 想要的效果 | 设置 |
| --- | --- |
| 只要一个精简面板，去掉统计与引用 | `showStats: false`、`showReferences: false` |
| 想看本轮从 0s 起花了多久 | `timeMode: "elapsed"` |
| 关键步骤里固定看到压缩/审批/失败 | `stepAnchors: true` |
| 不自动弹出结论标签（需要时从「产物」点开） | `conclusionTab: false` |
| 只在右侧边栏出现，不在对话页加标签 | `placement: "sidebar"` |
| 双击待办按自己的模板重跑 | `todoPromptTemplate: "继续处理：{index} {content}"` |

## OpenViking 记忆预览

`vikingPreview` 打开后，「引用」里的 `viking://` 记忆可在侧边栏内预览，需要先填 `vikingUrl`、`vikingAccount`、`vikingUser`；未填账户/用户时该功能保持隐藏而不是报错。
