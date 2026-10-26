window.__ModuleLoader__.load({
  id: "dsh-conversation-overview",
  factory(require) {
    const React = require("react");
    const { jsx, jsxs } = require("react/jsx-runtime");
    const h = React.createElement;

    function cx(...parts) {
      return parts.filter((part) => typeof part === "string" && part.length > 0).join(" ");
    }

    const NS = "conversationOverview";
    const VIEW_ID = "overview";
    const TAB_ID = "dsh-conversation-overview/overview";
    const TAB_KIND = "conversation-overview";
    const CSS_TAG = "dsh-conversation-overview/overview.css";
    const CONFIG_GLOBAL = "__DSH_CONVERSATION_OVERVIEW_CONFIG__";
    const OVERLAY_KEY = "dsh.conversationOverview.config";
    const ROW_ID = "conversation-overview";
    const ROW_KEY = "dsh-conversation-overview#conversation-overview";
    const FEEDBACK_URL = "https://github.com/LingF/dsh-conversation-overview/issues";
    const RELEASES_URL = "https://github.com/LingF/dsh-conversation-overview/releases";
    const RELEASE_API_URL = "https://api.github.com/repos/LingF/dsh-conversation-overview/releases/latest";
    const RELEASE_TAGS_API_URL = "https://api.github.com/repos/LingF/dsh-conversation-overview/tags?per_page=100";
    const TAGS_URL = "https://github.com/LingF/dsh-conversation-overview/tags";
    /* keep in sync with package.json */
    const PLUGIN_VERSION = "1.1.0";
    const LATEST_CACHE_KEY = "dsh.conversationOverview.latestRelease";
    const LATEST_CACHE_TTL = 6 * 60 * 60 * 1000;
    const latestStore = { tag: null, via: "release", loaded: false, inflight: null };

    function compareVersions(left, right) {
      const parse = (value) =>
        String(value)
          .replace(/^v/i, "")
          .split("-")[0]
          .split(".")
          .map((part) => Number.parseInt(part, 10) || 0);
      const a = parse(left);
      const b = parse(right);
      for (let index = 0; index < 3; index += 1) {
        const delta = (a[index] || 0) - (b[index] || 0);
        if (delta !== 0) return delta;
      }
      return 0;
    }

    function fetchLatestRelease() {
      if (latestStore.loaded) return Promise.resolve(latestStore.tag);
      if (latestStore.inflight !== null) return latestStore.inflight;
      try {
        const raw = localStorage.getItem(LATEST_CACHE_KEY);
        if (typeof raw === "string") {
          const parsed = JSON.parse(raw);
          if (isRecord(parsed) && typeof parsed.tag === "string" && typeof parsed.time === "number" && Date.now() - parsed.time < LATEST_CACHE_TTL) {
            latestStore.tag = parsed.tag;
            latestStore.via = parsed.via === "tags" ? "tags" : "release";
            latestStore.loaded = true;
            return Promise.resolve(parsed.tag);
          }
        }
      } catch {
        /* cache is best-effort */
      }
      if (typeof fetch !== "function") return Promise.resolve(null);
      latestStore.inflight = fetch(RELEASE_API_URL, { headers: { Accept: "application/vnd.github+json" } })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          /* repos without formal releases fall back to the highest version tag */
          if (isRecord(payload) && typeof payload.tag_name === "string") return { tag: payload.tag_name, via: "release" };
          return fetch(RELEASE_TAGS_API_URL, { headers: { Accept: "application/vnd.github+json" } })
            .then((response) => (response.ok ? response.json() : []))
            .then((list) => {
              if (!Array.isArray(list)) return { tag: null, via: "release" };
              let best = null;
              for (const entry of list) {
                const name = isRecord(entry) && typeof entry.name === "string" ? entry.name : null;
                if (name !== null && (best === null || compareVersions(name, best) > 0)) best = name;
              }
              return { tag: best, via: "tags" };
            });
        })
        .then((found) => {
          latestStore.inflight = null;
          latestStore.loaded = true;
          latestStore.tag = found.tag;
          latestStore.via = found.via;
          if (found.tag !== null) {
            try {
              localStorage.setItem(LATEST_CACHE_KEY, JSON.stringify({ tag: found.tag, via: found.via, time: Date.now() }));
            } catch {
              /* storage is best-effort */
            }
          }
          return found.tag;
        })
        .catch(() => {
          latestStore.inflight = null;
          return null;
        });
      return latestStore.inflight;
    }

    function useLatestVersion() {
      const [tag, setTag] = React.useState(latestStore.tag);
      React.useEffect(() => {
        let cancelled = false;
        Promise.resolve(fetchLatestRelease()).then((value) => {
          if (!cancelled && typeof value === "string") setTag(value);
        });
        return () => {
          cancelled = true;
        };
      }, []);
      return typeof tag === "string" && compareVersions(tag, PLUGIN_VERSION) > 0 ? tag : null;
    }

    /* The plugin-manager renders every detail.badge entry on every page; only answer for ours. */
    function isOverviewSubject(subject) {
      if (!isRecord(subject)) return false;
      if (subject.kind === "item") return typeof subject.id === "string" && subject.id.indexOf("conversation-overview") !== -1;
      if (subject.kind === "row") {
        const row = isRecord(subject.row) ? subject.row : null;
        const pkg = isRecord(subject.pkg) ? subject.pkg : null;
        return (row !== null && String(row.rowId ?? "").indexOf("conversation-overview") !== -1) || (pkg !== null && String(pkg.name ?? "").indexOf("conversation-overview") !== -1);
      }
      return false;
    }

    function NewVersionBadge({ subject }) {
      const tag = useLatestVersion();
      if (tag === null || !isOverviewSubject(subject)) return null;
      return h(
        "a",
        {
          className: "dsov-newVer",
          href: latestStore.via === "tags" ? TAGS_URL : `${RELEASES_URL}/tag/${encodeURIComponent(tag)}`,
          target: "_blank",
          rel: "noreferrer",
          title: translate("settings.latestTitle"),
        },
        `${translate("settings.latestBadge")} ${tag}`
      );
    }

    function VersionRow({ t }) {
      const tag = useLatestVersion();
      return h(
        "div",
        { className: "dsov-set-ver" },
        tag !== null
          ? h(
              "a",
              {
                className: "dsov-newVer",
                href: latestStore.via === "tags" ? TAGS_URL : `${RELEASES_URL}/tag/${encodeURIComponent(tag)}`,
                target: "_blank",
                rel: "noreferrer",
                title: t("settings.latestTitle"),
              },
              `${t("settings.latestBadge")} ${tag}`
            )
          : null,
        h("span", null, `${t("settings.currentVersion")} v${PLUGIN_VERSION}`)
      );
    }
    const PLACEMENTS = ["conversation", "sidebar", "both"];
    const TIME_MODES = ["clock", "elapsed"];
    const CONFIG_FIELDS = ["showProgress", "showArtifacts", "showReferences", "showStats", "timeMode", "stepAnchors", "placement", "sectionFullHeight", "todoPrompt", "todoPromptTemplate", "quickNav", "quickNavLink", "vikingPreview", "vikingUrl", "vikingAccount", "vikingUser"];
    const VIKING_TAB_ID = "dsh-conversation-overview/viking";
    const VIKING_TAB_KIND = "viking-memory";
    const VIKING_ADDRESS_PREFIX = "dsh-resource://viking-memory/";
    const CONTEXT_TAB_ID = "dsh-conversation-overview/context";
    const CONTEXT_TAB_KIND = "overview-context";
    const VIKING_DEFAULTS = {
      vikingUrl: "http://127.0.0.1:1933",
      vikingAccount: "",
      vikingUser: "",
    };

    /* ------------------------------------------------------------------ */
    /* Dictionaries                                                        */
    /* ------------------------------------------------------------------ */

    const zh = {
      "view.tab": "概览",
      "panel.title": "概览",
      "guide.title": "会话概览",
      "guide.description": "进展、产物与引用",
      "section.progress": "进展",
      "section.artifacts": "产物",
      "section.references": "引用",
      "progress.empty": "生成任务/待办后将在此展示进展",
      "progress.emptyTurn": "本轮未创建任务计划",
      "progress.recentSteps": "本轮关键步骤（最近 6 条）",
      "step.compact": "上下文压缩",
      "step.approval": "用户审批",
      "progress.allSteps": "本轮关键步骤（全部）",
      "progress.showEarlierSteps": "显示更早的步骤",
      "progress.moreStepsCount": "还有 {n} 条",
      "progress.hideEarlierSteps": "收起早期步骤",
      "team.phase.provisioning": "创建中",
      "team.phase.active": "运行中",
      "team.phase.inactive": "空闲",
      "team.phase.failed": "失败",
      "team.blocked": "阻塞 {n}",
      "progress.expandTeam": "展开团队详情",
      "progress.collapseTeam": "收起团队详情",
      "progress.todoHint": "双击将该步骤的重执行提示词填入对话框",
      "progress.todoInserted": "已填入对话框",
      "progress.todoCopied": "未找到对话框，提示词已复制到剪贴板",
      "progress.todoFailed": "填入失败，请重试",
      "progress.waiting": "等待确认",
      "progress.counts": "{completed}/{total} 已完成",
      "artifacts.empty": "本次对话产出的文件将在此展示",
      "artifacts.viewAll": "查看所有改动",
      "settings.summary": "控制概览的板块与显示位置",
      "settings.nav": "概览",
      "settings.pageTitle": "会话概览（dsh-conversation-overview）",
      "settings.sections": "板块显示",
      "settings.showProgress": "进展（任务与待办）",
      "settings.showArtifacts": "产物（本次对话产出）",
      "settings.showReferences": "引用（上下文、记忆等）",
      "settings.showStats": "统计（用时、执行次数等）",
      "settings.timeMode": "时间显示",
      "settings.stepAnchors": "里程碑步骤置顶",
      "settings.stepAnchorsNote": "开启后，上下文压缩、用户审批与失败的工具调用固定在关键步骤顶部，不被最近窗口挤出；默认关闭，随窗口滚动。",
      "settings.timeMode.clock": "时间点",
      "settings.timeMode.elapsed": "本轮计时",
      "settings.timeModeNote": "「本轮计时」以本轮任务开始为 0s 起点，显示相对用时；悬停时间可查看对应的具体时间点。",
      "settings.currentVersion": "当前版本",
      "settings.latestBadge": "新版本",
      "settings.latestTitle": "在 GitHub 查看最新版本",
      "settings.feedbackGroup": "反馈",
      "settings.feedback": "问题反馈（GitHub Issues）",
      "settings.fullHeightRow": "分区完整展示（不限高）",
      "settings.fullHeightNote": "关闭时进展/产物/引用各自限制最大高度，超出部分在分区内滚动。",
      "settings.layout": "布局",
      "settings.placement.conversation": "对话标签页",
      "settings.placement.sidebar": "侧边栏",
      "settings.placement.both": "都显示",
      "settings.loading": "正在读取设置…",
      "settings.localNote": "宿主设置通道暂不可用：修改会先保存在本浏览器，并在宿主重启后自动并入插件配置。",
      "settings.localNoteBrief": "（修改暂存于本浏览器，稍后自动并入配置）",
      "settings.hint": "修改会保存到配置文件，概览界面即时生效。",
      "settings.on": "显示",
      "settings.off": "隐藏",
      "settings.quickNav": "快速导航",
      "settings.quickNavRow": "对话轮次导航条",
      "settings.quickNavLinkRow": "导航联动概览",
      "settings.quickNavNote": "对话区右侧的轮次刻度条：悬停预览该轮问答，点击跳转；开启后窄窗口下也保持显示，刻度悬停可见轮次号。",
      "settings.quickNavLinkNote": "点击导航刻度跳转对话时，已打开的概览同步切换到对应轮次。",
      "settings.interaction": "交互",
      "settings.todoPromptRow": "双击待办生成提示词",
      "settings.todoPromptTemplate": "提示词模板",
      "settings.todoPromptNote": "双击进展中的待办行，把重执行提示词填入输入框。",
      "settings.todoPromptTemplateNote": "模板留空则使用内置提示词；支持占位符 {index}（步骤序号）与 {content}（步骤内容）。",
      "settings.placementRow": "概览显示位置",
      "settings.viking": "OpenViking 记忆预览",
      "settings.vikingEnable": "启用记忆预览",
      "settings.vikingUrl": "服务地址",
      "settings.vikingAccount": "账号",
      "settings.vikingUser": "用户",
      "settings.vikingNote": "引用中的 viking:// 记忆可点击，在侧边栏标签页中预览其 markdown 内容。",
      "settings.vikingOffNote": "已关闭：引用中的 viking:// 记忆不再可点击预览。",
      "viking.loading": "正在加载记忆内容…",
      "viking.error": "无法加载记忆内容",
      "viking.retry": "重试",
      "viking.badAddress": "无效的记忆地址",
      "viking.preview": "预览",
      "viking.source": "源码",
      "viking.dirEmpty": "此目录为空",
      "viking.field.scenarios": "使用场景",
      "viking.field.keywords": "关键词",
      "viking.field.source": "来源",
      "reference.sort.time": "时间",
      "reference.sort.count": "次数",
      "reference.sort.time.title": "按最近引用排序",
      "reference.sort.count.title": "按引用次数排序",
      "reference.sort.cancel": "点击取消排序",
      "reference.previewHint": "点击预览注入的内容快照",
      "scope.label": "概览范围",
      "scope.latest": "最新一轮",
      "scope.all": "全部轮次",
      "scope.turn": "第 {n} 轮",
      "viking.revealTitle": "在系统文件管理器中打开所在目录",
      "viking.revealHint": "打开目录",
      "viking.revealFailed": "打开目录失败",
      "viking.revealRestart": "宿主路由未就绪，请重启 DSH 后重试",
      "viking.revealed": "已在系统中打开",
      "context.tab": "上下文预览",
      "context.subtitle": "注入内容快照",
      "context.unavailable": "内容快照不可用（页面刷新后需回到对应会话重新加载）",
      "skill.revealTitle": "在系统中打开技能 {name} 的目录",
      "skill.revealFailed": "打开技能目录失败",
      "skill.revealPending": "正在打开目录…",
      "references.empty": "对话引用的上下文、记忆等将在此展示",
      "references.onlyCommon": "当前视图的引用均为跨轮常见项，已被过滤",
      "reference.hideCommon": "过滤常见",
      "stats.duration": "用时 {v}",
      "stats.duration.title": "本轮用时（首末事件间隔）",
      "stats.duration.timeline": "点击打开时间轴，按时间点回看进展 / 产物 / 引用",
      "timeline.live": "最新",
      "timeline.reset": "回到最新",
      "timeline.prevTurn": "上一轮",
      "timeline.prevTurnTitle": "切换到第 {n} 轮，时间轴保持打开",
      "timeline.close": "关闭时间轴",
      "stats.tools": "工具 {n}",
      "stats.tools.title": "工具调用次数",
      "stats.commands": "命令 {n}",
      "stats.commands.title": "命令执行次数",
      "stats.files": "文件 {n}",
      "stats.files.title": "修改文件数",
      "stats.errors": "失败 {n}",
      "stats.errors.title": "失败的工具调用次数",
      "reference.types": "类型",
      "reference.types.title": "按类型筛选",
      "reference.types.all": "全部类型",
      "reference.types.remove": "移除该类型筛选",
      "reference.hideCommon.title": "隐藏几乎每轮都出现的资源（如每轮默认注入的记忆），只显示各轮独有的引用",
      "todo.pending": "待办",
      "todo.in_progress": "进行中",
      "todo.completed": "已完成",
      "goal.active": "进行中",
      "goal.paused": "已暂停",
      "goal.blocked": "受阻",
      "goal.complete": "已完成",
      "artifact.presented": "交付",
      "artifact.memory": "记忆",
      "artifact.menu.reveal": "在上层文件夹中显示",
      "artifact.menu.openWith": "打开方式",
      "artifact.menu.loading": "正在读取可用应用…",
      "artifact.menu.unavailable": "当前部署不支持系统打开",
      "artifact.menu.noApps": "未找到关联应用",
      "artifact.menu.default": "默认",
      "artifact.menu.revealError": "无法在上层文件夹中显示，请重试",
      "artifact.menu.openError": "无法用该应用打开，请重试",
      "artifact.produced": "生成",
      "artifact.binary": "二进制",
      "reference.kind.context": "上下文",
      "reference.kind.memory": "记忆",
      "reference.kind.skill": "技能",
      "reference.kind.file": "文件",
      "reference.kind.session": "会话",
      "reference.form.instructions": "注入",
      "reference.form.catalog": "目录",
      "reference.form.snapshot": "快照",
      "reference.form.notice": "通知",
      "reference.form.relay": "转发",
      "reference.form.recall": "召回",
      "reference.producer.runtimeContext": "运行时上下文",
      "reference.producer.skillCatalog": "技能目录",
      "reference.producer.agentInstructions": "Agent 指令",
      "reference.more": "+{n} 条",
      "reference.times": "×{n}",
      "action.openInSidebar": "在侧边栏打开",
      "state.loadingHistory": "正在载入更早的记录…",
      "state.noSession": "当前没有打开的会话",
      "state.error": "概览渲染失败",
    };

    const en = {
      "view.tab": "Overview",
      "panel.title": "Overview",
      "guide.title": "Conversation Overview",
      "guide.description": "Progress, artifacts & references",
      "section.progress": "Progress",
      "section.artifacts": "Artifacts",
      "section.references": "References",
      "progress.empty": "Progress appears here once tasks or todos are generated",
      "progress.emptyTurn": "No task plan was created in this turn",
      "progress.recentSteps": "Key steps in this turn (latest 6)",
      "step.compact": "Context compaction",
      "step.approval": "User approval",
      "progress.allSteps": "Key steps in this turn (all)",
      "progress.showEarlierSteps": "Show earlier steps",
      "progress.moreStepsCount": "{n} more steps",
      "progress.hideEarlierSteps": "Hide earlier steps",
      "progress.expandTeam": "Expand team details",
      "progress.collapseTeam": "Collapse team details",
      "progress.todoHint": "Double-click to fill the composer with a re-run prompt for this step",
      "progress.todoInserted": "Added to the composer",
      "progress.todoCopied": "Composer not found — prompt copied to the clipboard",
      "progress.todoFailed": "Could not fill the composer, try again",
      "progress.waiting": "Waiting for confirmation",
      "team.phase.provisioning": "Provisioning",
      "team.phase.active": "Active",
      "team.phase.inactive": "Inactive",
      "team.phase.failed": "Failed",
      "team.blocked": "Blocked {n}",
      "progress.counts": "{completed} of {total} completed",
      "artifacts.empty": "Files produced in this conversation appear here",
      "artifacts.viewAll": "Review all changes",
      "settings.summary": "Control the overview sections and where they appear",
      "settings.nav": "Overview",
      "settings.pageTitle": "Conversation Overview (dsh-conversation-overview)",
      "settings.sections": "Sections",
      "settings.showProgress": "Progress (tasks and todos)",
      "settings.showArtifacts": "Artifacts (files produced)",
      "settings.showReferences": "References (context, memories)",
      "settings.showStats": "Stats (duration, tool calls, …)",
      "settings.timeMode": "Time display",
      "settings.stepAnchors": "Pin milestone steps",
      "settings.stepAnchorsNote": "When on, context compaction, user approvals, and failed tool calls stay pinned above the latest-steps window instead of scrolling out. Off by default.",
      "settings.timeMode.clock": "Clock time",
      "settings.timeMode.elapsed": "Turn elapsed",
      "settings.timeModeNote": "'Turn elapsed' counts from 0s at the start of the turn; hover a time to see its clock value.",
      "settings.currentVersion": "Current version",
      "settings.latestBadge": "New version",
      "settings.latestTitle": "View the latest release on GitHub",
      "settings.feedbackGroup": "Feedback",
      "settings.feedback": "Report an issue (GitHub Issues)",
      "settings.fullHeightRow": "Show sections in full (no max height)",
      "settings.fullHeightNote": "When off, Progress/Artifacts/References cap their height and scroll inside each section.",
      "settings.layout": "Layout",
      "settings.placement.conversation": "Conversation tab",
      "settings.placement.sidebar": "Sidebar",
      "settings.placement.both": "Both",
      "settings.loading": "Loading settings…",
      "settings.localNote": "The host settings channel is unavailable: changes are stored in this browser and merge into the plugin configuration after a host restart.",
      "settings.localNoteBrief": "(stored in this browser until the host channel returns)",
      "settings.hint": "Changes are saved to the profile configuration and apply immediately.",
      "settings.on": "Show",
      "settings.off": "Hide",
      "settings.quickNav": "Quick navigation",
      "settings.quickNavRow": "Conversation turn rail",
      "settings.quickNavLinkRow": "Link rail with overview",
      "settings.quickNavNote": "The turn rail on the right edge of the chat: hover for a turn preview, click to jump. When enabled it stays visible in narrow windows too, and ticks show their turn number on hover.",
      "settings.quickNavLinkNote": "When you click a rail tick to jump, an open overview switches to that turn as well.",
      "settings.interaction": "Interaction",
      "settings.todoPromptRow": "Double-click todo prompt",
      "settings.todoPromptTemplate": "Prompt template",
      "settings.todoPromptNote": "Double-click a todo row in Progress to fill the rerun prompt into the composer.",
      "settings.todoPromptTemplateNote": "Leave empty for the built-in prompt; placeholders: {index} (step number), {content} (step text).",
      "settings.placementRow": "Show the overview in",
      "settings.viking": "OpenViking memory preview",
      "settings.vikingEnable": "Enable memory preview",
      "settings.vikingUrl": "Server URL",
      "settings.vikingAccount": "Account",
      "settings.vikingUser": "User",
      "settings.vikingNote": "viking:// memories in References become clickable and preview their markdown in a sidebar tab.",
      "settings.vikingOffNote": "Off: viking:// memories in References are no longer clickable.",
      "viking.loading": "Loading memory content…",
      "viking.error": "Could not load the memory content",
      "viking.retry": "Retry",
      "viking.badAddress": "Invalid memory address",
      "viking.preview": "Preview",
      "viking.source": "Source",
      "viking.dirEmpty": "This directory is empty",
      "viking.field.scenarios": "Usage scenarios",
      "viking.field.keywords": "Keywords",
      "viking.field.source": "Source",
      "reference.sort.time": "Time",
      "reference.sort.count": "Count",
      "reference.sort.time.title": "Sort by most recently referenced",
      "reference.sort.count.title": "Sort by reference count",
      "reference.sort.cancel": "Click again to clear",
      "reference.previewHint": "Click to preview the injected content snapshot",
      "scope.label": "Scope",
      "scope.latest": "Latest turn",
      "scope.all": "All turns",
      "scope.turn": "Turn {n}",
      "viking.revealTitle": "Open the containing directory in the system file manager",
      "viking.revealHint": "Open directory",
      "viking.revealFailed": "Could not open the directory",
      "viking.revealRestart": "Host route not ready — restart DSH and try again",
      "viking.revealed": "Opened in the system",
      "context.tab": "Context preview",
      "context.subtitle": "Injected content snapshot",
      "context.unavailable": "Content snapshot unavailable (return to the session to reload after a page refresh)",
      "skill.revealTitle": "Open the directory of skill {name} in the system",
      "skill.revealFailed": "Could not open the skill directory",
      "skill.revealPending": "Opening the directory…",
      "references.empty": "Context, memories and other references appear here",
      "references.onlyCommon": "Every reference in this view is a cross-turn common item and has been filtered out",
      "reference.hideCommon": "Filter common",
      "stats.duration": "{v} elapsed",
      "stats.duration.title": "Turn duration (first to last event)",
      "stats.duration.timeline": "Open the timeline to review progress, artifacts, and references at any moment",
      "timeline.live": "Live",
      "timeline.reset": "Back to live",
      "timeline.prevTurn": "Previous turn",
      "timeline.prevTurnTitle": "Switch to turn {n} and keep the timeline open",
      "timeline.close": "Close timeline",
      "stats.tools": "{n} tools",
      "stats.tools.title": "Tool calls",
      "stats.commands": "{n} cmds",
      "stats.commands.title": "Command executions",
      "stats.files": "{n} files",
      "stats.files.title": "Files changed",
      "stats.errors": "{n} failed",
      "stats.errors.title": "Failed tool calls",
      "reference.types": "Types",
      "reference.types.title": "Filter by type",
      "reference.types.all": "All types",
      "reference.types.remove": "Remove this type filter",
      "reference.hideCommon.title": "Hide resources that appear in (almost) every turn — such as the per-turn memory injection — and keep only turn-specific references",
      "todo.pending": "Pending",
      "todo.in_progress": "In progress",
      "todo.completed": "Completed",
      "goal.active": "Active",
      "goal.paused": "Paused",
      "goal.blocked": "Blocked",
      "goal.complete": "Completed",
      "artifact.presented": "Delivered",
      "artifact.memory": "Memory",
      "artifact.menu.reveal": "Show in Enclosing Folder",
      "artifact.menu.openWith": "Open With",
      "artifact.menu.loading": "Loading applications…",
      "artifact.menu.unavailable": "System open is unavailable in this deployment",
      "artifact.menu.noApps": "No associated applications found",
      "artifact.menu.default": "Default",
      "artifact.menu.revealError": "Could not reveal the file; try again",
      "artifact.menu.openError": "Could not open with this application; try again",
      "artifact.produced": "Produced",
      "artifact.binary": "binary",
      "reference.kind.context": "Context",
      "reference.kind.memory": "Memory",
      "reference.kind.skill": "Skill",
      "reference.kind.file": "File",
      "reference.kind.session": "Session",
      "reference.form.instructions": "instructions",
      "reference.form.catalog": "catalog",
      "reference.form.snapshot": "snapshot",
      "reference.form.notice": "notice",
      "reference.form.relay": "relay",
      "reference.form.recall": "recall",
      "reference.producer.runtimeContext": "Runtime context",
      "reference.producer.skillCatalog": "Skill catalog",
      "reference.producer.agentInstructions": "Agent instructions",
      "reference.more": "+{n} more",
      "reference.times": "×{n}",
      "action.openInSidebar": "Open in sidebar",
      "state.loadingHistory": "Loading earlier history…",
      "state.noSession": "No session is open",
      "state.error": "Overview failed to render",
    };

    /* ------------------------------------------------------------------ */
    /* Runtime handle                                                      */
    /* ------------------------------------------------------------------ */

    let runtime = null; // { ctx, t }

    function translate(key, params) {
      const t = runtime && runtime.t;
      return typeof t === "function" ? t(key, params) : key;
    }

    /* ------------------------------------------------------------------ */
    /* Display configuration (host Config -> boot global, live via forms)  */
    /* ------------------------------------------------------------------ */

    function normalizeConfig(raw) {
      const source = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
      const flag = (value) => (typeof value === "boolean" ? value : true);
      const text = (value, fallback) => (typeof value === "string" && value.trim() !== "" ? value.trim() : fallback);
      return {
        showProgress: flag(source.showProgress),
        showArtifacts: flag(source.showArtifacts),
        showReferences: flag(source.showReferences),
        showStats: flag(source.showStats),
        timeMode: TIME_MODES.indexOf(source.timeMode) !== -1 ? source.timeMode : "clock",
        stepAnchors: source.stepAnchors === true,
        placement: PLACEMENTS.indexOf(source.placement) !== -1 ? source.placement : "both",
        sectionFullHeight: source.sectionFullHeight === true,
        todoPrompt: typeof source.todoPrompt === "boolean" ? source.todoPrompt : true,
        todoPromptTemplate: typeof source.todoPromptTemplate === "string" ? source.todoPromptTemplate : "",
        quickNav: typeof source.quickNav === "boolean" ? source.quickNav : true,
        quickNavLink: typeof source.quickNavLink === "boolean" ? source.quickNavLink : true,
        vikingPreview: typeof source.vikingPreview === "boolean" ? source.vikingPreview : true,
        vikingUrl: text(source.vikingUrl, VIKING_DEFAULTS.vikingUrl).replace(/\/+$/, ""),
        vikingAccount: text(source.vikingAccount, VIKING_DEFAULTS.vikingAccount),
        vikingUser: text(source.vikingUser, VIKING_DEFAULTS.vikingUser),
      };
    }

    function readOverlay() {
      try {
        const raw = globalThis.localStorage ? globalThis.localStorage.getItem(OVERLAY_KEY) : null;
        if (typeof raw !== "string" || raw === "") return null;
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? normalizeConfig(parsed) : null;
      } catch (_unreadable) {
        return null;
      }
    }

    function writeOverlay(value) {
      try {
        if (globalThis.localStorage) globalThis.localStorage.setItem(OVERLAY_KEY, JSON.stringify(value));
      } catch (_unwritable) {
        /* private mode: the edit still applies for this page load */
      }
    }

    function clearOverlay() {
      try {
        if (globalThis.localStorage) globalThis.localStorage.removeItem(OVERLAY_KEY);
      } catch (_unwritable) {
        /* nothing to clear */
      }
    }

    const configStore = {
      boot: normalizeConfig(typeof globalThis !== "undefined" ? globalThis[CONFIG_GLOBAL] : undefined),
      formReady: false,
      formValue: null,
      overlay: null,
      current: null,
      listeners: new Set(),
    };
    configStore.overlay = readOverlay();
    configStore.current = configStore.overlay !== null ? configStore.overlay : configStore.boot;

    function resolveConfigValue() {
      if (configStore.formReady && configStore.formValue !== null) return configStore.formValue;
      if (configStore.overlay !== null) return configStore.overlay;
      return configStore.boot;
    }

    function notifyConfig() {
      const next = resolveConfigValue();
      const prev = configStore.current;
      if (CONFIG_FIELDS.every((field) => next[field] === prev[field])) {
        return;
      }
      configStore.current = next;
      for (const listener of [...configStore.listeners]) listener();
    }

    /** Adopt the Host form value (profile config) as the authoritative source. */
    function setFormConfig(raw) {
      configStore.formReady = true;
      configStore.formValue = normalizeConfig(raw);
      notifyConfig();
    }

    /** Local fallback edit while the Host settings namespace is unavailable. */
    function setOverlayConfig(raw) {
      configStore.overlay = normalizeConfig(raw);
      writeOverlay(configStore.overlay);
      notifyConfig();
    }

    function clearOverlayConfig() {
      if (configStore.overlay === null) return;
      configStore.overlay = null;
      clearOverlay();
      notifyConfig();
    }

    function subscribeConfig(listener) {
      configStore.listeners.add(listener);
      return () => {
        configStore.listeners.delete(listener);
      };
    }

    const readConfig = () => configStore.current;

    function useConfig() {
      return React.useSyncExternalStore(subscribeConfig, readConfig);
    }

    /* ------------------------------------------------------------------ */
    /* Small helpers                                                       */
    /* ------------------------------------------------------------------ */

    function isRecord(value) {
      return typeof value === "object" && value !== null && !Array.isArray(value);
    }

    function pathValue(value) {
      return typeof value === "string" && value.trim().length > 0 ? value : null;
    }

    function basename(path) {
      const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
      return at === -1 ? path : path.slice(at + 1);
    }

    function parseArgs(raw) {
      if (typeof raw !== "string" || raw.length === 0) return null;
      try {
        const value = JSON.parse(raw);
        return isRecord(value) ? value : null;
      } catch {
        return null;
      }
    }

    function pad2(value) {
      return String(value).padStart(2, "0");
    }

    /** Compact "since turn start" reading: 0s → 59s → 3m05s → 1h02m. */
    function formatElapsed(ms) {
      const sec = Math.max(0, Math.floor(ms / 1000));
      if (sec < 60) return `${sec}s`;
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min}m${pad2(sec % 60)}s`;
      return `${Math.floor(min / 60)}h${pad2(min % 60)}m`;
    }

    function formatTime(time, mode, base) {
      if (typeof time !== "number" || !Number.isFinite(time) || time <= 0) return "";
      if (mode === "elapsed" && typeof base === "number" && base > 0 && time >= base) return formatElapsed(time - base);
      const date = new Date(time);
      const now = new Date();
      const hm = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
      if (date.toDateString() === now.toDateString()) return hm;
      return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${hm}`;
    }

    function textOf(content) {
      if (!Array.isArray(content)) return "";
      const parts = [];
      for (const block of content) {
        if (isRecord(block) && block.type === "text" && typeof block.text === "string") parts.push(block.text);
      }
      return parts.join("\n");
    }

    function collect(source, member, field) {
      const list = isRecord(source) ? source[member] : null;
      if (!Array.isArray(list)) return [];
      const out = [];
      for (const entry of list) {
        const value = isRecord(entry) && typeof entry[field] === "string" ? entry[field] : null;
        if (value !== null && !out.includes(value)) out.push(value);
      }
      return out;
    }

    /* ------------------------------------------------------------------ */
    /* Mutation paths (mirrors the deliverables package's validated rules) */
    /* ------------------------------------------------------------------ */

    function validEditArgs(args) {
      return (
        typeof args.old_string === "string" &&
        args.old_string.length > 0 &&
        typeof args.new_string === "string" &&
        args.old_string !== args.new_string &&
        (args.replace_all === undefined || typeof args.replace_all === "boolean")
      );
    }

    function editorMutationPath(args) {
      const path = pathValue(args.path);
      if (path === null) return null;
      switch (args.command) {
        case "create":
          return typeof args.file_text === "string" ? path : null;
        case "str_replace":
          return typeof args.old_str === "string" && args.old_str.length > 0 && (args.new_str === undefined || typeof args.new_str === "string") ? path : null;
        case "insert":
          return typeof args.insert_line === "number" && Number.isInteger(args.insert_line) && args.insert_line >= 0 && typeof args.new_str === "string" ? path : null;
        default:
          return null;
      }
    }

    function mutationPath(name, argsRaw) {
      const args = parseArgs(argsRaw);
      if (args === null) return null;
      switch (name) {
        case "write":
          return typeof args.content === "string" ? pathValue(args.file_path) : null;
        case "edit":
          return validEditArgs(args) ? pathValue(args.file_path) : null;
        case "str_replace_editor":
          return editorMutationPath(args);
        default:
          return null;
      }
    }

    /* ------------------------------------------------------------------ */
    /* File addresses (mirrors the chat package's address composition)     */
    /* ------------------------------------------------------------------ */

    const FILE_ADDRESS_PREFIX = "dsh-resource://file/";

    function encodeSegment(segment) {
      return encodeURIComponent(segment).replace(/%3A/gi, ":");
    }

    function encodePath(path) {
      return path.split("/").map(encodeSegment).join("/");
    }

    function sessionFileAddress(sessionId, path) {
      const normalized = path.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "");
      return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(normalized)}`;
    }

    function isWindowsStylePath(value) {
      return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith("\\\\");
    }

    function isAbsoluteWorkspacePath(path) {
      return path.startsWith("/") || isWindowsStylePath(path);
    }

    function fileAddressFor(sessionId, cwd, path) {
      const normalized = path.replace(/\\/g, "/");
      if (!isAbsoluteWorkspacePath(normalized)) return sessionFileAddress(sessionId, normalized);
      const root = cwd === undefined || cwd === null ? "" : String(cwd).replace(/\\/g, "/").replace(/\/+$/, "");
      if (root !== "" && normalized === root) return sessionFileAddress(sessionId, "");
      if (root !== "" && normalized.startsWith(`${root}/`)) return sessionFileAddress(sessionId, normalized.slice(root.length + 1));
      return sessionFileAddress(sessionId, normalized);
    }

    function sessionCwd(sessionId) {
      const ctx = runtime && runtime.ctx;
      if (!ctx) return undefined;
      try {
        const row = ctx.sessions.list.getSnapshot().byId[sessionId];
        return row ? row.cwd : undefined;
      } catch {
        return undefined;
      }
    }

    function openSessionFile(sessionId, path) {
      const ctx = runtime && runtime.ctx;
      if (!ctx || typeof sessionId !== "string" || typeof path !== "string") return;
      const sidebar = ctx.sidebarRight;
      if (!sidebar || typeof sidebar.openResource !== "function") return;
      try {
        sidebar.openResource(fileAddressFor(sessionId, sessionCwd(sessionId), path));
      } catch {
        /* an unopenable address is a host-side concern; stay inert */
      }
    }

    /* ------------------------------------------------------------------ */
    /* Host desktop file actions (reveal / open with) via the session remote */
    /* ------------------------------------------------------------------ */

    const desktopOpenState = { value: null, inflight: null };

    function hostSessionRemote() {
      const ctx = runtime && runtime.ctx;
      if (!ctx) return null;
      try {
        /* the cordis context proxy THROWS for services this entry has not
           injected; degrade to "no desktop actions" instead of crashing render */
        const remote = ctx.remote;
        return isRecord(remote) && isRecord(remote.session) ? remote.session : null;
      } catch {
        return null;
      }
    }

    function desktopCanOpen() {
      const remote = hostSessionRemote();
      if (remote === null || typeof remote.canOpenWorkspacePath !== "function") return Promise.resolve(false);
      if (desktopOpenState.value !== null) return Promise.resolve(desktopOpenState.value);
      if (desktopOpenState.inflight !== null) return desktopOpenState.inflight;
      desktopOpenState.inflight = Promise.resolve()
        .then(() => remote.canOpenWorkspacePath())
        .then((result) => {
          desktopOpenState.value = isRecord(result) && result.ok === true && result.value === true;
          desktopOpenState.inflight = null;
          return desktopOpenState.value;
        })
        .catch(() => {
          desktopOpenState.inflight = null;
          return false;
        });
      return desktopOpenState.inflight;
    }

    function desktopOpenPath(path, action, application) {
      const remote = hostSessionRemote();
      if (remote === null || typeof remote.openWorkspacePath !== "function" || typeof path !== "string" || path === "") return Promise.resolve(false);
      const request = action === "reveal" ? { path, action } : application === undefined ? { path } : { path, application };
      return Promise.resolve()
        .then(() => remote.openWorkspacePath(request))
        .then((result) => isRecord(result) && result.ok === true)
        .catch(() => false);
    }

    function desktopApplications(path, signal) {
      const remote = hostSessionRemote();
      if (remote === null || typeof remote.workspacePathApplications !== "function") return Promise.resolve(null);
      return Promise.resolve()
        .then(() => remote.workspacePathApplications({ path }, signal))
        .then((result) => (isRecord(result) && result.ok === true && Array.isArray(result.value) ? result.value : null))
        .catch(() => null);
    }

    /* Right-click menu on an artifact row: reveal in the enclosing folder, or pick
       one of the OS-registered applications to open the file with. */
    function ArtifactFileMenu({ menu, t, onClose }) {
      const [phase, setPhase] = React.useState("loading"); /* loading | ready | unavailable */
      const [apps, setApps] = React.useState([]);
      const [failed, setFailed] = React.useState(null);
      const pathRef = React.useRef(menu.path);
      React.useEffect(() => {
        let cancelled = false;
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        desktopCanOpen().then((can) => {
          if (cancelled) return undefined;
          if (!can) {
            setPhase("unavailable");
            return undefined;
          }
          return desktopApplications(pathRef.current, controller !== null ? controller.signal : undefined).then((list) => {
            if (cancelled || (controller !== null && controller.signal.aborted)) return;
            setApps(list === null ? [] : list.filter((app) => isRecord(app) && typeof app.id === "string" && app.id !== "" && typeof app.name === "string"));
            setPhase("ready");
          });
        });
        return () => {
          cancelled = true;
          if (controller !== null) controller.abort();
        };
      }, []);
      const runAction = (action, application) => {
        desktopOpenPath(menu.path, action, application).then((ok) => {
          if (ok) onClose();
          else setFailed(action === "reveal" ? t("artifact.menu.revealError") : t("artifact.menu.openError"));
        });
      };
      const clamp = (value, max) => Math.max(8, Math.min(value, max));
      const style = {
        left: `${clamp(menu.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 250)}px`,
        top: `${clamp(menu.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 320)}px`,
      };
      return h(
        "div",
        { className: "dsov-fileMenu", style, onMouseDown: (event) => event.stopPropagation(), onContextMenu: (event) => event.preventDefault() },
        h("button", { type: "button", className: "dsov-fileMenuItem", onClick: () => runAction("reveal") }, t("artifact.menu.reveal")),
        h("div", { className: "dsov-fileMenuSep" }),
        h("div", { className: "dsov-fileMenuHead" }, t("artifact.menu.openWith")),
        phase === "loading" ? h("div", { className: "dsov-fileMenuHint" }, t("artifact.menu.loading")) : null,
        phase === "unavailable" ? h("div", { className: "dsov-fileMenuHint" }, t("artifact.menu.unavailable")) : null,
        phase === "ready" && apps.length === 0 ? h("div", { className: "dsov-fileMenuHint" }, t("artifact.menu.noApps")) : null,
        phase === "ready"
          ? apps.map((app) =>
              h(
                "button",
                { type: "button", className: "dsov-fileMenuItem", key: app.id, onClick: () => runAction("open", app.id) },
                typeof app.icon === "string" && app.icon !== "" ? h("img", { className: "dsov-fileMenuIcon", src: app.icon, alt: "" }) : h("span", { className: "dsov-fileMenuIcon" }),
                h("span", { className: "dsov-fileMenuName" }, app.name),
                app.default === true ? h("span", { className: "dsov-fileMenuTag" }, t("artifact.menu.default")) : null
              )
            )
          : null,
        failed !== null ? h("div", { className: "dsov-fileMenuErr" }, failed) : null
      );
    }

    function openOverviewTab() {
      const ctx = runtime && runtime.ctx;
      const sidebar = ctx && ctx.sidebarRight;
      if (!sidebar || typeof sidebar.openTab !== "function") return;
      try {
        sidebar.openTab(TAB_KIND);
      } catch {
        /* no on-screen session: nothing to open into */
      }
    }

    /* ------------------------------------------------------------------ */
    /* Turn change summaries (served by the Host's changes routes)         */
    /* ------------------------------------------------------------------ */

    const CHANGES_REVIEW_ADDRESS = "dsh-resource://changes-review/session/";

    function isChangedFile(value) {
      if (!isRecord(value)) return false;
      const { path, display, added, deleted, binary, oversized } = value;
      return (
        typeof path === "string" &&
        path.length > 0 &&
        typeof display === "string" &&
        display.length > 0 &&
        Number.isSafeInteger(added) &&
        Number.isSafeInteger(deleted) &&
        (binary === undefined || binary === true) &&
        (oversized === undefined || oversized === true)
      );
    }

    function isChangesSummary(value) {
      if (!isRecord(value)) return false;
      const { turn, files, total, added, deleted } = value;
      return (
        Number.isSafeInteger(turn) &&
        turn >= 1 &&
        Number.isSafeInteger(total) &&
        Number.isSafeInteger(added) &&
        Number.isSafeInteger(deleted) &&
        Array.isArray(files) &&
        files.every(isChangedFile)
      );
    }

    /** Completed-turn summaries are immutable; only the newest (possibly running) turn is refetched. */
    const turnSummaryCache = new Map();

    function fetchTurnSummary(sessionId, seq, cacheable) {
      const key = `${sessionId}:${seq}`;
      if (cacheable && turnSummaryCache.has(key)) return turnSummaryCache.get(key);
      const promise = (async () => {
        try {
          const response = await fetch(`api/changes.summary?${new URLSearchParams({ sessionId, seq: String(seq) })}`);
          if (!response.ok) return null;
          const value = await response.json();
          return isChangesSummary(value) ? value : null;
        } catch {
          return null;
        }
      })();
      if (cacheable) turnSummaryCache.set(key, promise);
      return promise;
    }

    function changesReviewAddress(sessionId, seq, turn) {
      return `${CHANGES_REVIEW_ADDRESS}${encodeURIComponent(sessionId)}/${seq}/${turn}`;
    }

    function openChangesReview(sessionId, coords, index) {
      const ctx = runtime && runtime.ctx;
      const sidebar = ctx && ctx.sidebarRight;
      if (!sidebar || typeof sidebar.openResource !== "function" || !coords) return false;
      try {
        sidebar.openResource(changesReviewAddress(sessionId, coords.seq, coords.turn), index === undefined ? {} : { params: { index } });
        return true;
      } catch {
        return false;
      }
    }

    /* ------------------------------------------------------------------ */
    /* OpenViking memory preview (viking:// markdown in a sidebar tab)     */
    /* ------------------------------------------------------------------ */

    function isVikingUri(value) {
      return typeof value === "string" && value.startsWith("viking://");
    }

    /** Display name for a viking:// URI: last path segment without the .md suffix. */
    function vikingName(uri) {
      const trimmed = String(uri).replace(/\/+$/, "");
      const at = trimmed.lastIndexOf("/");
      const segment = at === -1 ? trimmed : trimmed.slice(at + 1);
      const name = segment.endsWith(".md") ? segment.slice(0, -3) : segment;
      return name === "" ? String(uri) : name;
    }

    /** SKILL.md refs read as their skill folder name so several skills stay distinguishable. */
    function vikingSkillName(uri) {
      const match = /\/skills\/([^/]+)\/SKILL\.md$/i.exec(String(uri));
      return match !== null ? match[1] : null;
    }

    function vikingLabel(uri) {
      const skill = vikingSkillName(uri);
      return skill !== null ? skill : vikingName(uri);
    }

    /** Ref kind: anything under a skills/ root reads as SKILL, the rest stays a memory file. */
    function vikingRefKind(uri) {
      const value = String(uri);
      return /\/skills\/[^/]+(\/SKILL\.md)?\/?$/i.test(value) ? "skill" : "memory-file";
    }

    /** Folder URIs end with "/" or their last segment carries no file extension. */
    function vikingIsDir(uri) {
      const value = String(uri);
      if (value.endsWith("/")) return true;
      const parts = value.split("/").filter((part) => part !== "");
      const last = parts.length > 0 ? parts[parts.length - 1] : "";
      return last !== "" && last.indexOf(".") === -1;
    }

    function vikingAddress(uri) {
      return `${VIKING_ADDRESS_PREFIX}${encodeURIComponent(uri)}`;
    }

    function parseVikingAddress(address) {
      if (typeof address !== "string" || !address.startsWith(VIKING_ADDRESS_PREFIX)) return undefined;
      let uri;
      try {
        uri = decodeURIComponent(address.slice(VIKING_ADDRESS_PREFIX.length));
      } catch (_malformed) {
        return undefined;
      }
      return isVikingUri(uri) ? uri : undefined;
    }

    /** Ask the plugin's Host route to reveal one viking:// directory or skill folder in the system file manager. */
    async function revealInSystem(params) {
      const response = await fetch(`/api/overview.reveal?${new URLSearchParams(params)}`, { method: "POST" });
      if (response.ok) return null;
      if (response.status === 404) return translate("viking.revealRestart");
      const text = await response.text().catch(() => "");
      return text !== "" && text.length < 200 ? text : `HTTP ${response.status}`;
    }

    /** Containing directory URI of a viking:// file, or null at/above the scheme root. */
    function vikingParentUri(uri) {
      const trimmed = String(uri).replace(/\/+$/, "");
      const cut = trimmed.lastIndexOf("/");
      const schemeEnd = trimmed.indexOf("://");
      if (schemeEnd < 0 || cut <= schemeEnd + 3) return null;
      return `${trimmed.slice(0, cut)}/`;
    }

    function openVikingPreview(uri) {
      const ctx = runtime && runtime.ctx;
      const sidebar = ctx && ctx.sidebarRight;
      if (!sidebar || typeof sidebar.openResource !== "function" || !isVikingUri(uri)) return false;
      if (configStore.current.vikingUrl === "") return false;
      try {
        sidebar.openResource(vikingAddress(uri));
        return true;
      } catch {
        return false;
      }
    }

    /** Fetch raw markdown for a viking:// URI; directory URIs reject with error.directory. */
    async function fetchVikingContent(uri, cfg, signal) {
      const params = new URLSearchParams({ uri, raw: "true" });
      if (cfg.vikingAccount !== "") params.set("account_id", cfg.vikingAccount);
      if (cfg.vikingUser !== "") params.set("user_id", cfg.vikingUser);
      const response = await fetch(`${cfg.vikingUrl}/api/v1/content/read?${params}`, { signal });
      const value = await response.json().catch(() => null);
      if (isRecord(value) && value.status === "ok" && typeof value.result === "string") return value.result;
      const failure = isRecord(value) && isRecord(value.error) ? value.error : null;
      const details = failure !== null && isRecord(failure.details) ? failure.details : null;
      const message = failure !== null && typeof failure.message === "string" && failure.message !== "" ? failure.message : `HTTP ${response.status}`;
      const error = new Error(message);
      error.directory = (details !== null && details.actual === "directory") || /Directory URI/i.test(message);
      throw error;
    }

    /** List one viking:// directory through the fs API; entries are {uri, name, isDir, size, time, abstract}. */
    async function fetchVikingDir(uri, cfg, signal) {
      const params = new URLSearchParams({ uri });
      if (cfg.vikingAccount !== "") params.set("account_id", cfg.vikingAccount);
      if (cfg.vikingUser !== "") params.set("user_id", cfg.vikingUser);
      const response = await fetch(`${cfg.vikingUrl}/api/v1/fs/ls?${params}`, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = await response.json();
      if (!isRecord(value) || value.status !== "ok" || !Array.isArray(value.result)) {
        throw new Error(isRecord(value) && isRecord(value.error) && typeof value.error.message === "string" ? value.error.message : "error");
      }
      const entries = [];
      for (const item of value.result) {
        if (!isRecord(item) || !isVikingUri(item.uri)) continue;
        entries.push({
          uri: item.uri,
          name: vikingName(item.uri),
          isDir: item.isDir === true,
          size: Number.isSafeInteger(item.size) ? item.size : null,
          time: typeof item.modTime === "string" ? Date.parse(item.modTime) : 0,
          abstract: typeof item.abstract === "string" && item.abstract !== "" ? item.abstract : undefined,
        });
      }
      entries.sort((left, right) => (left.isDir === right.isDir ? 0 : left.isDir ? -1 : 1) || left.name.localeCompare(right.name));
      return entries;
    }

    /** Breadcrumb segments: cumulative directory prefixes plus the leaf name. */
    function vikingSegments(uri) {
      const body = String(uri).replace(/^viking:\/\/+/, "").replace(/\/+$/, "");
      const parts = body.split("/").filter((part) => part !== "");
      const segments = [];
      let prefix = "viking://";
      for (let index = 0; index < parts.length; index += 1) {
        prefix = `${prefix.replace(/\/$/, "")}/${parts[index]}`;
        segments.push({
          name: parts[index],
          uri: index === parts.length - 1 ? String(uri).replace(/\/+$/, "") : `${prefix}/`,
          leaf: index === parts.length - 1,
        });
      }
      return segments;
    }

    function formatBytes(size) {
      if (!Number.isSafeInteger(size) || size < 0) return "";
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    /** Split a leading --- YAML frontmatter block into ordered fields plus the body. */
    function parseFrontmatter(text) {
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(String(text));
      if (!match) return { fields: [], body: String(text) };
      const fields = [];
      let current = null;
      for (const raw of match[1].split("\n")) {
        const line = raw.replace(/\s+$/, "");
        if (/^\s*-\s+/.test(line) && current !== null) {
          current.items.push(unquoteText(line.replace(/^\s*-\s+/, "").trim()));
          continue;
        }
        const kv = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line);
        if (kv) {
          current = { key: kv[1], value: unquoteText(kv[2].trim()), items: [] };
          fields.push(current);
          continue;
        }
        if (current !== null && /^\s+\S/.test(raw) && line.trim() !== "") {
          current.value = current.value === "" ? unquoteText(line.trim()) : `${current.value} ${unquoteText(line.trim())}`;
        }
      }
      return { fields, body: String(text).slice(match[0].length) };
    }

    function unquoteText(value) {
      if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
        return value.slice(1, -1);
      }
      return value;
    }

    /* Minimal, escape-first markdown renderer for memory previews. */
    function escapeHtml(text) {
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function inlineMd(text) {
      return text
        .replace(/`([^`]+)`/g, '<code class="dsov-md-code">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
        .replace(
          /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
          '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>'
        );
    }

    /**
     * Convert markdown to sanitized HTML: input is escaped first, so only the
     * markup this function introduces reaches the DOM.
     */
    function mdToHtml(markdown) {
      const lines = escapeHtml(markdown).split("\n");
      const out = [];
      let fence = null;
      let list = null; // "ul" | "ol"
      let paragraph = [];
      const closeList = () => {
        if (list !== null) {
          out.push(`</${list}>`);
          list = null;
        }
      };
      const flushParagraph = () => {
        if (paragraph.length > 0) {
          out.push(`<p>${inlineMd(paragraph.join(" "))}</p>`);
          paragraph = [];
        }
      };
      for (const line of lines) {
        const trimmed = line.trim();
        if (fence !== null) {
          if (trimmed.startsWith("```")) {
            out.push(`<pre class="dsov-md-pre"><code>${fence.join("\n")}</code></pre>`);
            fence = null;
          } else {
            fence.push(line);
          }
          continue;
        }
        if (trimmed.startsWith("```")) {
          flushParagraph();
          closeList();
          fence = [];
          continue;
        }
        if (trimmed === "") {
          flushParagraph();
          closeList();
          continue;
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
        if (heading) {
          flushParagraph();
          closeList();
          const level = Math.min(heading[1].length + 1, 6);
          out.push(`<h${level} class="dsov-md-h">${inlineMd(heading[2])}</h${level}>`);
          continue;
        }
        if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
          flushParagraph();
          closeList();
          out.push('<hr class="dsov-md-hr">');
          continue;
        }
        const quote = /^&gt;\s?(.*)$/.exec(trimmed);
        if (quote) {
          flushParagraph();
          closeList();
          out.push(`<blockquote class="dsov-md-quote">${inlineMd(quote[1])}</blockquote>`);
          continue;
        }
        const unordered = /^[-*+]\s+(.*)$/.exec(trimmed);
        const ordered = /^(\d+)[.)]\s+(.*)$/.exec(trimmed);
        if (unordered || ordered) {
          flushParagraph();
          const want = unordered ? "ul" : "ol";
          if (list !== want) {
            closeList();
            out.push(`<${want} class="dsov-md-list">`);
            list = want;
          }
          out.push(`<li>${inlineMd(unordered ? unordered[1] : ordered[2])}</li>`);
          continue;
        }
        closeList();
        paragraph.push(trimmed);
      }
      if (fence !== null) out.push(`<pre class="dsov-md-pre"><code>${fence.join("\n")}</code></pre>`);
      flushParagraph();
      closeList();
      return out.join("");
    }

    /** Absolute posix form used to match summary paths against tool-event paths. */
    function absPath(cwd, path) {
      const normalized = String(path).replace(/\\/g, "/");
      if (isAbsoluteWorkspacePath(normalized)) return normalized;
      const root = cwd === undefined || cwd === null ? "" : String(cwd).replace(/\\/g, "/").replace(/\/+$/, "");
      return root === "" ? normalized : `${root}/${normalized}`;
    }

    function openArtifact(binding, artifact, stats) {
      if (typeof artifact.path === "string" && artifact.path.startsWith("viking://")) {
        openVikingPreview(artifact.path);
        return;
      }
      if (!binding) return;
      const stat = stats ? stats.get(absPath(sessionCwd(binding.sessionId), artifact.path)) : undefined;
      if (stat && stat.coords && openChangesReview(binding.sessionId, stat.coords, stat.index)) return;
      openSessionFile(binding.sessionId, artifact.path);
    }

    /* ------------------------------------------------------------------ */
    /* @mention extraction from user prompts                               */
    /* ------------------------------------------------------------------ */

    const SESSION_MENTION_RE = /@\[([^\]\n]{1,200})\]\(dsh-session:[^)\s]*\)/g;
    const QUOTED_MENTION_RE = /(?<![\w.\-])@"([^"\n]{1,400})"/g;
    const BARE_MENTION_RE = /(?<![\w.\-])@([^\s@<>|"'[()]+)/g;

    function trimTrailingPunctuation(token) {
      return token.replace(/[.,;:!?，。；：！？]+$/, "");
    }

    function looksLikePath(token) {
      if (token.indexOf("://") !== -1) return false;
      if (token.indexOf("/") !== -1) return true;
      return /\.[A-Za-z0-9]{1,10}$/.test(token);
    }

    function mentionsOfUserText(text) {
      const files = [];
      const sessions = [];
      if (typeof text !== "string" || text.indexOf("@") === -1) return { files, sessions };
      const withoutSessionMentions = text.replace(SESSION_MENTION_RE, (_match, label) => {
        const trimmed = label.trim();
        if (trimmed.length > 0 && !sessions.includes(trimmed)) sessions.push(trimmed);
        return " ";
      });
      const stripped = withoutSessionMentions
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`\n]*`/g, " ");
      const seen = new Set();
      let match;
      QUOTED_MENTION_RE.lastIndex = 0;
      while ((match = QUOTED_MENTION_RE.exec(stripped)) !== null && files.length < 20) {
        const token = match[1].trim();
        if (token.length === 0 || token.indexOf("://") !== -1 || seen.has(token)) continue;
        seen.add(token);
        files.push(token);
      }
      BARE_MENTION_RE.lastIndex = 0;
      while ((match = BARE_MENTION_RE.exec(stripped)) !== null && files.length < 20) {
        const token = trimTrailingPunctuation(match[1]);
        if (token.length === 0 || seen.has(token) || !looksLikePath(token)) continue;
        seen.add(token);
        files.push(token);
      }
      return { files, sessions };
    }

    /* ------------------------------------------------------------------ */
    /* Context injection labeling                                          */
    /* ------------------------------------------------------------------ */

    const VIKING_URI_RE = /viking:\/\/[^\s"'<>)\]。，、；：！？（）「」『』【】《》…]+/g;
    /* URIs may contain spaces (e.g. "…/大 json 前端渲染方案.md"); inside quoted attributes
       the full value can be recovered. Quoted hits win; bare hits that are a
       space-truncated prefix of a quoted URI are dropped. */
    const VIKING_QUOTED_RE = /["'](viking:\/\/[^"'<>]+)["']/g;

    function extractVikingUris(text) {
      const uris = [];
      const push = (candidate) => {
        const uri = String(candidate).replace(/[.,;:!?。，；：！？]+$/, "");
        if (!isVikingUri(uri) || uris.length >= 12) return;
        if (uris.includes(uri)) return;
        if (uris.some((existing) => existing.startsWith(uri) && existing.charAt(uri.length) === " ")) return;
        uris.push(uri);
      };
      let match;
      VIKING_QUOTED_RE.lastIndex = 0;
      while ((match = VIKING_QUOTED_RE.exec(text)) !== null) push(match[1].split(/[。，、；：！？（）「」『』【】《》…]/)[0]);
      VIKING_URI_RE.lastIndex = 0;
      while ((match = VIKING_URI_RE.exec(text)) !== null) push(match[0]);
      return uris;
    }

    function memoryToolsOf(name) {
      const match = /^mcp__openviking__(\w+)$/i.exec(name);
      if (!match) return null;
      return match[1].toLowerCase();
    }

    const MEMORY_REFERENCE_TOOLS = new Set(["search", "find", "read", "glob", "grep", "list", "tree"]);
    /* viking write tools produce durable memory files: they fold into the artifacts section */
    const MEMORY_MUTATION_TOOLS = new Set(["write", "edit", "add_resource", "add_skill"]);

    function refKindForSource(source, kind) {
      if (kind.startsWith("plugin:openviking") || kind.startsWith("plugin:ov")) return "memory";
      if (kind === "session-reference") return "session";
      if (kind === "skill-invocation") return "skill";
      return "context";
    }

    function contextLabel(source, kind) {
      if (!isRecord(source)) return kind;
      if (kind === "session-reference") {
        const labels = collect(source, "references", "label");
        return labels.length > 0 ? labels.join(", ") : kind;
      }
      if (kind === "agent-instructions") {
        const paths = collect(source, "changes", "path");
        return paths.length > 0 ? paths.join(", ") : kind;
      }
      if (kind === "skill-invocation") return typeof source.name === "string" && source.name.length > 0 ? source.name : kind;
      if (kind.startsWith("plugin:")) return typeof source.plugin === "string" && source.plugin.length > 0 ? source.plugin : kind.slice("plugin:".length);
      return kind;
    }

    function contextDetail(source, content) {
      const kind = isRecord(source) && typeof source.kind === "string" ? source.kind : "";
      if (kind.startsWith("plugin:openviking") || kind.startsWith("plugin:ov")) {
        const text = textOf(content);
        /* The memory plugin's URI-guard notice quotes example URIs; they are meta text, not injected memories. */
        if (text.includes("[OpenViking memory plugin]") || text.includes("URI guard:")) return [];
        return extractVikingUris(text);
      }
      if (kind === "skill-catalog") return collect(source, "entries", "name").slice(0, 8);
      if (kind === "runtime-context") return collect(source, "sections", "name").slice(0, 8);
      if (kind === "session-reference") return collect(source, "references", "label").slice(0, 8);
      if (kind === "agent-instructions") return collect(source, "changes", "path").slice(0, 8);
      return [];
    }

    /* ------------------------------------------------------------------ */
    /* Event folding                                                       */
    /* ------------------------------------------------------------------ */

    const SURFACE_EVENT_TYPES = new Set(["system/message", "developer/message", "user/message", "assistant/message", "tool/result"]);

    function isAppendSurfaceEvent(event) {
      if (!SURFACE_EVENT_TYPES.has(event.type)) return false;
      return event.surfaceOp === undefined || event.surfaceOp === "append";
    }

    /** Per-scope counters behind the turn stats bar. */
    function createStats() {
      return { start: 0, end: 0, toolCalls: 0, commands: 0, errors: 0, files: new Set() };
    }

    function bumpStatTime(stats, time) {
      if (stats.start === 0 || time < stats.start) stats.start = time;
      if (time > stats.end) stats.end = time;
    }

    function createFolder() {
      return {
        sessionId: null,
        currentTurn: 0,
        todos: null,
        todosTime: 0,
        todosSeq: 0,
        todoRecords: [],
        artifacts: new Map(),
        refs: new Map(),
        refOrder: [],
        pending: new Map(),
        changes: [],
        steps: [],
        anchors: [],
        stepByCall: new Map(),
        byTurn: new Map(),
        members: new Map(),
        teamTasks: new Map(),
        subagents: new Map(),
        stats: createStats(),
        changed: false,
      };
    }

    /** Upsert one team/member, team/task or subagent/catalog record; first observation time is kept. */
    function upsertTeamRecord(map, key, record) {
      const existing = map.get(key);
      map.set(key, existing === undefined ? { ...record, firstTime: record.time } : { ...existing, ...record, firstTime: existing.firstTime });
    }

    function createTurnBucket() {
      return { artifacts: new Map(), refs: new Map(), refOrder: [], changes: [], steps: [], anchors: [], members: new Map(), teamTasks: new Map(), subagents: new Map(), stats: createStats() };
    }

    const EMPTY_BUCKET = Object.freeze({ artifacts: new Map(), refs: new Map(), refOrder: [], changes: [], steps: [], anchors: [], members: new Map(), teamTasks: new Map(), subagents: new Map(), stats: Object.freeze(createStats()) });

    function turnBucket(folder, turn) {
      let bucket = folder.byTurn.get(turn);
      if (bucket === undefined) {
        bucket = createTurnBucket();
        folder.byTurn.set(turn, bucket);
      }
      return bucket;
    }

    /** Snapshot text for context-injection previews, keyed by session plus reference key. */
    const contextPreviews = new Map();
    const CONTEXT_PREVIEW_LIMIT = 400;
    const CONTEXT_TEXT_LIMIT = 120000;

    function rememberContextPreview(sessionId, refKey, title, text) {
      if (typeof sessionId !== "string" || sessionId === "" || typeof text !== "string" || text === "") return undefined;
      const globalKey = `${sessionId}|${refKey}`;
      contextPreviews.set(globalKey, { title: typeof title === "string" && title !== "" ? title : refKey, text: text.length > CONTEXT_TEXT_LIMIT ? `${text.slice(0, CONTEXT_TEXT_LIMIT)}\n…` : text });
      while (contextPreviews.size > CONTEXT_PREVIEW_LIMIT) {
        const oldest = contextPreviews.keys().next();
        if (oldest.done === true) break;
        contextPreviews.delete(oldest.value);
      }
      return globalKey;
    }

    function readContextPreview(globalKey) {
      const entry = contextPreviews.get(globalKey);
      return entry === undefined ? null : entry;
    }

    const CONTEXT_ADDRESS_PREFIX = "dsh-resource://overview-context/";

    function contextPreviewAddress(globalKey) {
      return `${CONTEXT_ADDRESS_PREFIX}${encodeURIComponent(globalKey)}`;
    }

    function parseContextAddress(address) {
      if (typeof address !== "string" || !address.startsWith(CONTEXT_ADDRESS_PREFIX)) return undefined;
      try {
        const key = decodeURIComponent(address.slice(CONTEXT_ADDRESS_PREFIX.length));
        return key === "" ? undefined : key;
      } catch {
        return undefined;
      }
    }

    function openContextPreview(globalKey) {
      const sidebar = runtime && runtime.ctx ? runtime.ctx.sidebarRight : undefined;
      if (!sidebar || typeof sidebar.openResource !== "function") return;
      sidebar.openResource(contextPreviewAddress(globalKey));
    }

    /* Quick-nav linkage: a click on the built-in turn rail broadcasts a scope request
       that every mounted overview follows (module-level, cross-instance). */
    const navScopeStore = { rev: 0, selection: null, listeners: new Set() };

    function requestNavScope(selection) {
      navScopeStore.selection = selection;
      navScopeStore.rev += 1;
      for (const listener of [...navScopeStore.listeners]) listener();
    }

    /* Re-run prompt for one todo step. Placeholder {index}/{content} are substituted;
       an empty template falls back to the built-in default. */
    const DEFAULT_TODO_TEMPLATE = [
      "请查看当前任务的完整 TODO 计划，重新执行以下指定步骤：",
      "",
      "**目标步骤：{index}. {content}**",
      "",
      "要求：",
      "1. 查看完整计划及相关上下文，明确目标步骤的执行要求和前置依赖。",
      "2. 无论该步骤当前状态如何，都必须重新检查并实际执行，不得直接跳过。",
      "3. 仅处理目标步骤所需内容，避免重复执行其他步骤或修改无关内容。",
      "4. 执行必要的测试或验证，如实反馈结果。",
      "5. 更新目标步骤的 TODO 状态，保持其他步骤状态不变。",
      "6. 汇报执行结果、修改内容及未解决的问题。",
      "",
      "**请直接执行，不要只提供方案。**",
    ].join("\n");

    function rerunPrompt(number, content, template) {
      const source = typeof template === "string" && template.trim() !== "" ? template : DEFAULT_TODO_TEMPLATE;
      return source.split("{index}").join(String(number)).split("{content}").join(String(content));
    }

    /** The visible Lexical chat composer root (contenteditable textbox), or null. */
    function findComposerRoot() {
      if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return null;
      let roots;
      try {
        roots = document.querySelectorAll('[contenteditable="true"][role="textbox"]');
      } catch {
        return null;
      }
      for (const root of roots) {
        if (root.offsetParent !== null && root.offsetParent !== undefined) return root;
      }
      return roots.length > 0 ? roots[0] : null;
    }

    /** Fill text into the composer without sending. Returns "inserted" | "copied" | "failed". */
    function insertIntoComposer(text) {
      const root = findComposerRoot();
      if (root !== null) {
        try {
          root.focus();
        } catch {
          /* focus best-effort */
        }
        try {
          const transfer = new DataTransfer();
          transfer.setData("text/plain", text);
          const event = new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true });
          if (event.clipboardData !== null && event.clipboardData !== undefined) {
            root.dispatchEvent(event);
            return "inserted";
          }
          const editor = root.__lexicalEditor;
          if (editor !== null && editor !== undefined && typeof editor.dispatchCommand === "function") {
            const handled = editor.dispatchCommand("PASTE_COMMAND", { clipboardData: transfer, preventDefault() {}, stopPropagation() {} });
            if (handled === true) return "inserted";
          }
        } catch {
          /* synthetic paste unavailable; fall through to clipboard */
        }
      }
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard !== undefined && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(text).catch(() => {});
          return "copied";
        }
      } catch {
        /* no clipboard access */
      }
      return "failed";
    }

    function subscribeNavScope(listener) {
      navScopeStore.listeners.add(listener);
      return () => {
        navScopeStore.listeners.delete(listener);
      };
    }

    const readNavScopeRev = () => navScopeStore.rev;

    function useNavScopeRev() {
      return React.useSyncExternalStore(subscribeNavScope, readNavScopeRev);
    }

    /** True while the session has a pending interaction (approval / question / plan exit). */
    function readSessionStatusSource() {
      const ctx = runtime && runtime.ctx;
      if (!ctx) return undefined;
      try {
        return ctx.uiSession && ctx.uiSession.sessionStatus ? ctx.uiSession.sessionStatus : undefined;
      } catch {
        return undefined;
      }
    }

    function useSessionWaiting(sessionId) {
      const source = readSessionStatusSource();
      const subscribe = React.useCallback(
        (onChange) => (source !== undefined && typeof source.subscribe === "function" ? source.subscribe(onChange) : () => {}),
        [source]
      );
      const read = React.useCallback(() => {
        if (source === undefined || typeof source.getSnapshot !== "function" || typeof sessionId !== "string") return false;
        try {
          const snapshot = source.getSnapshot();
          const status = snapshot !== null && snapshot !== undefined && typeof snapshot.get === "function" ? snapshot.get(sessionId) : undefined;
          return status !== undefined && status !== null && status.pendingInteraction !== undefined;
        } catch {
          return false;
        }
      }, [source, sessionId]);
      return React.useSyncExternalStore(subscribe, read);
    }

    function touch(folder) {
      folder.changed = true;
    }

    function upsertArtifact(folder, bucket, path, update) {
      const existing = folder.artifacts.get(path);
      if (existing) {
        if (typeof update.description === "string" && update.description.length > 0) existing.description = update.description;
        if (update.presented) existing.presented = true;
        if (update.produced) existing.produced = true;
        if (typeof update.time === "number" && update.time > 0) existing.time = update.time;
        if (typeof update.seq === "number") existing.seq = Math.max(existing.seq, update.seq);
        const bucketExisting = bucket.artifacts.get(path);
        if (bucketExisting) {
          if (typeof update.description === "string" && update.description.length > 0) bucketExisting.description = update.description;
          if (update.presented) bucketExisting.presented = true;
          if (update.produced) bucketExisting.produced = true;
          if (typeof update.time === "number" && update.time > 0) bucketExisting.time = update.time;
          if (typeof update.seq === "number") bucketExisting.seq = Math.max(bucketExisting.seq, update.seq);
        } else {
          bucket.artifacts.set(path, { ...folder.artifacts.get(path) });
        }
        touch(folder);
        return;
      }
      const artifact = {
        path,
        description: typeof update.description === "string" ? update.description : undefined,
        presented: update.presented === true,
        produced: update.produced === true,
        time: typeof update.time === "number" ? update.time : 0,
        firstTime: typeof update.time === "number" ? update.time : 0,
        seq: typeof update.seq === "number" ? update.seq : 0,
      };
      folder.artifacts.set(path, artifact);
      bucket.artifacts.set(path, { ...artifact });
      touch(folder);
    }

    /** Record that one global ref appeared in the folder's current turn (unique, ascending). */
    function noteRefTurn(stored, folder) {
      const turn = folder.currentTurn;
      if (typeof turn !== "number" || turn < 1) return;
      if (!Array.isArray(stored.turns)) stored.turns = [];
      if (stored.turns.indexOf(turn) === -1) stored.turns.push(turn);
    }

    function addReference(folder, bucket, ref) {
      const existing = folder.refs.get(ref.key);
      if (existing) {
        existing.count += 1;
        noteRefTurn(existing, folder);
        if (typeof ref.time === "number" && ref.time >= existing.time) {
          existing.time = ref.time;
          existing.seq = ref.seq;
        }
        if ((!existing.detail || existing.detail.length === 0) && ref.detail && ref.detail.length > 0) existing.detail = ref.detail;
        if (typeof ref.previewKey === "string") existing.previewKey = ref.previewKey;
        const bucketExisting = bucket.refs.get(ref.key);
        if (bucketExisting) {
          bucketExisting.count += 1;
          if (typeof ref.time === "number" && ref.time >= bucketExisting.time) {
            bucketExisting.time = ref.time;
            bucketExisting.seq = ref.seq;
          }
          if (typeof ref.previewKey === "string") bucketExisting.previewKey = ref.previewKey;
        } else {
          bucket.refs.set(ref.key, { ...existing });
          bucket.refOrder.push(ref.key);
        }
        touch(folder);
        return;
      }
      const stored = { ...ref, count: 1, firstTime: typeof ref.time === "number" ? ref.time : 0 };
      noteRefTurn(stored, folder);
      folder.refs.set(ref.key, stored);
      folder.refOrder.push(ref.key);
      bucket.refs.set(ref.key, { ...stored });
      bucket.refOrder.push(ref.key);
      touch(folder);
    }

    /* Key-step stream: every tool call is one step; the result marks it done. Shown by
       the Progress section when a turn has no todo plan of its own. */
    const STEP_CAP = 200;

    /** One-line human target for a tool call: file, command, query, url, name… */
    /** Team-record key a tool call creates: teammate name / task subject / subagent label. */
    /** Match team delegates (members, subagents, tasks) to todo items by normalized text
        containment, so each delegate renders under the todo it belongs to. */
    function planTodoAttachments(todos, members, teamTasks, subagents) {
      const attachments = new Map();
      if (!Array.isArray(todos) || todos.length === 0) return attachments;
      const normText = (value) =>
        typeof value === "string"
          ? value
              .toLowerCase()
              .replace(/[-_/]+/g, " ")
              .replace(/[^a-z0-9\u4e00-\u9fff ]+/g, "")
              .replace(/\s+/g, " ")
              .trim()
          : "";
      const matchScore = (a, b) => {
        const x = normText(a);
        const y = normText(b);
        if (x === "" || y === "") return 0;
        if (x === y) return x.length;
        if (x.length >= 6 && y.includes(x)) return x.length;
        if (y.length >= 6 && x.includes(y)) return y.length;
        return 0;
      };
      const ownedBy = (id) => teamTasks.filter((task) => isRecord(task) && task.ownerId === id);
      const bestFor = (texts) => {
        let best = -1;
        let bestScore = 5;
        todos.forEach((todo, index) => {
          const content = isRecord(todo) ? todo.content : "";
          let score = 0;
          for (const text of texts) score = Math.max(score, matchScore(text, content));
          if (score > bestScore) {
            bestScore = score;
            best = index;
          }
        });
        return best;
      };
      const attach = (index, item) => {
        const list = attachments.get(index);
        if (list === undefined) attachments.set(index, [item]);
        else list.push(item);
      };
      for (const member of members.filter(isRecord)) {
        const owned = ownedBy(member.id);
        const index = bestFor([member.name, member.description, ...owned.map((task) => task.subject)]);
        if (index >= 0) attach(index, { kind: "member", record: member, owned });
      }
      for (const sub of subagents.filter(isRecord)) {
        const index = bestFor([sub.label]);
        if (index >= 0) attach(index, { kind: "sub", record: sub, owned: [] });
      }
      const memberOwned = new Set();
      for (const list of attachments.values()) {
        for (const item of list) {
          if (item.kind === "member") for (const task of item.owned) memberOwned.add(task.id);
        }
      }
      for (const task of teamTasks.filter(isRecord)) {
        if (memberOwned.has(task.id)) continue;
        if (typeof task.ownerId === "string" && members.some((member) => isRecord(member) && member.id === task.ownerId)) continue;
        const index = bestFor([task.subject]);
        if (index >= 0) attach(index, { kind: "task", record: task, owned: [] });
      }
      const timeOf = (item) => (isRecord(item.record) && typeof item.record.time === "number" ? item.record.time : 0);
      for (const list of attachments.values()) list.sort((left, right) => timeOf(left) - timeOf(right));
      return attachments;
    }

    function teamStepKey(name, args) {
      if (!isRecord(args)) return undefined;
      if (name === "spawn_teammate" && typeof args.name === "string" && args.name !== "") return args.name;
      if (name === "team_task_create" && typeof args.subject === "string" && args.subject !== "") return args.subject;
      if ((name === "subagent" || name === "subagent_fork") && typeof args.description === "string" && args.description !== "") return args.description;
      return undefined;
    }

    function stepDetail(name, args) {
      if (!isRecord(args)) return "";
      const keys = ["file_path", "path", "command", "pattern", "url", "query", "prompt", "subject", "description", "name", "uri", "target", "id"];
      let text = "";
      for (const key of keys) {
        const value = args[key];
        if (typeof value === "string" && value.trim() !== "") {
          text = value;
          break;
        }
      }
      if (text === "" && Array.isArray(args.queries) && typeof args.queries[0] === "string") text = args.queries[0];
      text = text.replace(/\s+/g, " ").trim();
      return text.length > 64 ? `${text.slice(0, 61)}…` : text;
    }

    /** Untruncated target text for hover/copy (whitespace preserved, hard cap 4000). */
    function stepFull(name, args) {
      if (!isRecord(args)) return "";
      const keys = ["file_path", "path", "command", "pattern", "url", "query", "prompt", "subject", "description", "name", "uri", "target", "id"];
      let text = "";
      for (const key of keys) {
        const value = args[key];
        if (typeof value === "string" && value.trim() !== "") {
          text = value;
          break;
        }
      }
      if (text === "" && Array.isArray(args.queries) && typeof args.queries[0] === "string") text = args.queries[0];
      return text.length > 4000 ? text.slice(0, 4000) : text;
    }

    const ANCHOR_CAP = 8;
    function addStep(folder, bucket, step) {
      if (typeof step.teamKey === "string") {
        folder.anchors.push(step);
        if (folder.anchors.length > ANCHOR_CAP) folder.anchors.shift();
        if (isRecord(bucket) && Array.isArray(bucket.anchors)) {
          bucket.anchors.push(step);
          if (bucket.anchors.length > ANCHOR_CAP) bucket.anchors.shift();
        }
      }
      folder.steps.push(step);
      if (folder.steps.length > STEP_CAP) {
        const dropped = folder.steps.shift();
        if (dropped !== undefined && typeof dropped.callId === "string") folder.stepByCall.delete(dropped.callId);
      }
      if (typeof step.callId === "string") folder.stepByCall.set(step.callId, step);
      if (isRecord(bucket) && Array.isArray(bucket.steps)) {
        bucket.steps.push(step);
        if (bucket.steps.length > STEP_CAP) bucket.steps.shift();
      }
      touch(folder);
    }

    function markStepDone(folder, callId, time, failed) {
      const step = folder.stepByCall.get(callId);
      if (step === undefined) return;
      step.done = true;
      if (failed === true) step.error = true;
      if (typeof time === "number") step.endTime = time;
      touch(folder);
    }

    function foldEvent(folder, event, cwd) {
      if (!isRecord(event) || typeof event.type !== "string") return;
      const data = event.data;
      if (typeof event.time === "number" && Number.isFinite(event.time)) {
        bumpStatTime(folder.stats, event.time);
        const statsTurn =
          event.type === "turn/start" && isRecord(data) && typeof data.turn === "number" && Number.isSafeInteger(data.turn) && data.turn >= 1
            ? data.turn
            : folder.currentTurn;
        if (statsTurn >= 1) {
          const statsBucket = event.type === "turn/start" ? turnBucket(folder, statsTurn) : folder.byTurn.get(statsTurn);
          if (statsBucket !== undefined) bumpStatTime(statsBucket.stats, event.time);
        }
      }
      switch (event.type) {
        case "turn/start": {
          if (!isRecord(data) || typeof data.turn !== "number" || !Number.isSafeInteger(data.turn) || data.turn < 1) return;
          folder.currentTurn = data.turn;
          turnBucket(folder, data.turn);
          touch(folder);
          return;
        }
        case "todo/write": {
          if (!isRecord(data) || !Array.isArray(data.todos)) return;
          const todos = [];
          for (const item of data.todos) {
            if (isRecord(item) && typeof item.content === "string" && item.content.length > 0 && typeof item.status === "string") {
              todos.push({ content: item.content, status: item.status });
            }
          }
          folder.todos = todos;
          folder.todosTime = typeof event.time === "number" ? event.time : 0;
          folder.todosSeq = typeof event.seq === "number" ? event.seq : 0;
          folder.todoRecords.push({ turn: folder.currentTurn, todos, time: folder.todosTime, seq: folder.todosSeq });
          touch(folder);
          return;
        }
        case "team/member": {
          if (!isRecord(data) || !isRecord(data.member)) return;
          const member = data.member;
          if (typeof member.id !== "string" || member.id === "" || typeof member.name !== "string") return;
          const memberRecord = {
            id: member.id,
            name: member.name,
            description: typeof member.description === "string" ? member.description : "",
            phase: typeof member.phase === "string" ? member.phase : "",
            seq: event.seq,
            time: typeof event.time === "number" ? event.time : 0,
          };
          upsertTeamRecord(folder.members, member.id, memberRecord);
          upsertTeamRecord(turnBucket(folder, folder.currentTurn).members, member.id, memberRecord);
          touch(folder);
          return;
        }
        case "team/task": {
          if (!isRecord(data) || !isRecord(data.task)) return;
          const task = data.task;
          if (typeof task.id !== "string" || task.id === "" || typeof task.subject !== "string") return;
          const taskRecord = {
            id: task.id,
            subject: task.subject,
            description: typeof task.description === "string" ? task.description : "",
            status: typeof task.status === "string" ? task.status : "",
            ownerId: typeof task.ownerId === "string" ? task.ownerId : undefined,
            blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy.filter((item) => typeof item === "string") : [],
            revision: typeof task.revision === "number" ? task.revision : 0,
            seq: event.seq,
            time: typeof event.time === "number" ? event.time : 0,
          };
          upsertTeamRecord(folder.teamTasks, task.id, taskRecord);
          upsertTeamRecord(turnBucket(folder, folder.currentTurn).teamTasks, task.id, taskRecord);
          touch(folder);
          return;
        }
        case "subagent/catalog": {
          if (!isRecord(data) || typeof data.childId !== "string" || data.childId === "") return;
          const subRecord = {
            childId: data.childId,
            label: typeof data.label === "string" ? data.label : "",
            mode: typeof data.mode === "string" ? data.mode : "",
            seq: event.seq,
            time: typeof event.time === "number" ? event.time : 0,
          };
          upsertTeamRecord(folder.subagents, data.childId, subRecord);
          upsertTeamRecord(turnBucket(folder, folder.currentTurn).subagents, data.childId, subRecord);
          touch(folder);
          return;
        }
        case "approval/asked": {
          if (!isRecord(data) || typeof data.id !== "string" || data.id === "") return;
          const approvalBucket = turnBucket(folder, folder.currentTurn);
          const toolName = typeof data.toolName === "string" ? data.toolName : "";
          addStep(folder, approvalBucket, {
            callId: `approval-${data.id}`,
            name: "approval",
            detail: toolName,
            full: typeof data.reason === "string" && data.reason !== "" ? `${toolName} · ${data.reason}` : toolName,
            milestone: true,
            done: false,
            seq: event.seq,
            time: event.time,
          });
          return;
        }
        case "approval/decided": {
          if (!isRecord(data) || typeof data.id !== "string" || data.id === "") return;
          const outcome = typeof data.outcome === "string" ? data.outcome : "";
          const approvalStep = folder.stepByCall.get(`approval-${data.id}`);
          if (approvalStep !== undefined && outcome !== "" && typeof approvalStep.detail === "string" && !approvalStep.detail.includes(outcome)) {
            approvalStep.detail = approvalStep.detail === "" ? outcome : `${approvalStep.detail} · ${outcome}`;
          }
          markStepDone(folder, `approval-${data.id}`, event.time, /denied|reject/i.test(outcome));
          return;
        }
        case "workspace/changes": {
          if (!isRecord(data) || typeof data.turn !== "number" || !Number.isSafeInteger(data.turn) || data.turn < 1) return;
          if (typeof event.seq !== "number") return;
          const change = { seq: event.seq, turn: data.turn };
          folder.changes.push(change);
          const changesBucket = folder.byTurn.get(data.turn);
          if (changesBucket !== undefined) changesBucket.changes.push(change);
          touch(folder);
          return;
        }
        case "deliverables/presented": {
          if (!isRecord(data) || !Array.isArray(data.files)) return;
          const bucket = turnBucket(folder, folder.currentTurn);
          for (const file of data.files) {
            if (!isRecord(file) || pathValue(file.path) === null) continue;
            upsertArtifact(folder, bucket, absPath(cwd, file.path), {
              description: typeof file.description === "string" ? file.description : undefined,
              presented: true,
              seq: event.seq,
              time: event.time,
            });
          }
          return;
        }
        case "tool/call": {
          if (!isRecord(data) || typeof data.callId !== "string" || typeof data.name !== "string") return;
          const callId = data.callId;
          const name = data.name;
          const args = parseArgs(data.arguments);
          const callBucket = turnBucket(folder, folder.currentTurn);
          addStep(folder, callBucket, { callId, name, detail: stepDetail(name, args), full: stepFull(name, args), teamKey: teamStepKey(name, args), done: false, seq: event.seq, time: event.time });
          folder.stats.toolCalls += 1;
          callBucket.stats.toolCalls += 1;
          if (name === "bash") {
            folder.stats.commands += 1;
            callBucket.stats.commands += 1;
          }
          const produced = mutationPath(name, data.arguments);
          if (produced !== null) {
            const producedPath = absPath(cwd, produced);
            folder.stats.files.add(producedPath);
            callBucket.stats.files.add(producedPath);
            folder.pending.set(callId, { type: "artifact", path: producedPath });
            return;
          }
          if (name === "skill" && args && typeof args.name === "string" && args.name.length > 0) {
            folder.pending.set(callId, {
              type: "reference",
              refs: [{ kind: "skill", label: args.name, detail: [], key: `skill|${args.name}`, seq: event.seq, time: event.time }],
            });
            return;
          }
          const memoryTool = memoryToolsOf(name);
          if (memoryTool !== null && MEMORY_MUTATION_TOOLS.has(memoryTool)) {
            const uri =
              args !== null && isRecord(args)
                ? isVikingUri(args.uri)
                  ? args.uri
                  : isVikingUri(args.to)
                    ? args.to
                    : isVikingUri(args.parent)
                      ? args.parent
                      : null
                : null;
            if (uri !== null) {
              const description = typeof args.description === "string" ? args.description : "";
              folder.pending.set(callId, { type: "artifact", path: uri, description });
            }
            return;
          }
          if (memoryTool !== null && MEMORY_REFERENCE_TOOLS.has(memoryTool)) {
            const detail = [];
            const uris = [];
            if (args) {
              if (typeof args.query === "string") detail.push(args.query);
              if (isVikingUri(args.uri)) uris.push(args.uri);
              else if (typeof args.uri === "string") detail.push(args.uri);
              if (Array.isArray(args.uris)) {
                for (const uri of args.uris) {
                  if (!isVikingUri(uri)) continue;
                  if (!uris.includes(uri)) uris.push(uri);
                }
              }
              if (typeof args.pattern === "string") detail.push(args.pattern);
              if (Array.isArray(args.pattern)) for (const pattern of args.pattern) if (typeof pattern === "string") detail.push(pattern);
            }
            const refs = [];
            for (const uri of uris.slice(0, 8)) {
              refs.push({
                kind: vikingRefKind(uri),
                uri,
                producer: `openviking · ${memoryTool}`,
                label: vikingLabel(uri),
                detail: [],
                key: `memory-file|${uri}`,
                seq: event.seq,
                time: event.time,
              });
            }
            if (detail.length > 0 || refs.length === 0) {
              refs.push({
                kind: "memory",
                label: `openviking · ${memoryTool}`,
                detail: detail.slice(0, 6),
                key: `memory-tool|${memoryTool}|${detail[0] ?? ""}`,
                seq: event.seq,
                time: event.time,
              });
            }
            folder.pending.set(callId, { type: "reference", refs });
          }
          return;
        }
        case "tool/result": {
          if (!isAppendSurfaceEvent(event) || !isRecord(data)) return;
          const message = data.message;
          if (!isRecord(message)) return;
          const source = message.source;
          const callId = isRecord(source) && typeof source.callId === "string" ? source.callId : undefined;
          if (callId === undefined) return;
          markStepDone(folder, callId, event.time, message.isError === true);
          if (message.isError === true) {
            folder.stats.errors += 1;
            const errorBucket = folder.byTurn.get(folder.currentTurn);
            if (errorBucket !== undefined) errorBucket.stats.errors += 1;
          }
          const pending = folder.pending.get(callId);
          if (pending === undefined) return;
          folder.pending.delete(callId);
          if (message.isError === true) return;
          const bucket = turnBucket(folder, folder.currentTurn);
          if (pending.type === "artifact") {
            upsertArtifact(folder, bucket, pending.path, {
              produced: true,
              ...(typeof pending.description === "string" && pending.description !== "" ? { description: pending.description } : {}),
              seq: event.seq,
              time: event.time,
            });
          } else {
            const resultText = textOf(message.content);
            for (const ref of pending.refs) {
              const committed = { ...ref, seq: typeof event.seq === "number" ? event.seq : ref.seq, time: typeof event.time === "number" ? event.time : ref.time };
              if (committed.kind !== "memory-file" && resultText !== "") {
                const previewKey = rememberContextPreview(folder.sessionId, committed.key, committed.label, resultText);
                if (previewKey !== undefined) committed.previewKey = previewKey;
              }
              addReference(folder, bucket, committed);
            }
          }
          return;
        }
        case "user/message": {
          if (!isRecord(data)) return;
          const source = isRecord(data.source) ? data.source : null;
          const kind = source !== null && typeof source.kind === "string" ? source.kind : "user";
          /* a compact checkpoint replaces the event span it summarizes; every other message must append */
          if (kind !== "compact-checkpoint" && !isAppendSurfaceEvent(event)) return;
          const bucket = turnBucket(folder, folder.currentTurn);
          if (kind === "user") {
            const mentions = mentionsOfUserText(textOf(data.content));
            for (const label of mentions.sessions) {
              addReference(folder, bucket, { kind: "session", label, detail: [], key: `session|${label}`, seq: event.seq, time: event.time });
            }
            for (const file of mentions.files) {
              addReference(folder, bucket, { kind: "file", label: file, detail: [], key: `file|${file}`, seq: event.seq, time: event.time });
            }
            return;
          }
          if (kind === "compact-checkpoint") {
            /* context compaction is a milestone: anchor it as a durable key step */
            const compactionId = source !== null && typeof source.compactionId === "string" ? source.compactionId : `seq-${event.seq}`;
            const summaryText = textOf(data.content);
            addStep(folder, bucket, {
              name: "compact-checkpoint",
              detail: summaryText.length > 1024 ? `≈${Math.round(summaryText.length / 1024)} KB` : "",
              full: compactionId,
              teamKey: `compact:${compactionId}`,
              milestone: true,
              done: true,
              seq: event.seq,
              time: event.time,
            });
            return;
          }
          const label = contextLabel(source, kind);
          const detail = contextDetail(source, data.content);
          const refKind = refKindForSource(source, kind);
          const producer = kind;
          const form = source !== null && typeof source.form === "string" ? source.form : undefined;
          if (refKind === "memory" && detail.length > 0 && detail.every(isVikingUri)) {
            for (const uri of detail) {
              addReference(folder, bucket, {
                kind: vikingRefKind(uri),
                uri,
                producer,
                form,
                label: vikingLabel(uri),
                detail: [],
                key: `memory-file|${uri}`,
                seq: event.seq,
                time: event.time,
              });
            }
            return;
          }
          const key = `context|${kind}|${label}|${detail.join(",")}`;
          const previewKey = rememberContextPreview(folder.sessionId, key, label, textOf(data.content));
          addReference(folder, bucket, {
            kind: refKind,
            producer,
            form,
            label,
            detail,
            key,
            ...(previewKey === undefined ? {} : { previewKey }),
            seq: event.seq,
            time: event.time,
          });
          return;
        }
        default:
          return;
      }
    }

    function foldEntry(folder, entry, cwd) {
      if (!isRecord(entry) || entry.type === "transient") return;
      foldEvent(folder, entry.event, cwd);
    }

    function normalizeSelection(selection) {
      if (selection === "all") return "all";
      if (typeof selection === "string" && selection.startsWith("turn:")) {
        const turn = Number.parseInt(selection.slice(5), 10);
        if (Number.isSafeInteger(turn) && turn >= 0) return `turn:${turn}`;
      }
      return "latest";
    }

    /** Last todo/write record produced inside one exact turn, or null when that turn planned nothing. */
    function todosOfTurn(folder, turn) {
      let found = null;
      for (const record of folder.todoRecords) {
        if (record.turn === turn) found = record;
      }
      return found;
    }

    function buildState(folder, windowSnapshot, localeRev, selection) {
      const scope = normalizeSelection(selection);
      const turns = [...folder.byTurn.keys()].filter((turn) => turn >= 1).sort((left, right) => left - right);
      const latestTurn = turns.length > 0 ? turns[turns.length - 1] : null;
      let source = folder;
      let todos = folder.todos;
      let todosTime = folder.todosTime;
      let changeTurns = folder.changes;
      if (scope.startsWith("turn:")) {
        const requested = Number.parseInt(scope.slice(5), 10);
        source = folder.byTurn.get(requested) ?? EMPTY_BUCKET;
        const own = todosOfTurn(folder, requested);
        todos = own !== null ? own.todos : null;
        todosTime = own !== null ? own.time : 0;
        changeTurns = source.changes;
      } else if (scope === "latest" && latestTurn !== null) {
        source = folder.byTurn.get(latestTurn) ?? EMPTY_BUCKET;
        changeTurns = source.changes;
        const own = todosOfTurn(folder, latestTurn);
        todos = own !== null ? own.todos : null;
        todosTime = own !== null ? own.time : 0;
      }
      const artifacts = [...source.artifacts.values()].sort((left, right) => (right.time || right.seq) - (left.time || left.seq) || right.seq - left.seq);
      /* A ref is ubiquitous when it shows up in at least two turns covering >= 60% of
         all observed turns — the per-turn OpenViking/runtime injections match this. */
      const turnCount = turns.length;
      const ubiquitousFrom = turnCount >= 2 ? Math.max(2, Math.ceil(turnCount * 0.6)) : Infinity;
      const references = [];
      for (let index = source.refOrder.length - 1; index >= 0; index -= 1) {
        const ref = source.refs.get(source.refOrder[index]);
        if (ref === undefined) continue;
        const refTurns = Array.isArray(ref.turns) ? ref.turns.length : 0;
        references.push(refTurns > 0 ? { ...ref, refTurns, ubiquitous: refTurns >= ubiquitousFrom } : { ...ref, refTurns: 0, ubiquitous: false });
      }
      const st = isRecord(source.stats) ? source.stats : EMPTY_BUCKET.stats;
      const stats = {
        durationMs: st.end > st.start ? st.end - st.start : 0,
        toolCalls: st.toolCalls,
        commands: st.commands,
        errors: st.errors,
        files: st.files.size,
      };
      /* Agent-team projections: members, shared board tasks, and non-team subagents. */
      const byFirstTime = (left, right) => (left.firstTime || left.time || 0) - (right.firstTime || right.time || 0) || (left.seq || 0) - (right.seq || 0);
      const mapValues = (map) => (map instanceof Map ? [...map.values()] : []);
      const members = mapValues(source.members).sort(byFirstTime);
      const subagents = mapValues(source.subagents)
        .filter((sub) => !(source.members instanceof Map && source.members.has(sub.childId)))
        .sort(byFirstTime);
      const team = { members, tasks: mapValues(source.teamTasks).sort(byFirstTime), subagents };
      /* team anchor steps (spawn/task-create/subagent) stay pinned above the recent window
         so member/task rows can nest under their creating step */
      const allSteps = Array.isArray(source.steps) ? source.steps : [];
      const recentSteps = allSteps.slice(-6);
      const anchorCandidates = [...(Array.isArray(source.anchors) ? source.anchors : []), ...allSteps].filter(
        (step, index, list) =>
          isRecord(step) && typeof step.teamKey === "string" && step.milestone !== true && list.indexOf(step) === index && recentSteps.indexOf(step) === -1
      );
      const anchorSteps = anchorCandidates.slice(-6);
      /* milestone steps (compaction, approvals) ride the anchor lane for retention only;
         whether they pin above the window is a display choice (cfg.stepAnchors) */
      const milestoneSteps = (Array.isArray(source.anchors) ? source.anchors : []).filter((step) => isRecord(step) && step.milestone === true);
      return {
        todos,
        todosTime,
        artifacts,
        references,
        steps: [...anchorSteps, ...recentSteps],
        stepsAll: allSteps.slice(),
        team,
        stats,
        turnStart: st.start > 0 ? st.start : null,
        turnEnd: st.end > 0 ? st.end : null,
        milestones: milestoneSteps,
        todoHistory: folder.todoRecords.slice(-300),
        changeTurns: changeTurns.slice(),
        hasMore: windowSnapshot.hasMore === true,
        localeRev,
        turns,
        latestTurn,
        scope,
      };
    }

    const EMPTY_STATE = { todos: null, todosTime: 0, artifacts: [], references: [], steps: [], stepsAll: [], team: { members: [], tasks: [], subagents: [] }, stats: { durationMs: 0, toolCalls: 0, commands: 0, errors: 0, files: 0 }, turnStart: null, turnEnd: null, milestones: [], todoHistory: [], changeTurns: [], hasMore: false, localeRev: 0, turns: [], latestTurn: null, scope: "latest" };

    function createSummaryStore(binding) {
      const source = binding.eventSource;
      const listeners = new Set();
      const views = new Map();
      let folder = createFolder();
      folder.sessionId = typeof binding.sessionId === "string" ? binding.sessionId : null;
      let lastWindow = { hasMore: false };
      let localeRev = 0;

      const store = {
        subscribe(listener) {
          listeners.add(listener);
          attachLocale();
          return () => {
            listeners.delete(listener);
            if (listeners.size === 0) detachLocale();
          };
        },
        getView(selection) {
          const key = normalizeSelection(selection);
          let view = views.get(key);
          if (view === undefined) {
            view = buildState(folder, lastWindow, localeRev, key);
            views.set(key, view);
          }
          return view;
        },
        getSnapshot() {
          return store.getView("latest");
        },
      };

      const notify = () => {
        for (const listener of [...listeners]) listener();
      };

      const fullRebuild = (windowSnapshot) => {
        folder = createFolder();
        folder.sessionId = typeof binding.sessionId === "string" ? binding.sessionId : null;
        const cwd = sessionCwd(binding.sessionId);
        for (const entry of windowSnapshot.entries) foldEntry(folder, entry, cwd);
        folder.changed = false;
        lastWindow = windowSnapshot;
        views.clear();
        notify();
      };

      const recompute = () => {
        const windowSnapshot = source.getSnapshot();
        if (windowSnapshot === lastWindow) return;
        const previous = lastWindow;
        const change = windowSnapshot.change;
        const appended = previous !== null && isRecord(change) && change.kind === "append" && Array.isArray(change.entries) ? change.entries : null;
        if (appended !== null) {
          // Live streaming rows carry nothing durable; skip them without a rebuild.
          if (appended.every((entry) => isRecord(entry) && entry.type === "transient")) return;
          if (appended.every((entry) => isRecord(entry) && entry.type !== "transient" && isRecord(entry.event))) {
            lastWindow = windowSnapshot;
            const cwd = sessionCwd(binding.sessionId);
            for (const entry of appended) foldEntry(folder, entry, cwd);
            if (folder.changed || windowSnapshot.hasMore !== (previous.hasMore === true)) {
              folder.changed = false;
              views.clear();
              notify();
            }
            return;
          }
        }
        if (windowSnapshot.entries.length === 0 && previous !== null && previous.entries !== undefined && previous.entries.length === 0) {
          lastWindow = windowSnapshot;
          return;
        }
        fullRebuild(windowSnapshot);
      };

      const unsubscribeEvents = source.subscribe(recompute);
      let unsubscribeLocale = null;
      const attachLocale = () => {
        if (unsubscribeLocale !== null) return;
        const locale = runtime && runtime.ctx ? runtime.ctx.locale : undefined;
        if (!locale || typeof locale.subscribe !== "function") {
          unsubscribeLocale = () => {};
          return;
        }
        unsubscribeLocale = locale.subscribe(() => {
          localeRev += 1;
          views.clear();
          notify();
        });
      };
      const detachLocale = () => {
        if (unsubscribeLocale === null) return;
        unsubscribeLocale();
        unsubscribeLocale = null;
      };
      recompute();
      store.dispose = () => {
        unsubscribeEvents();
        detachLocale();
        listeners.clear();
        views.clear();
      };
      return store;
    }

    const summaryCache = new WeakMap();

    function summaryFor(binding) {
      if (!binding) return null;
      const cached = summaryCache.get(binding);
      if (cached !== undefined) return cached;
      const store = createSummaryStore(binding);
      summaryCache.set(binding, store);
      return store;
    }

    function resolveBinding(sessionId) {
      const ctx = runtime && runtime.ctx;
      if (!ctx || typeof sessionId !== "string") return null;
      try {
        return ctx.sessions.binding(sessionId) || null;
      } catch {
        return null;
      }
    }

    /* ------------------------------------------------------------------ */
    /* Hooks                                                               */
    /* ------------------------------------------------------------------ */

    const noopSubscribe = () => () => {};
    const undefinedSnapshot = () => undefined;

    function useSummary(binding, selection) {
      const store = React.useMemo(() => summaryFor(binding), [binding]);
      const getSnapshot = React.useCallback(
        store ? () => store.getView(selection) : () => EMPTY_STATE,
        [store, selection]
      );
      return React.useSyncExternalStore(store ? store.subscribe : noopSubscribe, getSnapshot, getSnapshot);
    }

    function useGoal(binding) {
      const face = React.useMemo(() => {
        try {
          const projections = binding && binding.session ? binding.session.projections : undefined;
          return projections && typeof projections.faceOf === "function" ? projections.faceOf("goal") : null;
        } catch {
          return null;
        }
      }, [binding]);
      const value = React.useSyncExternalStore(
        face ? face.subscribe : noopSubscribe,
        face ? face.getSnapshot : undefinedSnapshot,
        face ? face.getSnapshot : undefinedSnapshot
      );
      if (!isRecord(value)) return null;
      const goal = value.goal;
      return isRecord(goal) && typeof goal.objective === "string" ? goal : null;
    }

    function useBackfill(binding, hasMore) {
      React.useEffect(() => {
        if (!binding || !hasMore) return undefined;
        let cancelled = false;
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const run = async () => {
          /* Prefer the jump loader: it pages back until the window covers seq and
             survives concurrent loaders. loadOlder() is a no-op while another load
             is in flight, so retry until the window actually stops reporting more. */
          for (let attempt = 0; attempt < 200 && !cancelled; attempt += 1) {
            const snapshot = binding.eventSource.getSnapshot();
            if (!isRecord(snapshot) || snapshot.hasMore !== true) return;
            const session = binding.session;
            if (isRecord(session) && typeof session.loadThrough === "function") await session.loadThrough(1);
            else if (isRecord(session) && typeof session.loadOlder === "function") await session.loadOlder();
            else return;
            if (cancelled) return;
            const after = binding.eventSource.getSnapshot();
            if (isRecord(after) && after.hasMore !== true) return;
            await sleep(200);
          }
        };
        run().catch(() => {});
        return () => {
          cancelled = true;
        };
      }, [binding, hasMore]);
    }

    /** Class map mirroring the copied FileTypeIcon.module.css, renamed under dsov-ft-*. */
    const FT_CSS = {
      icon: "dsov-ft-icon",
      code: "dsov-ft-code",
      excel: "dsov-ft-excel",
      folder: "dsov-ft-folder",
      html: "dsov-ft-html",
      image: "dsov-ft-image",
      markdown: "dsov-ft-markdown",
      other: "dsov-ft-other",
      pdf: "dsov-ft-pdf",
      ppt: "dsov-ft-ppt",
      video: "dsov-ft-video",
      word: "dsov-ft-word",
    };

	/* ------------------------------------------------------------------ */
	/* FileTypeIcon system — copied from @deepseek-ai/dsh-client-ui-primitives */
	/* (practices: copy the primitive into the plugin; classes renamed dsov-ft-*) */
	/* ------------------------------------------------------------------ */
/** Placeholder replaced with one React-instance id before SVG insertion. */
const CODE_FILE_ICON_ID_TOKEN = "__DSH_CODE_ICON_INSTANCE__";
/** Validated inner SVG markup for the established detailed code categories. */
const CODE_FILE_ARTWORK = Object.freeze({
	"angular": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F8ECEF\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#DD0031\" d=\"M16.712 17.711H7.288l-1.204 2.916L12 24l5.916-3.373-1.204-2.916ZM14.692 0l7.832 16.855.814-12.856L14.692 0ZM9.308 0 .662 3.999l.814 12.856L9.308 0Zm-.405 13.93h6.198L12 6.396 8.903 13.93Z\"/></g>",
	"c": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#EEF4F8\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#659AD2\" d=\"M16.5921 9.1962s-.354-3.298-3.627-3.39c-3.2741-.09-4.9552 2.474-4.9552 6.14 0 3.6651 1.858 6.5972 5.0451 6.5972 3.184 0 3.5381-3.665 3.5381-3.665l6.1041.365s.36 3.31-2.196 5.836c-2.552 2.5241-5.6901 2.9371-7.8762 2.9201-2.19-.017-5.2261.034-8.1602-2.97-2.938-3.0101-3.436-5.9302-3.436-8.8002 0-2.8701.556-6.6702 4.047-9.5502C7.444.72 9.849 0 12.254 0c10.0422 0 10.7172 9.2602 10.7172 9.2602z\"/></g>",
	"clojure": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F1F7EC\" stroke=\"#DCEAD2\" stroke-width=\".5\"/><svg x=\"2.75\" y=\"2.75\" width=\"14.5\" height=\"14.5\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><g fill=\"none\"><path d=\"M64 0C28.712 0 0 28.6 0 63.751c0 35.155 28.712 63.753 64 63.753s64-28.598 64-63.753C128 28.6 99.288 0 64 0\" fill=\"#FFF\"/><path d=\"M61.659 64.898a265.825 265.825 0 00-1.867 4.12c-2.322 5.241-4.894 11.62-5.834 15.706-.337 1.455-.546 3.258-.542 5.258 0 .79.043 1.622.11 2.469a30.74 30.74 0 0010.533 1.87 30.796 30.796 0 009.642-1.566 18.09 18.09 0 01-2.011-2.12c-4.11-5.221-6.403-12.872-10.031-25.737M46.485 38.96c-7.85 5.51-12.986 14.6-13.005 24.9.019 10.145 5.001 19.116 12.653 24.65 1.877-7.789 6.582-14.92 13.637-29.214a114.691 114.691 0 00-1.43-3.72c-1.955-4.884-4.776-10.556-7.294-13.124-1.283-1.342-2.84-2.502-4.561-3.492\" fill=\"#91DC47\"/><path d=\"M90.697 98.798c-4.05-.506-7.392-1.116-10.317-2.144a36.708 36.708 0 01-16.32 3.807c-20.293 0-36.742-16.383-36.745-36.602 0-10.97 4.852-20.805 12.528-27.512-2.053-.495-4.194-.783-6.38-.779-10.782.101-22.162 6.044-26.9 22.095-.443 2.337-.337 4.103-.337 6.197 0 31.818 25.895 57.613 57.835 57.613 19.561 0 36.841-9.682 47.305-24.489-5.66 1.405-11.103 2.077-15.763 2.091-1.747 0-3.387-.093-4.906-.277\" fill=\"#63B132\"/><path d=\"M79.829 87.634c.357.176 1.167.464 2.293.783 7.579-5.542 12.504-14.469 12.523-24.558h-.003c-.028-16.82-13.693-30.43-30.582-30.462a30.765 30.765 0 00-9.602 1.554c6.21 7.05 9.196 17.127 12.084 28.148l.005.013c.005.009.924 3.06 2.501 7.11 1.566 4.042 3.797 9.048 6.23 12.696 1.597 2.444 3.354 4.2 4.551 4.716\" fill=\"#90B4FE\"/><path d=\"M17.057 30.311c5.463-3.408 11.04-4.637 15.908-4.593 6.722.02 12.008 2.096 14.544 3.516.612.352 1.194.73 1.764 1.12a36.714 36.714 0 0114.786-3.096c20.295.003 36.747 16.386 36.75 36.601-.003 10.192-4.188 19.408-10.934 26.044a45.3 45.3 0 005.225.29c6.406.004 13.329-1.404 18.52-5.753 3.384-2.84 6.22-6.998 7.792-13.233.307-2.408.484-4.856.484-7.347 0-31.817-25.892-57.614-57.835-57.614-19.372 0-36.508 9.5-47.004 24.065z\" fill=\"#5881D8\"/></g></svg>",
	"cmake": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F2F5F7\" stroke=\"#D9E1E7\" stroke-width=\".5\"/><svg x=\"2.75\" y=\"2.75\" width=\"14.5\" height=\"14.5\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#064F8C\" d=\"M62.8.4L.3 123.8l68.1-57.9z\"/><path fill=\"#249847\" d=\"M123.8 127.7l-84-33.9L0 127.7z\"/><path fill=\"#BE2128\" d=\"M128 126.6L65.6 2.5l9.2 102.6z\"/><path fill=\"#CDCDCE\" d=\"M71.9 104l-3.1-34.9L42 92z\"/></svg>",
	"cpp": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#E8F2F8\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#00599C\" d=\"M22.394 6c-.167-.29-.398-.543-.652-.69L12.926.22c-.509-.294-1.34-.294-1.848 0L2.26 5.31c-.508.293-.923 1.013-.923 1.6v10.18c0 .294.104.62.271.91.167.29.398.543.652.69l8.816 5.09c.508.293 1.34.293 1.848 0l8.816-5.09c.254-.147.485-.4.652-.69.167-.29.27-.616.27-.91V6.91c.003-.294-.1-.62-.268-.91zM12 19.11c-3.92 0-7.109-3.19-7.109-7.11 0-3.92 3.19-7.11 7.11-7.11a7.133 7.133 0 016.156 3.553l-3.076 1.78a3.567 3.567 0 00-3.08-1.78A3.56 3.56 0 008.444 12 3.56 3.56 0 0012 15.555a3.57 3.57 0 003.08-1.778l3.078 1.78A7.135 7.135 0 0112 19.11zm7.11-6.715h-.79v.79h-.79v-.79h-.79v-.79h.79v-.79h.79v.79h.79zm2.962 0h-.79v.79h-.79v-.79h-.79v-.79h.79v-.79h.79v.79h.79z\"/></g>",
	"csharp": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F3EEF7\" stroke=\"#E2D7EA\" stroke-width=\".5\"/><svg x=\"2.75\" y=\"2.75\" width=\"14.5\" height=\"14.5\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#9B4F96\" d=\"M115.4 30.7L67.1 2.9c-.8-.5-1.9-.7-3.1-.7-1.2 0-2.3.3-3.1.7l-48 27.9c-1.7 1-2.9 3.5-2.9 5.4v55.7c0 1.1.2 2.4 1 3.5l106.8-62c-.6-1.2-1.5-2.1-2.4-2.7z\"/><path fill=\"#68217A\" d=\"M10.7 95.3c.5.8 1.2 1.5 1.9 1.9l48.2 27.9c.8.5 1.9.7 3.1.7 1.2 0 2.3-.3 3.1-.7l48-27.9c1.7-1 2.9-3.5 2.9-5.4V36.1c0-.9-.1-1.9-.6-2.8l-106.6 62z\"/><path fill=\"#fff\" d=\"M85.3 76.1C81.1 83.5 73.1 88.5 64 88.5c-13.5 0-24.5-11-24.5-24.5s11-24.5 24.5-24.5c9.1 0 17.1 5 21.3 12.5l13-7.5c-6.8-11.9-19.6-20-34.3-20-21.8 0-39.5 17.7-39.5 39.5s17.7 39.5 39.5 39.5c14.6 0 27.4-8 34.2-19.8l-12.9-7.6zM97 66.2l.9-4.3h-4.2v-4.7h5.1L100 51h4.9l-1.2 6.1h3.8l1.2-6.1h4.8l-1.2 6.1h2.4v4.7h-3.3l-.9 4.3h4.2v4.7h-5.1l-1.2 6h-4.9l1.2-6h-3.8l-1.2 6h-4.8l1.2-6h-2.4v-4.7H97zm4.8 0h3.8l.9-4.3h-3.8l-.9 4.3z\"/></svg>",
	"css": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#1572B6\"/><text x=\"10\" y=\"12.8\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"6.2\" font-weight=\"900\" fill=\"#fff\">CSS</text>",
	"dart": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#ECF7FA\" stroke=\"#D5EAF0\" stroke-width=\".5\"/><svg x=\"2.75\" y=\"2.75\" width=\"14.5\" height=\"14.5\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#00c4b3\" d=\"M35.2 34.9l-8.3-8.3v59.7l.1 2.8c0 1.3.2 2.8.7 4.3l65.6 23.1 16.3-7.2-74.4-74.4z\"/><path d=\"M27.7 93.4zm81.9 15.9l-16.3 7.2-65.4-23.1c1.3 4.8 4 10.1 7 13.2l21.3 21.2 47.6.1 5.8-18.6z\" fill=\"#22d3c5\"/><path fill=\"#0075c9\" d=\"M1.7 65.1C-.4 67.3.7 72 4 75.5l14.7 14.8 9.2 3.3c-.3-1.5-.7-3-.7-4.3l-.1-2.8-.2-59.8m82.7 82.6l7.2-16.4-23-65.6c-1.5-.3-3-.6-4.3-.7l-2.9-.1-59.6.1\"/><path d=\"M93.6 27.3c.2 0 .2 0 0 0 .2 0 .2 0 0 0zm16 82l17.7-5.8V54.8l-20.4-20.5c-3-3-8.3-5.8-13.2-7l23.1 65.6\" fill=\"#00a8e1\"/><path fill=\"#00c4b3\" d=\"M90.5 18.2L75.7 3.5c-3.4-3.4-8-4.4-10.4-2.3L26.9 26.6h59.5l2.9.1c1.3 0 2.8.2 4.3.7l-3.1-9.2z\"/></svg>",
	"docker": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#E8F4FC\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#2496ED\" d=\"M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z\"/></g>",
	"elixir": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F3EEF6\" stroke=\"#E3D9E8\" stroke-width=\".5\"/><svg x=\"2.75\" y=\"2.75\" width=\"14.5\" height=\"14.5\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__elixir-original-a\" gradientUnits=\"userSpaceOnUse\" x1=\"835.592\" y1=\"-36.546\" x2=\"821.211\" y2=\"553.414\" gradientTransform=\"matrix(.1297 0 0 .2 -46.03 17.198)\"><stop offset=\"0\" stop-color=\"#d9d8dc\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\".385\"/></linearGradient><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"url(#__DSH_CODE_ICON_INSTANCE__elixir-original-a)\" d=\"M64.4.5C36.7 13.9 1.9 83.4 30.9 113.9c26.8 33.5 85.4 1.3 68.4-40.5-21.5-36-35-37.9-34.9-72.9z\"/><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__elixir-original-b\" gradientUnits=\"userSpaceOnUse\" x1=\"942.357\" y1=\"-40.593\" x2=\"824.692\" y2=\"472.243\" gradientTransform=\"matrix(.1142 0 0 .2271 -47.053 17.229)\"><stop offset=\"0\" stop-color=\"#8d67af\" stop-opacity=\".672\"/><stop offset=\"1\" stop-color=\"#9f8daf\"/></linearGradient><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"url(#__DSH_CODE_ICON_INSTANCE__elixir-original-b)\" d=\"M64.4.2C36.8 13.6 1.9 82.9 31 113.5c10.7 12.4 28 16.5 37.7 9.1 26.4-18.8 7.4-53.1 10.4-78.5C68.1 33.9 64.2 11.3 64.4.2z\"/><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__elixir-original-c\" gradientUnits=\"userSpaceOnUse\" x1=\"924.646\" y1=\"120.513\" x2=\"924.646\" y2=\"505.851\" gradientTransform=\"matrix(.1227 0 0 .2115 -46.493 17.206)\"><stop offset=\"0\" stop-color=\"#26053d\" stop-opacity=\".762\"/><stop offset=\"1\" stop-color=\"#b7b4b4\" stop-opacity=\".278\"/></linearGradient><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"url(#__DSH_CODE_ICON_INSTANCE__elixir-original-c)\" d=\"M56.7 4.3c-22.3 15.9-28.2 75-24.1 94.2 8.2 48.1 75.2 28.3 69.6-16.5-6-29.2-48.8-39.2-45.5-77.7z\"/><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__elixir-original-d\" gradientUnits=\"userSpaceOnUse\" x1=\"428.034\" y1=\"198.448\" x2=\"607.325\" y2=\"559.255\" gradientTransform=\"matrix(.1848 0 0 .1404 -42.394 17.138)\"><stop offset=\"0\" stop-color=\"#91739f\" stop-opacity=\".46\"/><stop offset=\"1\" stop-color=\"#32054f\" stop-opacity=\".54\"/></linearGradient><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"url(#__DSH_CODE_ICON_INSTANCE__elixir-original-d)\" d=\"M78.8 49.8c10.4 13.4 12.7 22.6 6.8 27.9-27.7 19.4-61.3 7.4-54-37.3C22.1 63 4.5 96.8 43.3 101.6c20.8 3.6 54 2 58.9-16.1-.2-15.9-10.8-22.9-23.4-35.7z\"/><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__elixir-original-e\" gradientUnits=\"userSpaceOnUse\" x1=\"907.895\" y1=\"540.636\" x2=\"590.242\" y2=\"201.281\" gradientTransform=\"matrix(.1418 0 0 .1829 -45.23 17.18)\"><stop offset=\"0\" stop-color=\"#463d49\" stop-opacity=\".331\"/><stop offset=\"1\" stop-color=\"#340a50\" stop-opacity=\".821\"/></linearGradient><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"url(#__DSH_CODE_ICON_INSTANCE__elixir-original-e)\" d=\"M38.1 36.4c-2.9 21.2 35.1 77.9 58.3 71-17.7 35.6-56.9-21.2-64-41.7 1.5-11 2.2-16.4 5.7-29.3z\"/><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__elixir-original-f\" gradientUnits=\"userSpaceOnUse\" x1=\"1102.297\" y1=\"100.542\" x2=\"1008.071\" y2=\"431.648\" gradientTransform=\"matrix(.106 0 0 .2448 -47.595 17.242)\"><stop offset=\"0\" stop-color=\"#715383\" stop-opacity=\".145\"/><stop offset=\"1\" stop-color=\"#f4f4f4\" stop-opacity=\".234\"/></linearGradient><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"url(#__DSH_CODE_ICON_INSTANCE__elixir-original-f)\" d=\"M60.4 49.7c.8 7.9 3.9 20.5 0 28.8S38.7 102 43.6 115.3c11.4 24.8 37.1-4.4 36.9-19 1.1-11.8-6.6-38.7-1.8-52.5L76.5 41l-13.6-4c-2.2 3.2-3 7.5-2.5 12.7z\"/><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__elixir-original-g\" gradientUnits=\"userSpaceOnUse\" x1=\"1354.664\" y1=\"140.06\" x2=\"1059.233\" y2=\"84.466\" gradientTransform=\"matrix(.09173 0 0 .2828 -48.536 17.28)\"><stop offset=\"0\" stop-color=\"#a5a1a8\" stop-opacity=\".356\"/><stop offset=\"1\" stop-color=\"#370c50\" stop-opacity=\".582\"/></linearGradient><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"url(#__DSH_CODE_ICON_INSTANCE__elixir-original-g)\" d=\"M65.3 10.8C36 27.4 48 53.4 49.3 81.6l19.1-55.4c-1.4-5.7-2.3-9.5-3.1-15.4z\"/><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"#330A4C\" fill-opacity=\".316\" d=\"M68.3 26.1c-14.8 11.7-14.1 31.3-18.6 54 8.1-21.3 4.1-38.2 18.6-54z\"/><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"#FFF\" d=\"M45.8 119.7c8 1.1 12.1 2.2 12.5 3 .3 4.2-11.1 1.2-12.5-3z\"/><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"#EDEDED\" fill-opacity=\".603\" d=\"M49.8 10.8c-6.9 7.7-14.4 21.8-18.2 29.7-1 6.5-.5 15.7.6 23.5.9-18.2 7.5-39.2 17.6-53.2z\"/></svg>",
	"env": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#ECD53F\"/><text x=\"10\" y=\"12.9\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"5.7\" font-weight=\"900\" fill=\"#24292F\">.ENV</text>",
	"erlang": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#FAEDF1\" stroke=\"#EED6DE\" stroke-width=\".5\"/><svg x=\"2.75\" y=\"2.75\" width=\"14.5\" height=\"14.5\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><path d=\"M20.7 103.9C11 93.5 5.2 79.2 5.3 62.1 5.2 47 10 34 18.2 24.1H1v79.7l19.7.1zm90.4 0c4.2-4.5 8-9.8 11.4-15.9l-19-9.5c-6.7 10.8-16.4 20.8-29.9 20.9-19.6-.1-27.3-16.9-27.3-38.5h73.3c.1-2.4.1-3.6 0-4.7.5-12.9-2.9-23.7-9.1-32.1H127v79.7l-15.9.1zM47.5 42.4c.8-9.8 8.5-16.3 17.6-16.4 9.1 0 15.7 6.6 15.9 16.4H47.5z\" fill=\"#A90533\"/></svg>",
	"flutter": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#EEF7FD\" stroke=\"#D7EAF6\" stroke-width=\".5\"/><svg x=\"2.75\" y=\"2.75\" width=\"14.5\" height=\"14.5\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><g fill=\"#3FB6D3\"><path d=\"M12.3 64.2L76.3 0h39.4L32.1 83.6zM76.3 128h39.4L81.6 93.9l34.1-34.8H76.3L42.2 93.5z\"/></g><path fill=\"#27AACD\" d=\"M81.6 93.9l-20-20-19.4 19.6 19.4 19.6z\"/><path fill=\"#19599A\" d=\"M115.7 128L81.6 93.9l-20 19.2L76.3 128z\"/><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__flutter-original-a\" gradientUnits=\"userSpaceOnUse\" x1=\"59.365\" y1=\"116.36\" x2=\"86.825\" y2=\"99.399\"><stop offset=\"0\" stop-color=\"#1b4e94\"/><stop offset=\".63\" stop-color=\"#1a5497\"/><stop offset=\"1\" stop-color=\"#195a9b\"/></linearGradient><path fill=\"url(#__DSH_CODE_ICON_INSTANCE__flutter-original-a)\" d=\"M61.6 113.1l30.8-8.4-10.8-10.8z\"/></svg>",
	"git": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#FFF0EC\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#F05032\" d=\"M13.09 23.549a1.54 1.54 0 0 1-2.18 0L.451 13.089a1.54 1.54 0 0 1 0-2.179l7.191-7.19 2.733 2.733a1.85 1.85 0 0 0 .964 2.326v6.66a1.849 1.849 0 1 0 1.54 0V8.957l2.508 2.508a1.85 1.85 0 1 0 1.09-1.09l-2.634-2.634a1.85 1.85 0 0 0-2.378-2.377L8.73 2.63 10.91.451a1.54 1.54 0 0 1 2.179 0l10.459 10.46a1.54 1.54 0 0 1 0 2.179z\"/></g>",
	"go": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#E7F9FC\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#00ADD8\" d=\"M1.811 10.231c-.047 0-.058-.023-.035-.059l.246-.315c.023-.035.081-.058.128-.058h4.172c.046 0 .058.035.035.07l-.199.303c-.023.036-.082.07-.117.07zM.047 11.306c-.047 0-.059-.023-.035-.058l.245-.316c.023-.035.082-.058.129-.058h5.328c.047 0 .07.035.058.07l-.093.28c-.012.047-.058.07-.105.07zm2.828 1.075c-.047 0-.059-.035-.035-.07l.163-.292c.023-.035.07-.07.117-.07h2.337c.047 0 .07.035.07.082l-.023.28c0 .047-.047.082-.082.082zm12.129-2.36c-.736.187-1.239.327-1.963.514-.176.046-.187.058-.34-.117-.174-.199-.303-.327-.548-.444-.737-.362-1.45-.257-2.115.175-.795.514-1.204 1.274-1.192 2.22.011.935.654 1.706 1.577 1.835.795.105 1.46-.175 1.987-.77.105-.13.198-.27.315-.434H10.47c-.245 0-.304-.152-.222-.35.152-.362.432-.97.596-1.274a.315.315 0 01.292-.187h4.253c-.023.316-.023.631-.07.947a4.983 4.983 0 01-.958 2.29c-.841 1.11-1.94 1.8-3.33 1.986-1.145.152-2.209-.07-3.143-.77-.865-.655-1.356-1.52-1.484-2.595-.152-1.274.222-2.419.993-3.424.83-1.086 1.928-1.776 3.272-2.02 1.098-.2 2.15-.07 3.096.571.62.41 1.063.97 1.356 1.648.07.105.023.164-.117.2m3.868 6.461c-1.064-.024-2.034-.328-2.852-1.029a3.665 3.665 0 01-1.262-2.255c-.21-1.32.152-2.489.947-3.529.853-1.122 1.881-1.706 3.272-1.95 1.192-.21 2.314-.095 3.33.595.923.63 1.496 1.484 1.648 2.605.198 1.578-.257 2.863-1.344 3.962-.771.783-1.718 1.273-2.805 1.495-.315.06-.63.07-.934.106zm2.78-4.72c-.011-.153-.011-.27-.034-.387-.21-1.157-1.274-1.81-2.384-1.554-1.087.245-1.788.935-2.045 2.033-.21.912.234 1.835 1.075 2.21.643.28 1.285.244 1.905-.07.923-.48 1.425-1.228 1.484-2.233z\"/></g>",
	"graphql": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#FCEAF6\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#E10098\" d=\"M12.002 0a2.138 2.138 0 1 0 0 4.277 2.138 2.138 0 1 0 0-4.277zm8.54 4.931a2.138 2.138 0 1 0 0 4.277 2.138 2.138 0 1 0 0-4.277zm0 9.862a2.138 2.138 0 1 0 0 4.277 2.138 2.138 0 1 0 0-4.277zm-8.54 4.931a2.138 2.138 0 1 0 0 4.276 2.138 2.138 0 1 0 0-4.276zm-8.542-4.93a2.138 2.138 0 1 0 0 4.276 2.138 2.138 0 1 0 0-4.277zm0-9.863a2.138 2.138 0 1 0 0 4.277 2.138 2.138 0 1 0 0-4.277zm8.542-3.378L2.953 6.777v10.448l9.049 5.224 9.047-5.224V6.777zm0 1.601 7.66 13.27H4.34zm-1.387.371L3.97 15.037V7.363zm2.774 0 6.646 3.838v7.674zM5.355 17.44h13.293l-6.646 3.836z\"/></g>",
	"haskell": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F3F0F7\" stroke=\"#E1D9EA\" stroke-width=\".5\"/><svg x=\"2.75\" y=\"2.75\" width=\"14.5\" height=\"14.5\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#463B63\" d=\"M0 110.2L30.1 65 0 19.9h22.6L52.7 65l-30.1 45.1H0z\"/><path fill=\"#5E5187\" d=\"M30.1 110.2L60.2 65 30.1 19.9h22.6l60.2 90.3H90.4L71.5 81.9l-18.8 28.2H30.1z\"/><path fill=\"#904F8C\" d=\"M102.9 83.8l-10-15.1H128v15.1h-25.1zM87.8 61.3l-10-15.1H128v15.1H87.8z\"/></svg>",
	"ini": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#6E7781\"/><text x=\"10\" y=\"13.2\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"7.2\" font-weight=\"800\" fill=\"#fff\">INI</text>",
	"java": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F4F7FA\" stroke=\"#D9E2E8\" stroke-width=\".5\"/><svg x=\"2.5\" y=\"2.5\" width=\"15\" height=\"15\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#0074BD\" d=\"M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z\"/><path fill=\"#EA2D2E\" d=\"M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z\"/><path fill=\"#0074BD\" d=\"M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z\"/><path fill=\"#EA2D2E\" d=\"M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z\"/><path fill=\"#0074BD\" d=\"M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z\"/></svg>",
	"javascript": "<defs><clipPath id=\"__DSH_CODE_ICON_INSTANCE__a\"><rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\"/></clipPath></defs><g clip-path=\"url(#__DSH_CODE_ICON_INSTANCE__a)\"><svg x=\"1\" y=\"1\" width=\"18\" height=\"18\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#F0DB4F\" d=\"M1.408 1.408h125.184v125.185H1.408z\"/><path fill=\"#323330\" d=\"M116.347 96.736c-.917-5.711-4.641-10.508-15.672-14.981-3.832-1.761-8.104-3.022-9.377-5.926-.452-1.69-.512-2.642-.226-3.665.821-3.32 4.784-4.355 7.925-3.403 2.023.678 3.938 2.237 5.093 4.724 5.402-3.498 5.391-3.475 9.163-5.879-1.381-2.141-2.118-3.129-3.022-4.045-3.249-3.629-7.676-5.498-14.756-5.355l-3.688.477c-3.534.893-6.902 2.748-8.877 5.235-5.926 6.724-4.236 18.492 2.975 23.335 7.104 5.332 17.54 6.545 18.873 11.531 1.297 6.104-4.486 8.08-10.234 7.378-4.236-.881-6.592-3.034-9.139-6.949-4.688 2.713-4.688 2.713-9.508 5.485 1.143 2.499 2.344 3.63 4.26 5.795 9.068 9.198 31.76 8.746 35.83-5.176.165-.478 1.261-3.666.38-8.581zM69.462 58.943H57.753l-.048 30.272c0 6.438.333 12.34-.714 14.149-1.713 3.558-6.152 3.117-8.175 2.427-2.059-1.012-3.106-2.451-4.319-4.485-.333-.584-.583-1.036-.667-1.071l-9.52 5.83c1.583 3.249 3.915 6.069 6.902 7.901 4.462 2.678 10.459 3.499 16.731 2.059 4.082-1.189 7.604-3.652 9.448-7.401 2.666-4.915 2.094-10.864 2.07-17.444.06-10.735.001-21.468.001-32.237z\"/></svg></g>",
	"json": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F4F4F4\" stroke=\"#DDDDDD\" stroke-width=\".5\"/><svg x=\"2.75\" y=\"2.75\" width=\"14.5\" height=\"14.5\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__a\" x1=\"-670.564\" x2=\"-583.105\" y1=\"-280.831\" y2=\"-368.306\" gradientTransform=\"matrix(.9988 0 0 -.9987 689.011 -259.008)\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\"/><stop offset=\"1\" stop-color=\"#fff\"/></linearGradient><path fill=\"url(#__DSH_CODE_ICON_INSTANCE__a)\" fill-rule=\"evenodd\" d=\"M63.895 94.303c27.433 37.398 54.281-10.438 54.241-39.205-.046-34.012-34.518-53.021-54.263-53.021C32.182 2.077 2 28.269 2 64.105 2 103.937 36.596 126 63.873 126c-6.172-.889-26.742-5.296-27.019-52.674-.186-32.044 10.453-44.846 26.974-39.214.37.137 18.223 7.18 18.223 30.187 0 22.908-18.156 30.004-18.156 30.004z\" clip-rule=\"evenodd\"/><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__b\" x1=\"-579.148\" x2=\"-666.607\" y1=\"-364.34\" y2=\"-276.873\" gradientTransform=\"matrix(.9988 0 0 -.9987 689.011 -259.008)\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\"/><stop offset=\"1\" stop-color=\"#fff\"/></linearGradient><path fill=\"url(#__DSH_CODE_ICON_INSTANCE__b)\" fill-rule=\"evenodd\" d=\"M63.863 34.086C45.736 27.838 23.53 42.778 23.53 72.703 23.53 121.565 59.739 126 64.128 126 95.818 126 126 99.808 126 63.972 126 24.14 91.404 2.077 64.127 2.077c7.555-1.046 40.719 8.176 40.719 53.504 0 29.559-24.764 45.651-40.87 38.776-.37-.137-18.223-7.18-18.223-30.187 0-22.91 18.11-30.085 18.11-30.084z\" clip-rule=\"evenodd\"/></svg>",
	"kotlin": "<defs><linearGradient id=\"__DSH_CODE_ICON_INSTANCE__k\" x1=\"1\" y1=\"19\" x2=\"19\" y2=\"1\"><stop stop-color=\"#0095D5\"/><stop offset=\".5\" stop-color=\"#7F52FF\"/><stop offset=\"1\" stop-color=\"#F88909\"/></linearGradient></defs><rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"url(#__DSH_CODE_ICON_INSTANCE__k)\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#FFFFFF\" d=\"M24 24H0V0h24L12 12Z\"/></g>",
	"lua": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#ECECF7\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#000080\" d=\"M.38 10.377l-.272-.037c-.048.344-.082.695-.101 1.041l.275.016c.018-.34.051-.682.098-1.02zM4.136 3.289l-.184-.205c-.258.232-.509.48-.746.734l.202.188c.231-.248.476-.49.728-.717zM5.769 2.059l-.146-.235c-.296.186-.586.385-.863.594l.166.219c.27-.203.554-.399.843-.578zM1.824 18.369c.185.297.384.586.593.863l.22-.164c-.205-.271-.399-.555-.58-.844l-.233.145zM1.127 16.402l-.255.104c.129.318.274.635.431.943l.005.01.245-.125-.005-.01c-.153-.301-.295-.611-.421-.922zM.298 9.309l.269.063c.076-.332.168-.664.272-.986l-.261-.087c-.108.332-.202.672-.28 1.01zM.274 12.42l-.275.01c.012.348.04.699.083 1.043l.273-.033c-.042-.336-.069-.68-.081-1.02zM.256 14.506c.073.34.162.682.264 1.014l.263-.08c-.1-.326-.187-.658-.258-.99l-.269.056zM11.573.275L11.563 0c-.348.012-.699.039-1.044.082l.034.273c.338-.041.68-.068 1.02-.08zM23.221 8.566c.1.326.186.66.256.992l.27-.059c-.072-.34-.16-.682-.262-1.014l-.264.081zM17.621 1.389c-.309-.164-.627-.314-.947-.449l-.107.252c.314.133.625.281.926.439l.128-.242zM15.693.572c-.332-.105-.67-.199-1.01-.277l-.063.268c.332.076.664.168.988.273l.085-.264zM6.674 1.545c.298-.15.606-.291.916-.418L7.486.873c-.317.127-.632.272-.937.428l-.015.008.125.244.015-.008zM23.727 11.588l.275-.01a11.797 11.797 0 0 0-.082-1.045l-.273.033c.041.338.068.682.08 1.022zM13.654.105c-.346-.047-.696-.08-1.043-.098l-.014.273c.339.018.683.051 1.019.098l.038-.273zM9.544.527l-.058-.27c-.34.072-.681.16-1.014.264l.081.262c.325-.099.659-.185.991-.256zM1.921 5.469l.231.15c.185-.285.384-.566.592-.834l-.217-.17c-.213.276-.417.563-.606.854zM.943 7.318l.253.107c.132-.313.28-.625.439-.924l-.243-.128c-.163.307-.314.625-.449.945zM18.223 21.943l.145.234c.295-.186.586-.385.863-.594l-.164-.219c-.272.204-.557.4-.844.579zM21.248 19.219l.217.17c.215-.273.418-.561.607-.854l-.23-.148c-.186.285-.385.564-.594.832zM19.855 20.715l.184.203c.258-.23.51-.479.746-.732l-.201-.188c-.23.248-.477.488-.729.717zM22.359 17.504l.244.129c.162-.307.314-.625.449-.945l-.254-.107a11.27 11.27 0 0 1-.439.923zM23.617 13.629l.273.039c.049-.346.082-.695.102-1.043l-.275-.014c-.018.338-.051.682-.1 1.018zM23.156 15.621l.264.086c.107-.332.201-.67.279-1.01l-.268-.063c-.077.333-.169.665-.275.987zM22.453 6.672c.154.303.297.617.424.932l.256-.104c-.131-.322-.277-.643-.436-.953l-.244.125zM8.296 23.418c.331.107.67.201 1.009.279l.062-.268c-.331-.076-.663-.168-.986-.273l-.085.262zM10.335 23.889c.345.049.696.082 1.043.102l.014-.275c-.339-.018-.682-.051-1.019-.098l-.038.271zM17.326 22.449c-.303.154-.613.297-.926.424l.104.256c.318-.131.639-.275.947-.434l.004-.002-.123-.246-.006.002zM4.613 21.467c.274.213.562.418.854.605l.149-.23c-.285-.184-.565-.385-.833-.592l-.17.217zM12.417 23.725l.009.275c.348-.014.699-.041 1.045-.084l-.035-.271c-.336.041-.68.068-1.019.08zM6.37 22.604c.307.162.625.314.946.449l.107-.254c-.313-.133-.624-.279-.924-.439l-.129.244zM3.083 20.041c.233.258.48.51.734.746l.188-.201c-.249-.23-.49-.477-.717-.729l-.205.184zM14.445 23.475l.059.27c.34-.074.68-.162 1.014-.266l-.082-.262c-.325.099-.659.185-.991.258zM21.18.129A2.689 2.689 0 1 0 21.18 5.507 2.689 2.689 0 1 0 21.18.129zM15.324 15.447c0 .471.314.66.852.66.67 0 1.297-.396 1.297-1.016v-.645c-.23.107-.379.141-1.107.24-.735.109-1.042.306-1.042.761zM12 2.818c-5.07 0-9.18 4.109-9.18 9.18 0 5.068 4.11 9.18 9.18 9.18 5.07 0 9.18-4.111 9.18-9.18 0-5.07-4.11-9.18-9.18-9.18zm-2.487 13.77H5.771v-6.023h.769v5.346h2.974v.677zm4.13 0h-.619v-.67c-.405.57-.811.793-1.446.793-.843 0-1.38-.463-1.38-1.182v-3.271h.686v3c0 .52.347.85.893.85.719 0 1.181-.578 1.181-1.461v-2.389h.686v4.33zm-.53-8.393c0-1.484 1.205-2.689 2.689-2.689s2.688 1.205 2.688 2.689-1.203 2.688-2.688 2.688-2.689-1.203-2.689-2.688zm5.567 7.856v.52c-.223.059-.33.074-.471.074-.34 0-.637-.238-.711-.57-.381.406-.918.637-1.471.637-.877 0-1.422-.463-1.422-1.248 0-.527.256-.916.76-1.123.266-.107.414-.141 1.389-.264.545-.066.719-.191.719-.48v-.182c0-.412-.348-.645-.967-.645-.645 0-.957.24-1.016.77h-.693c.041-1 .686-1.404 1.734-1.404 1.066 0 1.627.412 1.627 1.182v2.412c0 .215.133.338.373.338.041-.002.074-.002.149-.017z\"/></g>",
	"makefile": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#427819\"/><path fill=\"#fff\" d=\"m5 4.5 2.3 2.3 2.3-2.3L11 5.9 8.7 8.2l2.4 2.4L9.7 12l-2.4-2.4L5 11.9 3.6 10.5l2.3-2.3-2.3-2.3zm7 6.5h4v1.5h-4zm0 2.8h4v1.5h-4z\"/>",
	"node": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#EDF7EA\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#539E43\" d=\"M11.998,24c-0.321,0-0.641-0.084-0.922-0.247l-2.936-1.737c-0.438-0.245-0.224-0.332-0.08-0.383 c0.585-0.203,0.703-0.25,1.328-0.604c0.065-0.037,0.151-0.023,0.218,0.017l2.256,1.339c0.082,0.045,0.197,0.045,0.272,0l8.795-5.076 c0.082-0.047,0.134-0.141,0.134-0.238V6.921c0-0.099-0.053-0.192-0.137-0.242l-8.791-5.072c-0.081-0.047-0.189-0.047-0.271,0 L3.075,6.68C2.99,6.729,2.936,6.825,2.936,6.921v10.15c0,0.097,0.054,0.189,0.139,0.235l2.409,1.392 c1.307,0.654,2.108-0.116,2.108-0.89V7.787c0-0.142,0.114-0.253,0.256-0.253h1.115c0.139,0,0.255,0.112,0.255,0.253v10.021 c0,1.745-0.95,2.745-2.604,2.745c-0.508,0-0.909,0-2.026-0.551L2.28,18.675c-0.57-0.329-0.922-0.945-0.922-1.604V6.921 c0-0.659,0.353-1.275,0.922-1.603l8.795-5.082c0.557-0.315,1.296-0.315,1.848,0l8.794,5.082c0.57,0.329,0.924,0.944,0.924,1.603 v10.15c0,0.659-0.354,1.273-0.924,1.604l-8.794,5.078C12.643,23.916,12.324,24,11.998,24z M19.099,13.993 c0-1.9-1.284-2.406-3.987-2.763c-2.731-0.361-3.009-0.548-3.009-1.187c0-0.528,0.235-1.233,2.258-1.233 c1.807,0,2.473,0.389,2.747,1.607c0.024,0.115,0.129,0.199,0.247,0.199h1.141c0.071,0,0.138-0.031,0.186-0.081 c0.048-0.054,0.074-0.123,0.067-0.196c-0.177-2.098-1.571-3.076-4.388-3.076c-2.508,0-4.004,1.058-4.004,2.833 c0,1.925,1.488,2.457,3.895,2.695c2.88,0.282,3.103,0.703,3.103,1.269c0,0.983-0.789,1.402-2.642,1.402 c-2.327,0-2.839-0.584-3.011-1.742c-0.02-0.124-0.126-0.215-0.253-0.215h-1.137c-0.141,0-0.254,0.112-0.254,0.253 c0,1.482,0.806,3.248,4.655,3.248C17.501,17.007,19.099,15.91,19.099,13.993z\"/></g>",
	"objective-c": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#438EFF\"/><text x=\"10\" y=\"13.2\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"7.2\" font-weight=\"800\" fill=\"#fff\">OC</text>",
	"perl": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#EAF2F7\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#0073A1\" d=\"M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0m.157 1.103a10.91 10.91 0 0 1 9.214 5.404c-1.962.152-3.156 1.698-5.132 3.553-2.81 2.637-4.562.582-5.288-.898-.447-1.004-.847-2.117-1.544-2.769A.4.4 0 0 1 9.3 6.02l.08-.37a.083.083 0 0 0-.074-.1c-.33-.022-.601.093-.84.368a2.5 2.5 0 0 0-.375-.064c-.863-.093-1.036.345-1.873.345H5.81c-.758 0-1.391.361-1.7.892-.248.424-.257.884.15.93-.126.445.292.62 1.224.192 0 0 .733.421 1.749.421.549 0 .712.087.914.967.486 2.138 2.404 5.655 6.282 5.655l.118.166c.659.934.86 2.113.48 3.184-.307.867-.697 1.531-.697 1.531q.01.178.01.349c0 .81-.175 1.553-.387 2.23a10.91 10.91 0 0 1-11.989-6.342A10.91 10.91 0 0 1 7.608 2.01a10.9 10.9 0 0 1 4.55-.907M7.524 6.47c.288 0 .575.231.477.272a.4.4 0 0 1-.1.02.38.38 0 0 1-.375.327.384.384 0 0 1-.378-.326.4.4 0 0 1-.101-.02c-.098-.042.19-.273.477-.273m10.193 10.49q.05 0 .101.007.326.054.694.096.135.01.269.026a13.4 13.4 0 0 0 2.846-.007 10.9 10.9 0 0 1-2.007 2.705c-.11-.23-.547-1.19-.573-2.196q-.156-.01-.313-.026-.13-.014-.256-.022a18 18 0 0 1-.735-.102h-.003c-.032 0-.06.01-.074.035l-.003.012q-.081.265-.182.544c.428 1.084.652 2.078.652 2.078.14.22.258.432.363.64a11 11 0 0 1-2.168 1.264 11 11 0 0 1-1.205.426 13.3 13.3 0 0 1 1.055-2.531s.678-1.445 1.027-2.564v-.004a.55.55 0 0 1 .512-.38\"/></g>",
	"php": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F0EFF8\" stroke=\"#DDDCEB\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#777BB4\" d=\"M7.01 10.207h-.944l-.515 2.648h.838c.556 0 .97-.105 1.242-.314.272-.21.455-.559.55-1.049.092-.47.05-.802-.124-.995-.175-.193-.523-.29-1.047-.29zM12 5.688C5.373 5.688 0 8.514 0 12s5.373 6.313 12 6.313S24 15.486 24 12c0-3.486-5.373-6.312-12-6.312zm-3.26 7.451c-.261.25-.575.438-.917.551-.336.108-.765.164-1.285.164H5.357l-.327 1.681H3.652l1.23-6.326h2.65c.797 0 1.378.209 1.744.628.366.418.476 1.002.33 1.752a2.836 2.836 0 0 1-.305.847c-.143.255-.33.49-.561.703zm4.024.715l.543-2.799c.063-.318.039-.536-.068-.651-.107-.116-.336-.174-.687-.174H11.46l-.704 3.625H9.388l1.23-6.327h1.367l-.327 1.682h1.218c.767 0 1.295.134 1.586.401s.378.7.263 1.299l-.572 2.944h-1.389zm7.597-2.265a2.782 2.782 0 0 1-.305.847c-.143.255-.33.49-.561.703a2.44 2.44 0 0 1-.917.551c-.336.108-.765.164-1.286.164h-1.18l-.327 1.682h-1.378l1.23-6.326h2.649c.797 0 1.378.209 1.744.628.366.417.477 1.001.331 1.751zM17.766 10.207h-.943l-.516 2.648h.838c.557 0 .971-.105 1.242-.314.272-.21.455-.559.551-1.049.092-.47.049-.802-.125-.995s-.524-.29-1.047-.29z\"/></g>",
	"powershell": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#2671BE\"/><path fill=\"#fff\" fill-opacity=\".16\" d=\"M5.5 4h11l-3.5 12H2z\"/><path d=\"m6.5 6.5 3 3-4.2 3.2m4 1h4\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
	"protobuf": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#4285F4\"/><path fill=\"none\" stroke=\"#fff\" stroke-width=\"1.2\" stroke-linejoin=\"round\" d=\"m10 3.5 6 3.3v6.4l-6 3.3-6-3.3V6.8z\"/><path fill=\"#fff\" d=\"M6.5 6.5h4.4c2.3 0 3.6 1.2 3.6 3.1s-1.3 3.1-3.6 3.1H9v2H6.5zM9 8.4v2.4h1.6c.8 0 1.2-.4 1.2-1.2s-.4-1.2-1.2-1.2z\"/>",
	"python": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F2F4F7\" stroke=\"#D5DBE5\" stroke-width=\".5\"/><g transform=\"matrix(.126 0 0 .126 2.30 2.24)\"><path fill=\"#3776AB\" d=\"M 60.510156,6.3979729 C 55.926503,6.4192712 51.549217,6.8101906 47.697656,7.4917229 C 36.35144,9.4962267 34.291407,13.691825 34.291406,21.429223 L 34.291406,31.647973 L 61.103906,31.647973 L 61.103906,35.054223 L 34.291406,35.054223 L 24.228906,35.054223 C 16.436447,35.054223 9.6131468,39.73794 7.4789058,48.647973 C 5.0170858,58.860939 4.9078907,65.233996 7.4789058,75.897973 C 9.3848341,83.835825 13.936449,89.491721 21.728906,89.491723 L 30.947656,89.491723 L 30.947656,77.241723 C 30.947656,68.391821 38.6048,60.585475 47.697656,60.585473 L 74.478906,60.585473 C 81.933857,60.585473 87.885159,54.447309 87.885156,46.960473 L 87.885156,21.429223 C 87.885156,14.162884 81.755176,8.7044455 74.478906,7.4917229 C 69.872919,6.7249976 65.093809,6.3766746 60.510156,6.3979729 z M 46.010156,14.616723 C 48.779703,14.616723 51.041406,16.915369 51.041406,19.741723 C 51.041404,22.558059 48.779703,24.835473 46.010156,24.835473 C 43.23068,24.835472 40.978906,22.558058 40.978906,19.741723 C 40.978905,16.91537 43.23068,14.616723 46.010156,14.616723 z \"/><path fill=\"#FFD43B\" d=\"M 91.228906,35.054223 L 91.228906,46.960473 C 91.228906,56.191228 83.403011,63.960472 74.478906,63.960473 L 47.697656,63.960473 C 40.361823,63.960473 34.291407,70.238956 34.291406,77.585473 L 34.291406,103.11672 C 34.291406,110.38306 40.609994,114.65704 47.697656,116.74172 C 56.184987,119.23733 64.323893,119.68835 74.478906,116.74172 C 81.229061,114.78733 87.885159,110.85411 87.885156,103.11672 L 87.885156,92.897973 L 61.103906,92.897973 L 61.103906,89.491723 L 87.885156,89.491723 L 101.29141,89.491723 C 109.08387,89.491723 111.98766,84.056315 114.69765,75.897973 C 117.49698,67.499087 117.37787,59.422197 114.69765,48.647973 C 112.77187,40.890532 109.09378,35.054223 101.29141,35.054223 L 91.228906,35.054223 z M 76.166406,99.710473 C 78.945884,99.710476 81.197656,101.98789 81.197656,104.80422 C 81.197654,107.63057 78.945881,109.92922 76.166406,109.92922 C 73.396856,109.92922 71.135156,107.63057 71.135156,104.80422 C 71.135158,101.98789 73.396853,99.710473 76.166406,99.710473 z \"/></g>",
	"r": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#EEF2F6\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#276DC3\" d=\"M12 2.746c-6.627 0-12 3.599-12 8.037 0 3.897 4.144 7.144 9.64 7.88V16.26c-2.924-.915-4.925-2.755-4.925-4.877 0-3.035 4.084-5.494 9.12-5.494 5.038 0 8.757 1.683 8.757 5.494 0 1.976-.999 3.379-2.662 4.272.09.066.174.128.258.216.169.149.25.363.372.544 2.128-1.45 3.44-3.437 3.44-5.631 0-4.44-5.373-8.038-12-8.038zm-2.111 4.99v13.516l4.093-.002-.002-5.291h1.1c.225 0 .321.066.549.25.272.22.715.982.715.982l2.164 4.063 4.627-.002-2.864-4.826s-.086-.193-.265-.383a2.22 2.22 0 00-.582-.416c-.422-.214-1.149-.434-1.149-.434s3.578-.264 3.578-3.826c0-3.562-3.744-3.63-3.744-3.63zm4.127 2.93l2.478.002s1.149-.062 1.149 1.127c0 1.165-1.149 1.17-1.149 1.17h-2.478zm1.754 6.119c-.494.049-1.012.079-1.54.088v1.807a16.622 16.622 0 002.37-.473l-.471-.891s-.108-.183-.248-.394c-.039-.054-.08-.098-.111-.137z\"/></g>",
	"react": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#20232A\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#61DAFB\" d=\"M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z\"/></g>",
	"ruby": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#FCEDEC\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#CC342D\" d=\"M20.156.083c3.033.525 3.893 2.598 3.829 4.77L24 4.822 22.635 22.71 4.89 23.926h.016C3.433 23.864.15 23.729 0 19.139l1.645-3 2.819 6.586.503 1.172 2.805-9.144-.03.007.016-.03 9.255 2.956-1.396-5.431-.99-3.9 8.82-.569-.615-.51L16.5 2.114 20.159.073l-.003.01zM0 19.089zM5.13 5.073c3.561-3.533 8.157-5.621 9.922-3.84 1.762 1.777-.105 6.105-3.673 9.636-3.563 3.532-8.103 5.734-9.864 3.957-1.766-1.777.045-6.217 3.612-9.75l.003-.003z\"/></g>",
	"rust": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F3E6DD\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#2B2B2B\" d=\"M23.8346 11.7033l-1.0073-.6236a13.7268 13.7268 0 00-.0283-.2936l.8656-.8069a.3483.3483 0 00-.1154-.578l-1.1066-.414a8.4958 8.4958 0 00-.087-.2856l.6904-.9587a.3462.3462 0 00-.2257-.5446l-1.1663-.1894a9.3574 9.3574 0 00-.1407-.2622l.49-1.0761a.3437.3437 0 00-.0274-.3361.3486.3486 0 00-.3006-.154l-1.1845.0416a6.7444 6.7444 0 00-.1873-.2268l.2723-1.153a.3472.3472 0 00-.417-.4172l-1.1532.2724a14.0183 14.0183 0 00-.2278-.1873l.0415-1.1845a.3442.3442 0 00-.49-.328l-1.076.491c-.0872-.0476-.1742-.0952-.2623-.1407l-.1903-1.1673A.3483.3483 0 0016.256.955l-.9597.6905a8.4867 8.4867 0 00-.2855-.086l-.414-1.1066a.3483.3483 0 00-.5781-.1154l-.8069.8666a9.2936 9.2936 0 00-.2936-.0284L12.2946.1683a.3462.3462 0 00-.5892 0l-.6236 1.0073a13.7383 13.7383 0 00-.2936.0284L9.9803.3374a.3462.3462 0 00-.578.1154l-.4141 1.1065c-.0962.0274-.1903.0567-.2855.086L7.744.955a.3483.3483 0 00-.5447.2258L7.009 2.348a9.3574 9.3574 0 00-.2622.1407l-1.0762-.491a.3462.3462 0 00-.49.328l.0416 1.1845a7.9826 7.9826 0 00-.2278.1873L3.8413 3.425a.3472.3472 0 00-.4171.4171l.2713 1.1531c-.0628.075-.1255.1509-.1863.2268l-1.1845-.0415a.3462.3462 0 00-.328.49l.491 1.0761a9.167 9.167 0 00-.1407.2622l-1.1662.1894a.3483.3483 0 00-.2258.5446l.6904.9587a13.303 13.303 0 00-.087.2855l-1.1065.414a.3483.3483 0 00-.1155.5781l.8656.807a9.2936 9.2936 0 00-.0283.2935l-1.0073.6236a.3442.3442 0 000 .5892l1.0073.6236c.008.0982.0182.1964.0283.2936l-.8656.8079a.3462.3462 0 00.1155.578l1.1065.4141c.0273.0962.0567.1914.087.2855l-.6904.9587a.3452.3452 0 00.2268.5447l1.1662.1893c.0456.088.0922.1751.1408.2622l-.491 1.0762a.3462.3462 0 00.328.49l1.1834-.0415c.0618.0769.1235.1528.1873.2277l-.2713 1.1541a.3462.3462 0 00.4171.4161l1.153-.2713c.075.0638.151.1255.2279.1863l-.0415 1.1845a.3442.3442 0 00.49.327l1.0761-.49c.087.0486.1741.0951.2622.1407l.1903 1.1662a.3483.3483 0 00.5447.2268l.9587-.6904a9.299 9.299 0 00.2855.087l.414 1.1066a.3452.3452 0 00.5781.1154l.8079-.8656c.0972.0111.1954.0203.2936.0294l.6236 1.0073a.3472.3472 0 00.5892 0l.6236-1.0073c.0982-.0091.1964-.0183.2936-.0294l.8069.8656a.3483.3483 0 00.578-.1154l.4141-1.1066a8.4626 8.4626 0 00.2855-.087l.9587.6904a.3452.3452 0 00.5447-.2268l.1903-1.1662c.088-.0456.1751-.0931.2622-.1407l1.0762.49a.3472.3472 0 00.49-.327l-.0415-1.1845a6.7267 6.7267 0 00.2267-.1863l1.1531.2713a.3472.3472 0 00.4171-.416l-.2713-1.1542c.0628-.0749.1255-.1508.1863-.2278l1.1845.0415a.3442.3442 0 00.328-.49l-.49-1.076c.0475-.0872.0951-.1742.1407-.2623l1.1662-.1893a.3483.3483 0 00.2258-.5447l-.6904-.9587.087-.2855 1.1066-.414a.3462.3462 0 00.1154-.5781l-.8656-.8079c.0101-.0972.0202-.1954.0283-.2936l1.0073-.6236a.3442.3442 0 000-.5892zm-6.7413 8.3551a.7138.7138 0 01.2986-1.396.714.714 0 11-.2997 1.396zm-.3422-2.3142a.649.649 0 00-.7715.5l-.3573 1.6685c-1.1035.501-2.3285.7795-3.6193.7795a8.7368 8.7368 0 01-3.6951-.814l-.3574-1.6684a.648.648 0 00-.7714-.499l-1.473.3158a8.7216 8.7216 0 01-.7613-.898h7.1676c.081 0 .1356-.0141.1356-.088v-2.536c0-.074-.0536-.0881-.1356-.0881h-2.0966v-1.6077h2.2677c.2065 0 1.1065.0587 1.394 1.2088.0901.3533.2875 1.5044.4232 1.8729.1346.413.6833 1.2381 1.2685 1.2381h3.5716a.7492.7492 0 00.1296-.0131 8.7874 8.7874 0 01-.8119.9526zM6.8369 20.024a.714.714 0 11-.2997-1.396.714.714 0 01.2997 1.396zM4.1177 8.9972a.7137.7137 0 11-1.304.5791.7137.7137 0 011.304-.579zm-.8352 1.9813l1.5347-.6824a.65.65 0 00.33-.8585l-.3158-.7147h1.2432v5.6025H3.5669a8.7753 8.7753 0 01-.2834-3.348zm6.7343-.5437V8.7836h2.9601c.153 0 1.0792.1772 1.0792.8697 0 .575-.7107.7815-1.2948.7815zm10.7574 1.4862c0 .2187-.008.4363-.0243.651h-.9c-.09 0-.1265.0586-.1265.1477v.413c0 .973-.5487 1.1846-1.0296 1.2382-.4576.0517-.9648-.1913-1.0275-.4717-.2704-1.5186-.7198-1.8436-1.4305-2.4034.8817-.5599 1.799-1.386 1.799-2.4915 0-1.1936-.819-1.9458-1.3769-2.3153-.7825-.5163-1.6491-.6195-1.883-.6195H5.4682a8.7651 8.7651 0 014.907-2.7699l1.0974 1.151a.648.648 0 00.9182.0213l1.227-1.1743a8.7753 8.7753 0 016.0044 4.2762l-.8403 1.8982a.652.652 0 00.33.8585l1.6178.7188c.0283.2875.0425.577.0425.8717zm-9.3006-9.5993a.7128.7128 0 11.984 1.0316.7137.7137 0 01-.984-1.0316zm8.3389 6.71a.7107.7107 0 01.9395-.3625.7137.7137 0 11-.9405.3635z\"/></g>",
	"scala": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#FCECEB\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#DC322F\" d=\"M4.589 24c4.537 0 13.81-1.516 14.821-3v-5.729c-.957 1.408-10.284 2.912-14.821 2.912V24zM4.589 16.365c4.537 0 13.81-1.516 14.821-3V7.636c-.957 1.408-10.284 2.912-14.821 2.912v5.817zM4.589 8.729c4.537 0 13.81-1.516 14.821-3V0C18.453 1.408 9.126 2.912 4.589 2.912v5.817z\"/></g>",
	"shell": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#303642\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#7EE787\" d=\"M21.038,4.9l-7.577-4.498C13.009,0.134,12.505,0,12,0c-0.505,0-1.009,0.134-1.462,0.403L2.961,4.9 C2.057,5.437,1.5,6.429,1.5,7.503v8.995c0,1.073,0.557,2.066,1.462,2.603l7.577,4.497C10.991,23.866,11.495,24,12,24 c0.505,0,1.009-0.134,1.461-0.402l7.577-4.497c0.904-0.537,1.462-1.529,1.462-2.603V7.503C22.5,6.429,21.943,5.437,21.038,4.9z M15.17,18.946l0.013,0.646c0.001,0.078-0.05,0.167-0.111,0.198l-0.383,0.22c-0.061,0.031-0.111-0.007-0.112-0.085L14.57,19.29 c-0.328,0.136-0.66,0.169-0.872,0.084c-0.04-0.016-0.057-0.075-0.041-0.142l0.139-0.584c0.011-0.046,0.036-0.092,0.069-0.121 c0.012-0.011,0.024-0.02,0.036-0.026c0.022-0.011,0.043-0.014,0.062-0.006c0.229,0.077,0.521,0.041,0.802-0.101 c0.357-0.181,0.596-0.545,0.592-0.907c-0.003-0.328-0.181-0.465-0.613-0.468c-0.55,0.001-1.064-0.107-1.072-0.917 c-0.007-0.667,0.34-1.361,0.889-1.8l-0.007-0.652c-0.001-0.08,0.048-0.168,0.111-0.2l0.37-0.236 c0.061-0.031,0.111,0.007,0.112,0.087l0.006,0.653c0.273-0.109,0.511-0.138,0.726-0.088c0.047,0.012,0.067,0.076,0.048,0.151 l-0.144,0.578c-0.011,0.044-0.036,0.088-0.065,0.116c-0.012,0.012-0.025,0.021-0.038,0.028c-0.019,0.01-0.038,0.013-0.057,0.009 c-0.098-0.022-0.332-0.073-0.699,0.113c-0.385,0.195-0.52,0.53-0.517,0.778c0.003,0.297,0.155,0.387,0.681,0.396 c0.7,0.012,1.003,0.318,1.01,1.023C16.105,17.747,15.736,18.491,15.17,18.946z M19.143,17.859c0,0.06-0.008,0.116-0.058,0.145 l-1.916,1.164c-0.05,0.029-0.09,0.004-0.09-0.056v-0.494c0-0.06,0.037-0.093,0.087-0.122l1.887-1.129 c0.05-0.029,0.09-0.004,0.09,0.056V17.859z M20.459,6.797l-7.168,4.427c-0.894,0.523-1.553,1.109-1.553,2.187v8.833 c0,0.645,0.26,1.063,0.66,1.184c-0.131,0.023-0.264,0.039-0.398,0.039c-0.42,0-0.833-0.114-1.197-0.33L3.226,18.64 c-0.741-0.44-1.201-1.261-1.201-2.142V7.503c0-0.881,0.46-1.702,1.201-2.142l7.577-4.498c0.363-0.216,0.777-0.33,1.197-0.33 c0.419,0,0.833,0.114,1.197,0.33l7.577,4.498c0.624,0.371,1.046,1.013,1.164,1.732C21.686,6.557,21.12,6.411,20.459,6.797z\"/></g>",
	"solidity": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F0F0F0\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#363636\" d=\"M4.409 6.608L7.981.255l3.572 6.353H4.409zM8.411 0l3.569 6.348L15.552 0H8.411zm4.036 17.392l3.572 6.354 3.575-6.354h-7.147zm-.608-10.284h-7.43l3.715 6.605 3.715-6.605zm.428-.25h7.428L15.982.255l-3.715 6.603zM15.589 24l-3.569-6.349L8.448 24h7.141zm-3.856-6.858H4.306l3.712 6.603 3.715-6.603zm.428-.25h7.433l-3.718-6.605-3.715 6.605z\"/></g>",
	"sql": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#336791\"/><ellipse cx=\"10\" cy=\"5.5\" rx=\"5.8\" ry=\"2.1\" fill=\"#fff\"/><path fill=\"#fff\" fill-opacity=\".88\" d=\"M4.2 5.5v8.9c0 1.2 2.6 2.1 5.8 2.1s5.8-.9 5.8-2.1V5.5c0 1.2-2.6 2.1-5.8 2.1s-5.8-.9-5.8-2.1z\"/><path d=\"M4.2 9.2c0 1.2 2.6 2.1 5.8 2.1s5.8-.9 5.8-2.1M4.2 12.9c0 1.2 2.6 2.1 5.8 2.1s5.8-.9 5.8-2.1\" fill=\"none\" stroke=\"#336791\" stroke-opacity=\".7\" stroke-width=\".7\"/>",
	"svelte": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#FFF0EB\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#FF3E00\" d=\"M10.354 21.125a4.44 4.44 0 0 1-4.765-1.767 4.109 4.109 0 0 1-.703-3.107 3.898 3.898 0 0 1 .134-.522l.105-.321.287.21a7.21 7.21 0 0 0 2.186 1.092l.208.063-.02.208a1.253 1.253 0 0 0 .226.83 1.337 1.337 0 0 0 1.435.533 1.231 1.231 0 0 0 .343-.15l5.59-3.562a1.164 1.164 0 0 0 .524-.778 1.242 1.242 0 0 0-.211-.937 1.338 1.338 0 0 0-1.435-.533 1.23 1.23 0 0 0-.343.15l-2.133 1.36a4.078 4.078 0 0 1-1.135.499 4.44 4.44 0 0 1-4.765-1.766 4.108 4.108 0 0 1-.702-3.108 3.855 3.855 0 0 1 1.742-2.582l5.589-3.563a4.072 4.072 0 0 1 1.135-.499 4.44 4.44 0 0 1 4.765 1.767 4.109 4.109 0 0 1 .703 3.107 3.943 3.943 0 0 1-.134.522l-.105.321-.286-.21a7.204 7.204 0 0 0-2.187-1.093l-.208-.063.02-.207a1.255 1.255 0 0 0-.226-.831 1.337 1.337 0 0 0-1.435-.532 1.231 1.231 0 0 0-.343.15L8.62 9.368a1.162 1.162 0 0 0-.524.778 1.24 1.24 0 0 0 .211.937 1.338 1.338 0 0 0 1.435.533 1.235 1.235 0 0 0 .344-.151l2.132-1.36a4.067 4.067 0 0 1 1.135-.498 4.44 4.44 0 0 1 4.765 1.766 4.108 4.108 0 0 1 .702 3.108 3.857 3.857 0 0 1-1.742 2.583l-5.589 3.562a4.072 4.072 0 0 1-1.135.499m10.358-17.95C18.484-.015 14.082-.96 10.9 1.068L5.31 4.63a6.412 6.412 0 0 0-2.896 4.295 6.753 6.753 0 0 0 .666 4.336 6.43 6.43 0 0 0-.96 2.396 6.833 6.833 0 0 0 1.168 5.167c2.229 3.19 6.63 4.135 9.812 2.108l5.59-3.562a6.41 6.41 0 0 0 2.896-4.295 6.756 6.756 0 0 0-.665-4.336 6.429 6.429 0 0 0 .958-2.396 6.831 6.831 0 0 0-1.167-5.168Z\"/></g>",
	"swift": "<defs><clipPath id=\"__DSH_CODE_ICON_INSTANCE__a\"><rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\"/></clipPath></defs><g clip-path=\"url(#__DSH_CODE_ICON_INSTANCE__a)\"><svg x=\"1\" y=\"1\" width=\"18\" height=\"18\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#f05138\" d=\"M126.33 34.06a39.32 39.32 0 00-.79-7.83 28.78 28.78 0 00-2.65-7.58 28.84 28.84 0 00-4.76-6.32 23.42 23.42 0 00-6.62-4.55 27.27 27.27 0 00-7.68-2.53c-2.65-.51-5.56-.51-8.21-.76H30.25a45.46 45.46 0 00-6.09.51 21.82 21.82 0 00-5.82 1.52c-.53.25-1.32.51-1.85.76a33.82 33.82 0 00-5 3.28c-.53.51-1.06.76-1.59 1.26a22.41 22.41 0 00-4.76 6.32 23.61 23.61 0 00-2.65 7.58 78.5 78.5 0 00-.79 7.83v60.39a39.32 39.32 0 00.79 7.83 28.78 28.78 0 002.65 7.58 28.84 28.84 0 004.76 6.32 23.42 23.42 0 006.62 4.55 27.27 27.27 0 007.68 2.53c2.65.51 5.56.51 8.21.76h63.22a45.08 45.08 0 008.21-.76 27.27 27.27 0 007.68-2.53 30.13 30.13 0 006.62-4.55 22.41 22.41 0 004.76-6.32 23.61 23.61 0 002.65-7.58 78.49 78.49 0 00.79-7.83V34.06z\"/><path fill=\"#fefefe\" d=\"M85 96.5c-11.11 6.13-26.38 6.76-41.75.47A64.53 64.53 0 0113.84 73a50 50 0 0010.85 6.32c15.87 7.1 31.73 6.61 42.9 0-15.9-11.66-29.4-26.82-39.46-39.2a43.47 43.47 0 01-5.29-6.82c12.16 10.61 31.5 24 38.38 27.79a271.77 271.77 0 01-27-32.34 266.8 266.8 0 0044.47 34.87c.71.38 1.26.7 1.7 1a32.7 32.7 0 001.21-3.51c3.71-12.89-.53-27.54-9.79-39.67C93.25 33.81 106 57.05 100.66 76.51c-.14.53-.29 1-.45 1.55l.19.22c10.59 12.63 7.68 26 6.35 23.5C101 91 90.37 94.33 85 96.5z\"/></svg></g>",
	"toml": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#F6EEEA\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#9C4121\" d=\"M.014 0h5.34v2.652H2.888v18.681h2.468V24H.015V0Zm17.622 5.049v2.78h-4.274v12.935h-3.008V7.83H6.059V5.05h11.577ZM23.986 24h-5.34v-2.652h2.467V2.667h-2.468V0h5.34v24Z\"/></g>",
	"typescript": "<defs><clipPath id=\"__DSH_CODE_ICON_INSTANCE__a\"><rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\"/></clipPath></defs><g clip-path=\"url(#__DSH_CODE_ICON_INSTANCE__a)\"><svg x=\"1\" y=\"1\" width=\"18\" height=\"18\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#fff\" d=\"M22.67 47h99.67v73.67H22.67z\"/><path data-name=\"original\" fill=\"#007acc\" d=\"M1.5 63.91v62.5h125v-125H1.5zm100.73-5a15.56 15.56 0 017.82 4.5 20.58 20.58 0 013 4c0 .16-5.4 3.81-8.69 5.85-.12.08-.6-.44-1.13-1.23a7.09 7.09 0 00-5.87-3.53c-3.79-.26-6.23 1.73-6.21 5a4.58 4.58 0 00.54 2.34c.83 1.73 2.38 2.76 7.24 4.86 8.95 3.85 12.78 6.39 15.16 10 2.66 4 3.25 10.46 1.45 15.24-2 5.2-6.9 8.73-13.83 9.9a38.32 38.32 0 01-9.52-.1 23 23 0 01-12.72-6.63c-1.15-1.27-3.39-4.58-3.25-4.82a9.34 9.34 0 011.15-.73L82 101l3.59-2.08.75 1.11a16.78 16.78 0 004.74 4.54c4 2.1 9.46 1.81 12.16-.62a5.43 5.43 0 00.69-6.92c-1-1.39-3-2.56-8.59-5-6.45-2.78-9.23-4.5-11.77-7.24a16.48 16.48 0 01-3.43-6.25 25 25 0 01-.22-8c1.33-6.23 6-10.58 12.82-11.87a31.66 31.66 0 019.49.26zm-29.34 5.24v5.12H56.66v46.23H45.15V69.26H28.88v-5a49.19 49.19 0 01.12-5.17C29.08 59 39 59 51 59h21.83z\"/></svg></g>",
	"vue": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#ECF8F3\" stroke=\"#D5EAE0\" stroke-width=\".5\"/><path fill=\"#41B883\" d=\"M3.5 5h3.2l3.3 5.7L13.3 5h3.2L10 16z\"/><path fill=\"#35495E\" d=\"M6.7 5H9l1 1.8L11 5h2.3L10 10.7z\"/>",
	"wasm": "<defs><clipPath id=\"__DSH_CODE_ICON_INSTANCE__a\"><rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\"/></clipPath></defs><g clip-path=\"url(#__DSH_CODE_ICON_INSTANCE__a)\"><svg x=\"1\" y=\"1\" width=\"18\" height=\"18\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#654ff0\" d=\"M.223.222v127.555h127.555V.222H78.594c.014.227.036.455.036.686 0 8.08-6.55 14.626-14.63 14.626-8.078 0-14.625-6.546-14.625-14.626 0-.231.022-.459.031-.686zm29.595 68.746h8.445l5.782 30.738h.107l6.968-30.738h7.908l6.265 31.119h.106l6.597-31.119h8.284l-10.765 45.156H61.12l-6.213-30.738H54.8l-6.7 30.738h-8.557zm59.994 0h13.334l13.284 45.156h-8.77l-2.879-10.051H89.59l-2.212 10.05h-8.5ZM94.895 80.1l-3.684 16.57h11.473L98.448 80.1Z\"/></svg></g>",
	"xml": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#EAF3FA\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#005FAD\" d=\"M4.345 7.053c-.495.02-.44.725-.536 1.081-.157.583-.3 1.325-.347 1.926-.046.585-.008 1.127.066 1.719.058.46.191.767.07.89-.108.11-3.216 2.962-3.466 3.123-.26.169-.08.584.069.817.157.246.23.373.557.33.306-.042.405-.409.583-.606.228-.252 2.421-2.401 2.616-2.401.077.544.367 1.064.67 1.513.15.222.314.439.505.629.175.175.4.317.587.45.44.024.795-.301.35-.67-.17-.14-.735-.971-.927-1.43-.18-.43-.574-1.076-.146-1.428 1.494-1.23 3.72-2.262 4.247-2.313-.257 1.024-1.356 3.048-1.757 4.012-.14.333-.231.732-.185 1.094.055.434.383.774.587.806.417-.023.7-.387.946-.645.343-.357.634-.685.974-1.043.339-.356.672-.731.971-1.07.184-.207.674-.713.963-.713-.11.693-.716 1.552-.839 2.254-.125.716.531 1.596 1.217.956.623-.58 1.255-1.129 1.867-1.72.217-.208.175.037.224.242.05.208.176.91.275 1.1.18.346.496.592.897.598.362.006.727-.161.982-.414.19-.187.513-.699.154-.832-.23-.086-.217-.176-.495-.129-.172.029-.362.074-.507.179-.367-.003-.381-.89-.324-1.161.068-.327.207-.659.185-.998-.026-.418-.478-.69-.582-.72-.156-.076-.253.023-.458.212-.173.161-.363.332-.535.495-.34.322-.768.813-.942.813.305-.705.708-2.652-.643-2.48-.563.071-.95.377-1.394.71-.29.28-.683.641-.936.87-.236.216-.371.404-.496.404.132-.747 1.685-3.167.885-3.853-.158-.136-.313-.325-.515-.349a4.637 4.637 0 0 0-.833.19c-.565.18-2.78 1.28-4.19 2.289-.131.094-.214-.085-.231-.29-.087-1.058.199-2.19.496-3.188.208-.696-.557-1.225-.659-1.249zm18.177.874c-.166.364-.2.894-.248 1.319a24.307 24.307 0 0 0-1.246-.115c.238.296.691.588 1.056.724-.048.366-.434.67-.599 1.021.458-.127.676-.47.989-.821.362.22.791.627 1.26.636-.177-.376-.334-.695-.658-.966.269-.175.717-.362.924-.633-.345-.074-.718-.093-1.052-.015-.258-.284-.3-.772-.426-1.15zm-2.92.079c-.23.02-.613.49-.832.773-.807 1.039-1.542 3.15-1.661 3.542-.363 1.195-.502 2.672.28 3.722.456.612 1.258.66 2.041.434.405-.116.812-.406.95-.723.114-.263.174-.753-.404-.38-.224.145-.634.304-1.37.291-.247-.004-.651-.357-.76-.722-.192-.595-.11-1.393-.11-1.393.167-1.028.642-2.146 1.061-3.076.163-.36.658-1.259.842-1.546 0 0 .239-.373.131-.77-.031-.116-.091-.16-.168-.152zm3.072 2.976c-.12.264-.144.648-.18.956-.274-.031-.63-.066-.904-.083.172.215.501.426.766.525-.034.265-.314.486-.434.741.332-.092.49-.34.717-.596.263.16.575.456.914.462-.127-.273-.242-.504-.477-.701.195-.127.52-.262.67-.46a1.77 1.77 0 0 0-.763-.01c-.187-.206-.217-.56-.309-.834zm-1.123 2.422c-.083.183-.1.449-.125.662a12.6 12.6 0 0 0-.624-.058c.119.148.346.295.53.363-.025.184-.219.336-.301.513.23-.064.339-.236.496-.413.181.11.397.316.632.32-.088-.19-.168-.349-.33-.485.135-.087.36-.181.463-.317a1.22 1.22 0 0 0-.527-.008c-.13-.142-.151-.387-.214-.576z\"/></g>",
	"yaml": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#FCEEEF\" stroke=\"#F0D8DB\" stroke-width=\".5\"/><svg x=\"2.75\" y=\"2.75\" width=\"14.5\" height=\"14.5\" viewBox=\"0 0 128 128\" preserveAspectRatio=\"xMidYMid meet\">\n<polygon transform=\"matrix(.24805 0 0 .24805 .5 5.6287)\" points=\"87.702 137.67 0 0 63.25 0 119.02 88.646 175.24 0 235.79 0 143.98 137.67 143.98 224.95 87.702 224.95\"/>\n<path d=\"m82.428 49.149h-25.266l-5.1388 12.408h-11.188l23.659-55.798h11.444l22.699 55.798h-11.956l-4.2525-12.408zm-4.197-11.14-7.7455-20.476-8.6412 20.476z\" fill=\"#cb171e\"/>\n<polygon transform=\"matrix(.24805 0 0 .24805 .5 5.6287)\" points=\"87.701 250.18 87.701 470.65 135 470.65 135 318.57 184.51 420.79 221.74 420.79 272.94 314.98 272.94 470.6 318.32 470.6 318.32 250.18 256.36 250.18 201.38 349.88 149.02 250.18\"/>\n<polygon transform=\"matrix(.24805 0 0 .24805 .5 5.6287)\" points=\"512 422.74 512 422.74 395.64 422.74 395.64 250.12 347.44 250.12 347.44 469.65 512 469.65\"/>\n</svg>",
	"zig": "<rect x=\"1\" y=\"1\" width=\"18\" height=\"18\" rx=\"4\" fill=\"#FFF4DF\" stroke=\"#DDE2E8\" stroke-width=\".5\"/><g transform=\"translate(3 3) scale(.5833333333)\"><path fill=\"#E18A00\" d=\"m23.53 1.02-7.686 3.45h-7.06l-2.98 3.452h7.173L.47 22.98l7.681-3.607h7.065v-.002l2.978-3.45-7.148-.001 12.482-14.9zM0 4.47v14.901h1.883l2.98-3.45H3.451v-8h.942l2.824-3.45H0zm22.117 0-2.98 3.608h1.412v7.844h-.942l-2.98 3.45H24V4.47h-1.883z\"/></g>"
});
//#endregion
//#region lib/types/CodeFileIcon.js
/**
* Render one full-color square code-file glyph from the embedded icon set.
* @param props - Detailed code type, optional size, and optional CSS class.
* @returns The selected decorative SVG with its identifying palette intact.
*/
function CodeFileIcon({ type, size = 20, className }) {
	const instanceId = `dsh-code-icon-${React.useId().replaceAll(":", "")}`;
	return jsx("svg", {
		width: size,
		height: size,
		className,
		viewBox: "0 0 20 20",
		xmlns: "http://www.w3.org/2000/svg",
		"aria-hidden": true,
		dangerouslySetInnerHTML: { __html: CODE_FILE_ARTWORK[type].replaceAll(CODE_FILE_ICON_ID_TOKEN, instanceId) }
	});
}
const CODE_FILE_TYPE_SET = new Set([
	"angular",
	"c",
	"clojure",
	"cmake",
	"cpp",
	"csharp",
	"css",
	"dart",
	"docker",
	"elixir",
	"env",
	"erlang",
	"flutter",
	"git",
	"go",
	"graphql",
	"haskell",
	"ini",
	"java",
	"javascript",
	"json",
	"kotlin",
	"lua",
	"makefile",
	"node",
	"objective-c",
	"perl",
	"php",
	"powershell",
	"protobuf",
	"python",
	"r",
	"react",
	"ruby",
	"rust",
	"scala",
	"shell",
	"solidity",
	"sql",
	"svelte",
	"swift",
	"toml",
	"typescript",
	"vue",
	"wasm",
	"xml",
	"yaml",
	"zig"
]);
const FILE_NAME_TYPES = {
	".bash_profile": "shell",
	".bashrc": "shell",
	".env": "env",
	".gitattributes": "git",
	".gitconfig": "git",
	".gitignore": "git",
	".gitmodules": "git",
	".mailmap": "git",
	".profile": "shell",
	".zprofile": "shell",
	".zshrc": "shell",
	"bsdmakefile": "makefile",
	"cmakelists.txt": "cmake",
	"commit_editmsg": "git",
	"compose.yaml": "docker",
	"compose.yml": "docker",
	"docker-compose.yaml": "docker",
	"docker-compose.yml": "docker",
	"dockerfile": "docker",
	"gemfile": "ruby",
	"gnumakefile": "makefile",
	"guardfile": "ruby",
	"makefile": "makefile",
	"npm-shrinkwrap.json": "node",
	"package-lock.json": "node",
	"package.json": "node",
	"podfile": "ruby",
	"rakefile": "ruby"
};
const FILE_NAME_PREFIX_TYPES = [["dockerfile.", "docker"], [".env.", "env"]];
const FILE_NAME_SUFFIX_TYPES = [
	[".component.ts", "angular"],
	[".component.html", "angular"],
	[".directive.ts", "angular"],
	[".service.ts", "angular"],
	[".module.ts", "angular"],
	[".pipe.ts", "angular"],
	[".guard.ts", "angular"],
	[".interceptor.ts", "angular"],
	[".dockerfile", "docker"]
];
const EXTENSION_TYPES$1 = {
	"bash": "shell",
	"c": "c",
	"c++": "cpp",
	"cc": "cpp",
	"cfg": "ini",
	"cjs": "javascript",
	"clj": "clojure",
	"cljc": "clojure",
	"cljs": "clojure",
	"cmake": "cmake",
	"cpp": "cpp",
	"cs": "csharp",
	"csh": "shell",
	"css": "css",
	"csx": "csharp",
	"cts": "typescript",
	"cxx": "cpp",
	"dart": "dart",
	"dtd": "xml",
	"edn": "clojure",
	"env": "env",
	"erl": "erlang",
	"es6": "javascript",
	"escript": "erlang",
	"ex": "elixir",
	"exs": "elixir",
	"fish": "shell",
	"gemspec": "ruby",
	"go": "go",
	"gql": "graphql",
	"graphql": "graphql",
	"h": "c",
	"h++": "cpp",
	"hh": "cpp",
	"hpp": "cpp",
	"hrl": "erlang",
	"hs": "haskell",
	"hxx": "cpp",
	"ini": "ini",
	"ipp": "cpp",
	"java": "java",
	"js": "javascript",
	"json": "json",
	"json5": "json",
	"jsonc": "json",
	"jsx": "react",
	"ksh": "shell",
	"kt": "kotlin",
	"kts": "kotlin",
	"lhs": "haskell",
	"lua": "lua",
	"m": "objective-c",
	"mak": "makefile",
	"mjs": "javascript",
	"mk": "makefile",
	"mm": "objective-c",
	"mts": "typescript",
	"node": "node",
	"pch": "objective-c",
	"php": "php",
	"php3": "php",
	"php4": "php",
	"php5": "php",
	"phps": "php",
	"phtml": "php",
	"pl": "perl",
	"plist": "xml",
	"pm": "perl",
	"pod": "perl",
	"proto": "protobuf",
	"ps1": "powershell",
	"psd1": "powershell",
	"psm1": "powershell",
	"py": "python",
	"pyi": "python",
	"pyw": "python",
	"pyx": "python",
	"r": "r",
	"rake": "ruby",
	"rb": "ruby",
	"rmd": "r",
	"rs": "rust",
	"sc": "scala",
	"scala": "scala",
	"sh": "shell",
	"sol": "solidity",
	"sql": "sql",
	"svelte": "svelte",
	"swift": "swift",
	"t": "perl",
	"tcsh": "shell",
	"toml": "toml",
	"tpp": "cpp",
	"ts": "typescript",
	"tsx": "react",
	"vue": "vue",
	"wasm": "wasm",
	"wast": "wasm",
	"wat": "wasm",
	"xml": "xml",
	"xsd": "xml",
	"xsl": "xml",
	"xslt": "xml",
	"yaml": "yaml",
	"yml": "yaml",
	"zig": "zig",
	"zsh": "shell"
};
/**
* Test whether a resolved file type uses the full-color code-icon set.
* @param type - Resolved file-type string.
* @returns Whether the value is a detailed code-file type.
*/
function isCodeFileType(type) {
	return CODE_FILE_TYPE_SET.has(type);
}
/**
* Resolve the most specific code/configuration icon according to the supplied map priority.
* @param name - Lowercase basename.
* @param extension - Lowercase extension without the leading dot.
* @param context - Optional project-file snapshot for context-sensitive matches.
* @returns The detailed code type, or null when the traditional file classifier owns the path.
*/
function classifyCodeFileType(name, extension, context) {
	const exact = FILE_NAME_TYPES[name];
	if (exact !== void 0) return exact;
	for (const [prefix, type] of FILE_NAME_PREFIX_TYPES) if (name.startsWith(prefix)) return type;
	for (const [suffix, type] of FILE_NAME_SUFFIX_TYPES) if (name.endsWith(suffix)) return type;
	if (extension === "dart" && context !== void 0) {
		if ((Object.entries(context.files).find(([path]) => basename(path).toLowerCase() === "pubspec.yaml")?.[1])?.includes("flutter:") === true) return "flutter";
	}
	return EXTENSION_TYPES$1[extension] ?? null;
}
const EXTENSION_TYPES = {
	scss: "code",
	sass: "code",
	less: "code",
	vue: "code",
	svelte: "code",
	astro: "code",
	bat: "code",
	cmd: "code",
	csv: "excel",
	tsv: "excel",
	html: "html",
	htm: "html",
	png: "image",
	jpg: "image",
	jpeg: "image",
	gif: "image",
	svg: "image",
	webp: "image",
	avif: "image",
	bmp: "image",
	ico: "image",
	tif: "image",
	tiff: "image",
	heic: "image",
	heif: "image",
	md: "markdown",
	mdx: "markdown",
	markdown: "markdown",
	pdf: "pdf",
	ppt: "ppt",
	pptx: "ppt",
	key: "ppt",
	mp4: "video",
	mov: "video",
	m4v: "video",
	webm: "video",
	mkv: "video",
	avi: "video",
	mpg: "video",
	mpeg: "video",
	doc: "word",
	docx: "word",
	rtf: "word",
	odt: "word",
	pages: "word",
	xls: "excel",
	xlsx: "excel",
	xlsm: "excel",
	xlsb: "excel",
	xlt: "excel",
	xltx: "excel",
	xltm: "excel",
	ods: "excel",
	ots: "excel",
	fods: "excel",
	numbers: "excel"
};
const NAME_TYPES = {
	changelog: "markdown",
	contributing: "markdown",
	readme: "markdown"
};
/**
* Extract the final suffix from a file path without changing its case.
* A leading dot starts a suffix, while a missing or trailing dot returns an empty string.
* @param path - File path or basename using either path separator.
* @returns The characters after the basename's final dot.
*/
function fileExtension(path) {
	const name = basename(path);
	const dot = name.lastIndexOf(".");
	return dot < 0 ? "" : name.slice(dot + 1);
}
/**
* Classify a file path or name for file-card presentation.
* Matching is case-insensitive and applies code filename rules before extension rules;
* unknown names fall back to `other`.
* @param path - File path or basename using either path separator.
* @param context - Optional project files used by context-sensitive code mappings.
* @returns The file's closed presentation category.
*/
function classifyFileType(path, context) {
	const name = basename(path).toLowerCase();
	const extension = fileExtension(name).toLowerCase();
	return classifyCodeFileType(name, extension, context) ?? NAME_TYPES[name] ?? EXTENSION_TYPES[extension] ?? "other";
}
const FILE_BODY = "M8.48924 28H19.5108C21.6479 28 22.7165 28 23.5594 27.6509C24.6833 27.1853 25.5762 26.2924 26.0417 25.1685C26.3909 24.3256 26.3909 23.257 26.3909 21.1199V8.79443C26.3909 8.32877 26.3909 8.09593 26.3471 7.87507C26.2887 7.58058 26.173 7.30042 26.0067 7.05048C25.882 6.86303 25.7177 6.69799 25.3893 6.36792L20.0611 1.01354C19.7304 0.681235 19.5651 0.515081 19.3769 0.38885C19.126 0.220541 18.8443 0.103463 18.5481 0.0443412C18.3259 0 18.0915 0 17.6226 0H8.48924C6.35209 0 5.28351 0 4.4406 0.349145C3.31672 0.814671 2.4238 1.70759 1.95828 2.83147C1.60913 3.67438 1.60913 4.74296 1.60913 6.88011V21.1199C1.60913 23.257 1.60913 24.3256 1.95828 25.1685C2.4238 26.2924 3.31672 27.1853 4.4406 27.6509C5.28351 28 6.35209 28 8.48924 28Z";
const FILE_FOLD = "M26.3909 7.37445L19.0525 0V3.77445C19.0525 4.89271 19.0525 5.45184 19.2352 5.89289C19.4788 6.48096 19.946 6.94818 20.5341 7.19176C20.9751 7.37445 21.5342 7.37445 22.6525 7.37445H26.3909Z";
const FILE_MARK_TRANSFORM = "translate(14 16) scale(1.12) translate(-14 -16)";
const LARGE_FILE_MARK_TRANSFORM = "translate(14 16) scale(1.22) translate(-14 -16)";
const FOLDER_MARK_TRANSFORM = "translate(14 13.0693) scale(1.12) translate(-14 -13.0693)";
function FileGlyph({ size, className, children, markTransform, muted = false }) {
	return jsxs("svg", {
		width: size,
		height: size,
		className,
		viewBox: "0 0 28 28",
		fill: "none",
		xmlns: "http://www.w3.org/2000/svg",
		"aria-hidden": true,
		children: [
			jsx("path", {
				d: FILE_BODY,
				fill: "currentColor"
			}),
			muted ? jsx("path", {
				d: FILE_FOLD,
				fill: "var(--dsw-static-neutral-400)"
			}) : jsx("path", {
				d: FILE_FOLD,
				fill: "var(--dsw-static-neutral-00)",
				fillOpacity: ".7"
			}),
			children !== void 0 && jsx("g", {
				color: "var(--dsw-static-neutral-00)",
				"data-file-type-mark": true,
				transform: markTransform,
				children
			})
		]
	});
}
function FolderGlyph({ size, className }) {
	return jsxs("svg", {
		width: size,
		height: size,
		className,
		viewBox: "0 0 28 28",
		fill: "none",
		xmlns: "http://www.w3.org/2000/svg",
		"aria-hidden": true,
		children: [jsx("path", {
			d: "M2.80078 10.2112C2.80078 9.52802 2.80078 9.18642 2.85314 8.866C2.98648 8.05 3.36942 7.29538 3.94925 6.70595C4.17694 6.4745 4.45264 6.2728 5.00404 5.86939C5.29197 5.65874 5.43594 5.55342 5.58711 5.46632C5.97089 5.24521 6.39638 5.10618 6.83667 5.05803C7.01011 5.03906 7.18849 5.03906 7.54524 5.03906H11.6543C12.4669 5.03906 12.8732 5.03906 13.2599 5.13697C13.3882 5.16945 13.5143 5.20986 13.6375 5.25795C14.0091 5.40294 14.3398 5.63902 15.0012 6.1112L16.2632 7.01224C16.5526 7.21881 16.6972 7.3221 16.8598 7.38553C16.9137 7.40657 16.9689 7.42425 17.025 7.43846C17.1942 7.4813 17.372 7.4813 17.7275 7.4813H19.8008C22.0506 7.4813 23.1755 7.4813 23.9641 8.05425C24.2188 8.23928 24.4428 8.46326 24.6278 8.71794C25.2008 9.50654 25.2008 10.6315 25.2008 12.8813V18.7283C25.2008 20.9781 25.2008 22.1031 24.6278 22.8917C24.4428 23.1463 24.2188 23.3703 23.9641 23.5554C23.1755 24.1283 22.0506 24.1283 19.8008 24.1283H8.20077C5.95094 24.1283 4.82602 24.1283 4.03743 23.5554C3.78274 23.3703 3.55877 23.1463 3.37373 22.8917C2.80078 22.1031 2.80078 20.9781 2.80078 18.7283V10.2112Z",
			fill: "currentColor"
		}), jsx("g", {
			color: "var(--dsw-static-neutral-00)",
			"data-file-type-mark": true,
			transform: FOLDER_MARK_TRANSFORM,
			children: jsx("path", {
				d: "M6.31445 13.0693H21.6893",
				stroke: "currentColor",
				strokeWidth: "2.38"
			})
		})]
	});
}
function SpreadsheetGlyph({ size, className }) {
	return jsx(FileGlyph, {
		size,
		className,
		children: jsx("path", {
			d: "M14 11.5H11.4C10.5599 11.5 10.1399 11.5 9.81901 11.6635C9.53677 11.8073 9.3073 12.0368 9.16349 12.319C9 12.6399 9 13.0599 9 13.9V16.5M14 11.5H16.6C17.4401 11.5 17.8601 11.5 18.181 11.6635C18.4632 11.8073 18.6927 12.0368 18.8365 12.319C19 12.6399 19 13.0599 19 13.9V16.5M14 11.5V21.5M14 21.5H16.6C17.4401 21.5 17.8601 21.5 18.181 21.3365C18.4632 21.1927 18.6927 20.9632 18.8365 20.681C19 20.3601 19 19.9401 19 19.1V16.5M14 21.5H11.4C10.5599 21.5 10.1399 21.5 9.81901 21.3365C9.53677 21.1927 9.3073 20.9632 9.16349 20.681C9 20.3601 9 19.9401 9 19.1V16.5M19 16.5H9",
			stroke: "currentColor",
			strokeWidth: "1.2"
		})
	});
}
function glyph(type, size, className) {
	switch (type) {
		case "code": return jsxs(FileGlyph, {
			size,
			className,
			children: [
				jsx("path", {
					d: "M10.0053 13.126L7.0236 16.3788C6.96052 16.4476 6.96052 16.5532 7.0236 16.622L10.0053 19.8748",
					stroke: "currentColor",
					strokeWidth: "1.35"
				}),
				jsx("path", {
					d: "M17.9941 13.126L20.9759 16.3788C21.039 16.4476 21.039 16.5532 20.9759 16.622L17.9941 19.8748",
					stroke: "currentColor",
					strokeWidth: "1.35"
				}),
				jsx("path", {
					d: "M15.2652 12.957L12.7344 20.0433",
					stroke: "currentColor",
					strokeWidth: "1.35"
				})
			]
		});
		case "excel": return jsx(SpreadsheetGlyph, {
			size,
			className
		});
		case "folder": return jsx(FolderGlyph, {
			size,
			className
		});
		case "html": return jsx(FileGlyph, {
			size,
			className,
			markTransform: FILE_MARK_TRANSFORM,
			children: jsx("path", {
				fillRule: "evenodd",
				clipRule: "evenodd",
				d: "M13.9994 9.68298C17.212 9.68298 19.8167 12.2872 19.8168 15.4997C19.8168 18.7123 17.2121 21.3171 13.9994 21.3171C10.7869 21.3169 8.18274 18.7122 8.18274 15.4997C8.1829 12.2873 10.787 9.68315 13.9994 9.68298ZM9.26213 16.0247C9.47025 17.9241 10.7936 19.4876 12.5639 20.0463C12.42 19.7977 12.2952 19.5152 12.1879 19.2116C11.885 18.3541 11.693 17.2434 11.6424 16.0247H9.26213ZM16.3565 16.0247C16.3059 17.2434 16.1145 18.3542 15.8116 19.2116C15.7044 19.5151 15.5788 19.7971 15.435 20.0456C17.2054 19.487 18.5293 17.9242 18.7374 16.0247H16.3565ZM12.6938 16.0247C12.7439 17.1459 12.9212 18.1334 13.1784 18.8616C13.332 19.2962 13.503 19.61 13.6686 19.805C13.834 19.9996 13.9473 20.0256 13.9994 20.0258C14.0514 20.0258 14.1651 20.0002 14.331 19.805C14.4966 19.61 14.6676 19.2962 14.8211 18.8616C15.0784 18.1334 15.2557 17.1459 15.3058 16.0247H12.6938ZM13.9994 10.733C13.9473 10.7331 13.834 10.7598 13.6686 10.9545C13.503 11.1494 13.3319 11.4633 13.1784 11.8978C12.903 12.6777 12.7188 13.7545 12.6849 14.9747H15.3147C15.2808 13.7545 15.0966 12.6777 14.8211 11.8978C14.6676 11.4633 14.4965 11.1494 14.331 10.9545C14.1651 10.7593 14.0514 10.733 13.9994 10.733ZM15.5888 11.0051C15.6701 11.1756 15.7444 11.3576 15.8116 11.5478C16.1343 12.4613 16.3308 13.6619 16.3647 14.9747H18.7374C18.5352 13.1307 17.2817 11.6036 15.5888 11.0051ZM12.4101 11.0051C10.7174 11.6037 9.46428 13.1308 9.26213 14.9747H11.6349C11.6688 13.6619 11.8652 12.4613 12.1879 11.5478C12.2551 11.3577 12.3288 11.1756 12.4101 11.0051Z",
				fill: "currentColor"
			})
		});
		case "image": return jsxs(FileGlyph, {
			size,
			className,
			markTransform: FILE_MARK_TRANSFORM,
			children: [
				jsx("path", {
					d: "M10.4212 15.9204C10.5756 15.6558 10.9579 15.6558 11.1123 15.9204L13.6493 20.2696C13.8048 20.5362 13.6125 20.8711 13.3037 20.8711H8.22974C7.92102 20.8711 7.72868 20.5362 7.88423 20.2696L10.4212 15.9204Z",
					fill: "currentColor"
				}),
				jsx("path", {
					d: "M15.4981 13.186C15.6505 12.9117 16.0451 12.9117 16.1975 13.186L20.1368 20.2769C20.2849 20.5435 20.0922 20.8711 19.7872 20.8711H11.9084C11.6034 20.8711 11.4107 20.5435 11.5588 20.2769L15.4981 13.186Z",
					fill: "currentColor"
				}),
				jsx("path", {
					d: "M11.8603 11.3997C11.8603 12.286 11.1418 13.0045 10.2555 13.0045C9.36924 13.0045 8.65076 12.286 8.65076 11.3997C8.65076 10.5134 9.36924 9.79492 10.2555 9.79492C11.1418 9.79492 11.8603 10.5134 11.8603 11.3997Z",
					fill: "currentColor"
				})
			]
		});
		case "markdown": return jsx(FileGlyph, {
			size,
			className,
			markTransform: LARGE_FILE_MARK_TRANSFORM,
			children: jsx("path", {
				d: "M8.7588 19.5V14.6H9.8998L11.9298 17.932H11.3278L13.3018 14.6H14.4428L14.4568 19.5H13.1828L13.1688 16.539H13.3858L11.9088 19.017H11.2928L9.7738 16.539H10.0398V19.5H8.7588ZM15.4375 19.5V14.6H17.7545C18.2958 14.6 18.7718 14.7003 19.1825 14.901C19.5932 15.1017 19.9128 15.384 20.1415 15.748C20.3748 16.112 20.4915 16.546 20.4915 17.05C20.4915 17.5493 20.3748 17.9833 20.1415 18.352C19.9128 18.716 19.5932 18.9983 19.1825 19.199C18.7718 19.3997 18.2958 19.5 17.7545 19.5H15.4375ZM16.8235 18.394H17.6985C17.9785 18.394 18.2212 18.3427 18.4265 18.24C18.6365 18.1327 18.7998 17.9787 18.9165 17.778C19.0332 17.5727 19.0915 17.33 19.0915 17.05C19.0915 16.7653 19.0332 16.5227 18.9165 16.322C18.7998 16.1213 18.6365 15.9697 18.4265 15.867C18.2212 15.7597 17.9785 15.706 17.6985 15.706H16.8235V18.394Z",
				fill: "currentColor"
			})
		});
		case "other": return jsx(FileGlyph, {
			size,
			className,
			muted: true
		});
		case "pdf": return jsx(FileGlyph, {
			size,
			className,
			markTransform: LARGE_FILE_MARK_TRANSFORM,
			children: jsx("path", {
				d: "M6.80616 19.5V14.6H9.04616C9.49416 14.6 9.87916 14.6723 10.2012 14.817C10.5278 14.9617 10.7798 15.1717 10.9572 15.447C11.1345 15.7177 11.2232 16.0397 11.2232 16.413C11.2232 16.7817 11.1345 17.1013 10.9572 17.372C10.7798 17.6427 10.5278 17.8527 10.2012 18.002C9.87916 18.1467 9.49416 18.219 9.04616 18.219H7.57616L8.19216 17.617V19.5H6.80616ZM8.19216 17.764L7.57616 17.127H8.96216C9.2515 17.127 9.46616 17.064 9.60616 16.938C9.75083 16.812 9.82316 16.637 9.82316 16.413C9.82316 16.1843 9.75083 16.007 9.60616 15.881C9.46616 15.755 9.2515 15.692 8.96216 15.692H7.57616L8.19216 15.055V17.764ZM11.8989 19.5V14.6H14.2159C14.7573 14.6 15.2333 14.7003 15.6439 14.901C16.0546 15.1017 16.3743 15.384 16.6029 15.748C16.8363 16.112 16.9529 16.546 16.9529 17.05C16.9529 17.5493 16.8363 17.9833 16.6029 18.352C16.3743 18.716 16.0546 18.9983 15.6439 19.199C15.2333 19.3997 14.7573 19.5 14.2159 19.5H11.8989ZM13.2849 18.394H14.1599C14.4399 18.394 14.6826 18.3427 14.8879 18.24C15.0979 18.1327 15.2613 17.9787 15.3779 17.778C15.4946 17.5727 15.5529 17.33 15.5529 17.05C15.5529 16.7653 15.4946 16.5227 15.3779 16.322C15.2613 16.1213 15.0979 15.9697 14.8879 15.867C14.6826 15.7597 14.4399 15.706 14.1599 15.706H13.2849V18.394ZM17.6821 19.5V14.6H21.5251V15.671H19.0681V19.5H17.6821ZM18.9701 17.82V16.749H21.2311V17.82H18.9701Z",
				fill: "currentColor"
			})
		});
		case "ppt": return jsx(FileGlyph, {
			size,
			className,
			markTransform: LARGE_FILE_MARK_TRANSFORM,
			children: jsx("path", {
				d: "M11.0132 20.5V13.5H14.2132C14.8532 13.5 15.4032 13.6033 15.8632 13.81C16.3299 14.0167 16.6899 14.3167 16.9432 14.71C17.1966 15.0967 17.3232 15.5567 17.3232 16.09C17.3232 16.6167 17.1966 17.0733 16.9432 17.46C16.6899 17.8467 16.3299 18.1467 15.8632 18.36C15.4032 18.5667 14.8532 18.67 14.2132 18.67H12.1132L12.9932 17.81V20.5H11.0132ZM12.9932 18.02L12.1132 17.11H14.0932C14.5066 17.11 14.8132 17.02 15.0132 16.84C15.2199 16.66 15.3232 16.41 15.3232 16.09C15.3232 15.7633 15.2199 15.51 15.0132 15.33C14.8132 15.15 14.5066 15.06 14.0932 15.06H12.1132L12.9932 14.15V18.02Z",
				fill: "currentColor"
			})
		});
		case "video": return jsx(FileGlyph, {
			size,
			className,
			markTransform: FILE_MARK_TRANSFORM,
			children: jsx("path", {
				d: "M17.5 14.634C18.1667 15.0189 18.1667 15.9811 17.5 16.366L11.5 19.8301C10.8333 20.215 10 19.7339 10 18.9641L10 12.0359C10 11.2661 10.8333 10.785 11.5 11.1699L17.5 14.634Z",
				fill: "currentColor"
			})
		});
		case "word": return jsx(FileGlyph, {
			size,
			className,
			markTransform: LARGE_FILE_MARK_TRANSFORM,
			children: jsx("path", {
				d: "M10.5118 20.5L8.24179 13.5H10.2818L12.1918 19.56H11.1618L13.1718 13.5H14.9918L16.8918 19.56H15.9018L17.8718 13.5H19.7618L17.4918 20.5H15.3718L13.7518 15.35H14.3218L12.6318 20.5H10.5118Z",
				fill: "currentColor"
			})
		});
		/* v8 ignore next -- closed-union backstop; only reached if a type is forged */
		default: return assertNever$2(type);
	}
}
/** Closed-union exhaustiveness guard for traditional file artwork. */
/* v8 ignore next 3 -- only reachable when an untyped caller forges a traditional file type */
function assertNever$2(value) {
	throw new Error(`unreachable traditional file type: ${String(value)}`);
}
/**
* Render a decorative file-type glyph for a path or an explicitly resolved kind.
* @param props - Path or kind selection, optional project context, size, and CSS class.
* @returns The category-colored SVG; the caller owns the accessible name and may override
* the color through `--dsh-file-type-icon-color`.
*/
function FileTypeIcon(props) {
	const { size = 28, className } = props;
	const resolvedType = "path" in props ? classifyFileType(props.path, props.context) : props.kind;
	return isCodeFileType(resolvedType) ? jsx(CodeFileIcon, {
		type: resolvedType,
		size,
		className
	}) : glyph(resolvedType, size, cx(FT_CSS.icon, FT_CSS[resolvedType], className));
}

    /* ------------------------------------------------------------------ */
    /* Icons (stroke glyphs on currentColor, host-style)                   */
    /* ------------------------------------------------------------------ */

    function useArtifactStats(binding, changeTurns) {
      const [stats, setStats] = React.useState(null);
      const sessionId = binding ? binding.sessionId : undefined;
      const turns = Array.isArray(changeTurns) ? changeTurns : [];
      const turnsKey = turns.map((turn) => turn.seq).join(",");
      React.useEffect(() => {
        if (sessionId === undefined || turnsKey === "") {
          setStats(null);
          return undefined;
        }
        let cancelled = false;
        const queued = turnsKey.split(",").map((seq, position) => ({ seq: Number(seq), turn: Number(turns[position] ? turns[position].turn : 0) }));
        const load = async () => {
          const cwd = sessionCwd(sessionId);
          const merged = new Map();
          for (let position = 0; position < queued.length; position += 1) {
            const { seq, turn } = queued[position];
            const cacheable = position < queued.length - 1; // the newest turn may still be running
            const summary = await fetchTurnSummary(sessionId, seq, cacheable);
            if (cancelled) return;
            if (summary) {
              summary.files.forEach((file, index) => {
                const key = absPath(cwd, file.path);
                const existing = merged.get(key);
                if (existing) {
                  existing.added += file.added;
                  existing.deleted += file.deleted;
                  existing.binary = existing.binary && file.binary === true;
                  existing.coords = { seq, turn };
                  existing.index = index;
                } else {
                  merged.set(key, {
                    display: file.display,
                    added: file.added,
                    deleted: file.deleted,
                    binary: file.binary === true,
                    oversized: file.oversized === true,
                    coords: { seq, turn },
                    index,
                  });
                }
              });
              setStats(new Map(merged));
            }
          }
        };
        load().catch(() => {});
        return () => {
          cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [sessionId, turnsKey]);
      return stats;
    }

    function svg(size, className, children, viewBox) {
      return h(
        "svg",
        { width: size, height: size, viewBox: viewBox || `0 0 16 16`, fill: "none", "aria-hidden": "true", className },
        ...children
      );
    }

    /* Same artwork as icon.svg, the icon the plugin list and settings show. */
    function OverviewGlyph({ size = 16, className }) {
      return svg(
        size,
        className,
        [
          h("rect", { key: "r", x: 8, y: 8, width: 48, height: 48, rx: 12, stroke: "#565e6d", strokeWidth: 3 }),
          h("path", { key: "l", d: "M20 24h24M20 33h24M20 42h14", stroke: "#247bbf", strokeWidth: 3, strokeLinecap: "round" }),
          h("circle", { key: "c", cx: 43, cy: 42, r: 4, fill: "#2ea36a" }),
        ],
        "0 0 64 64"
      );
    }

    function IconProgress({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M2.5 4.2 4 5.7l2.3-2.4", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
        h("path", { key: "b", d: "M2.5 10.2 4 11.7l2.3-2.4", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
        h("path", { key: "c", d: "M8.6 4.6h5M8.6 10.6h5", stroke: "currentColor", strokeLinecap: "round" }),
      ]);
    }

    function IconArtifact({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M8 1.8 13.6 5v6L8 14.2 2.4 11V5L8 1.8Z", stroke: "currentColor", strokeLinejoin: "round" }),
        h("path", { key: "b", d: "M2.6 5.1 8 8.2l5.4-3.1M8 8.2v5.9", stroke: "currentColor", strokeLinejoin: "round" }),
      ]);
    }

    function IconReference({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M5.8 3.4 2 8l3.8 4.6", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
        h("path", { key: "b", d: "M10.2 3.4 14 8l-3.8 4.6", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
      ]);
    }

    function IconFile({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M9 1.9H4.6c-.7 0-1.2.5-1.2 1.2v9.8c0 .7.5 1.2 1.2 1.2h6.8c.7 0 1.2-.5 1.2-1.2V5.3L9 1.9Z", stroke: "currentColor", strokeLinejoin: "round" }),
        h("path", { key: "b", d: "M8.8 2v3.4h3.4", stroke: "currentColor", strokeLinejoin: "round" }),
      ]);
    }

    function IconMemory({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M3.4 2.5h9.2v11l-4.6-2.6-4.6 2.6v-11Z", stroke: "currentColor", strokeLinejoin: "round" }),
      ]);
    }

    function IconSkill({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M8.8 1.6 3.4 9h4l-.8 5.4L12.6 7h-4.2l.4-5.4Z", stroke: "currentColor", strokeLinejoin: "round" }),
      ]);
    }

    function IconContext({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "m8 2 5.6 3.2L8 8.4 2.4 5.2 8 2Z", stroke: "currentColor", strokeLinejoin: "round" }),
        h("path", { key: "b", d: "m2.4 8.4 5.6 3.2 5.6-3.2", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
        h("path", { key: "c", d: "m2.4 11.2 5.6 3.2 5.6-3.2", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
      ]);
    }

    function IconSession({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M13.8 7.6c0 2.9-2.6 5.2-5.8 5.2-.8 0-1.6-.15-2.3-.4L2.2 13.6l1.3-3A4.9 4.9 0 0 1 2.2 7.6c0-2.9 2.6-5.2 5.8-5.2s5.8 2.3 5.8 5.2Z", stroke: "currentColor", strokeLinejoin: "round" }),
      ]);
    }

    function IconTarget({ size = 16, className }) {
      return svg(size, className, [
        h("circle", { key: "a", cx: 8, cy: 8, r: 5.8, stroke: "currentColor" }),
        h("circle", { key: "b", cx: 8, cy: 8, r: 2.2, fill: "currentColor" }),
      ]);
    }

    function IconChevron({ size = 16, className }) {
      return svg(size, className, [h("path", { key: "a", d: "m5.8 3.6 4.4 4.4-4.4 4.4", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" })]);
    }

    function IconCompact({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M3.2 8h9.6", stroke: "currentColor", strokeLinecap: "round" }),
        h("path", { key: "b", d: "M8 2.4v3.4M6.3 4.1 8 5.8l1.7-1.7", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
        h("path", { key: "c", d: "M8 13.6v-3.4M6.3 11.9 8 10.2l1.7 1.7", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
      ]);
    }

    function IconHistory({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M2.6 8a5.4 5.4 0 1 0 5.4-5.4A5.9 5.9 0 0 0 3.9 4.3L2.6 5.6", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
        h("path", { key: "b", d: "M2.6 2.4v3.2h3.2", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
        h("path", { key: "c", d: "M8 4.9v3.2l2.7 1.5", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
      ]);
    }

    function IconCompare({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M3 5.4h8.2M9.2 3.4l2 2-2 2", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
        h("path", { key: "b", d: "M13 10.6H4.8M6.8 8.6l-2 2 2 2", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
      ]);
    }

    function IconOpenSidebar({ size = 16, className }) {
      return svg(size, className, [
        h("rect", { key: "a", x: 1.9, y: 2.9, width: 12.2, height: 10.2, rx: 2, stroke: "currentColor" }),
        h("path", { key: "b", d: "M9.6 2.9v10.2", stroke: "currentColor" }),
        h("path", { key: "c", d: "M4.6 6.4 6.4 8l-1.8 1.6", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
      ]);
    }

    function IconFilter({ size = 16, className }) {
      return svg(size, className, [
        h("path", { key: "a", d: "M2.6 3.6h10.8L9.2 8.6v4.2l-2.4-1.3V8.6Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
      ]);
    }

    function IconAgent({ size = 16, className }) {
      return svg(size, className, [
        h("circle", { key: "a", cx: 8, cy: 5.4, r: 2.5, stroke: "currentColor" }),
        h("path", { key: "b", d: "M3.4 13c.7-2.2 2.4-3.4 4.6-3.4S12 10.8 12.6 13", stroke: "currentColor", strokeLinecap: "round" }),
      ]);
    }

    function TodoStatusIcon({ status }) {
      if (status === "completed") {
        return svg(15, undefined, [
          h("circle", { key: "a", cx: 7.5, cy: 7.5, r: 6, stroke: "currentColor" }),
          h("path", { key: "b", d: "m4.8 7.6 1.9 1.9 3.6-4", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" }),
        ]);
      }
      if (status === "in_progress") {
        return svg(15, undefined, [
          h("circle", { key: "a", cx: 7.5, cy: 7.5, r: 6, stroke: "currentColor", opacity: 0.22 }),
          h("circle", { key: "b", className: "dsov-todoSpin", cx: 7.5, cy: 7.5, r: 6, stroke: "currentColor", strokeLinecap: "round", strokeDasharray: "9.4 28.3" }),
          h("circle", { key: "c", className: "dsov-todoPulse", cx: 7.5, cy: 7.5, r: 2.2, fill: "currentColor" }),
        ]);
      }
      return svg(15, undefined, [h("circle", { key: "a", cx: 7.5, cy: 7.5, r: 6, stroke: "currentColor" })]);
    }

    function RefIcon({ kind, size }) {
      if (kind === "memory" || kind === "memory-file") return h(IconMemory, { size });
      if (kind === "skill") return h(IconSkill, { size });
      if (kind === "file") return h(IconFile, { size });
      if (kind === "session") return h(IconSession, { size });
      return h(IconContext, { size });
    }

    /* ------------------------------------------------------------------ */
    /* Sections                                                            */
    /* ------------------------------------------------------------------ */

    /** Collapse memory shared by both surfaces for the lifetime of the page. */
    const collapsedSections = new Map();

    /* References ordering, shared by both surfaces and persisted per browser. */
    const REF_SORT_KEY = "dsh.conversationOverview.refSort";
    const REF_SORT_MODES = ["time", "count"];
    const KIND_ORDER = ["memory-file", "memory", "file", "skill", "session", "context"];

    function readStoredRefSort() {
      try {
        const value = globalThis.localStorage ? globalThis.localStorage.getItem(REF_SORT_KEY) : null;
        if (value === "none") return "";
        return REF_SORT_MODES.indexOf(value) !== -1 ? value : "time";
      } catch (_unreadable) {
        return "time";
      }
    }

    const refSortStore = { mode: readStoredRefSort(), listeners: new Set() };

    function setRefSort(mode) {
      const next = mode === "" ? "" : REF_SORT_MODES.indexOf(mode) !== -1 ? mode : undefined;
      if (next === undefined || refSortStore.mode === next) return;
      refSortStore.mode = next;
      try {
        if (globalThis.localStorage) globalThis.localStorage.setItem(REF_SORT_KEY, next === "" ? "none" : next);
      } catch (_unwritable) {
        /* the choice still applies for this page load */
      }
      for (const listener of [...refSortStore.listeners]) listener();
    }

    function subscribeRefSort(listener) {
      refSortStore.listeners.add(listener);
      return () => {
        refSortStore.listeners.delete(listener);
      };
    }

    const readRefSort = () => refSortStore.mode;

    function useRefSort() {
      return React.useSyncExternalStore(subscribeRefSort, readRefSort);
    }

    /* Hide-ubiquitous-refs toggle: refs that appear in (almost) every turn — e.g. the
       per-turn OpenViking memory injection — are noise when reviewing a single turn. */
    const REF_COMMON_KEY = "dsh.conversationOverview.hideCommonRefs";

    function readStoredHideCommon() {
      try {
        return globalThis.localStorage ? globalThis.localStorage.getItem(REF_COMMON_KEY) === "1" : false;
      } catch (_unreadable) {
        return false;
      }
    }

    const refCommonStore = { hidden: readStoredHideCommon(), listeners: new Set() };

    function setHideCommonRefs(hidden) {
      const next = hidden === true;
      if (refCommonStore.hidden === next) return;
      refCommonStore.hidden = next;
      try {
        if (globalThis.localStorage) globalThis.localStorage.setItem(REF_COMMON_KEY, next ? "1" : "0");
      } catch (_unwritable) {
        /* the choice still applies for this page load */
      }
      for (const listener of [...refCommonStore.listeners]) listener();
    }

    function subscribeHideCommon(listener) {
      refCommonStore.listeners.add(listener);
      return () => {
        refCommonStore.listeners.delete(listener);
      };
    }

    const readHideCommon = () => refCommonStore.hidden;

    function useHideCommonRefs() {
      return React.useSyncExternalStore(subscribeHideCommon, readHideCommon);
    }

    /* Type multi-select for the references section; empty selection = every type. */
    const REF_TYPES_KEY = "dsh.conversationOverview.refTypes";

    function readStoredRefTypes() {
      try {
        const raw = globalThis.localStorage ? globalThis.localStorage.getItem(REF_TYPES_KEY) : null;
        if (typeof raw !== "string" || raw === "") return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((kind) => typeof kind === "string" && kind !== "") : [];
      } catch (_unreadable) {
        return [];
      }
    }

    const refTypesStore = { kinds: readStoredRefTypes(), listeners: new Set() };

    function setRefTypes(kinds) {
      const next = Array.isArray(kinds) ? [...new Set(kinds.filter((kind) => typeof kind === "string" && kind !== ""))].sort() : [];
      if (next.join("|") === refTypesStore.kinds.join("|")) return;
      refTypesStore.kinds = next;
      try {
        if (globalThis.localStorage) {
          if (next.length === 0) globalThis.localStorage.removeItem(REF_TYPES_KEY);
          else globalThis.localStorage.setItem(REF_TYPES_KEY, JSON.stringify(next));
        }
      } catch (_unwritable) {
        /* the choice still applies for this page load */
      }
      for (const listener of [...refTypesStore.listeners]) listener();
    }

    function subscribeRefTypes(listener) {
      refTypesStore.listeners.add(listener);
      return () => {
        refTypesStore.listeners.delete(listener);
      };
    }

    const readRefTypes = () => refTypesStore.kinds;

    function useRefTypes() {
      return React.useSyncExternalStore(subscribeRefTypes, readRefTypes);
    }

    /** Display-level type: memory-file rows group with memory refs. */
    function refDisplayType(ref) {
      const kind = isRecord(ref) && typeof ref.kind === "string" ? ref.kind : "";
      return kind === "memory-file" ? "memory" : kind;
    }

    function kindRank(kind) {
      const index = KIND_ORDER.indexOf(kind);
      return index === -1 ? KIND_ORDER.length : index;
    }

    /** Incoming order is newest-first; kind/count modes re-rank, breaking ties by recency. */
    function sortReferences(refs, mode) {
      const byRecency = (left, right) => (right.time || right.seq || 0) - (left.time || left.seq || 0) || (right.seq || 0) - (left.seq || 0);
      if (mode === "count") return refs.slice().sort((left, right) => (right.count || 1) - (left.count || 1) || byRecency(left, right));
      return refs;
    }

    function Section({ id, icon, title, badge, empty, action, children }) {
      const [open, setOpen] = React.useState(() => collapsedSections.get(id) !== true);
      const cfg = useConfig();
      const kids = Array.isArray(children) ? children.filter((child) => child !== null && child !== undefined && child !== false) : children ? [children] : [];
      const toggle = () => {
        const next = !open;
        collapsedSections.set(id, !next);
        setOpen(next);
      };
      return h(
        "section",
        { className: "dsov-section", "data-full": cfg.sectionFullHeight === true ? "true" : "false" },
        h(
          "div",
          { className: "dsov-sectionHead" },
          h(
            "button",
            { type: "button", className: "dsov-sectionToggle", "aria-expanded": open, onClick: toggle },
            h("span", { className: "dsov-chevron", "data-open": open ? "true" : "false" }, h(IconChevron, { size: 13 })),
            h("span", { className: "dsov-sectionIcon" }, icon),
            h("span", { className: "dsov-sectionTitle" }, title),
            badge !== undefined && badge !== null && badge !== "" ? h("span", { className: "dsov-count" }, badge) : null
          ),
          action || null
        ),
        open ? (kids.length > 0 ? h("div", { className: "dsov-secBody" }, kids) : h("div", { className: "dsov-empty" }, empty)) : null
      );
    }

    const TODO_KEYS = {
      pending: "todo.pending",
      in_progress: "todo.in_progress",
      completed: "todo.completed",
    };

    /* Agent-team member phases (tooltip text; status is conveyed by icons). */
    const MEMBER_PHASE_KEYS = {
      provisioning: "team.phase.provisioning",
      active: "team.phase.active",
      inactive: "team.phase.inactive",
      failed: "team.phase.failed",
    };

    const GOAL_PHASE_KEYS = {
      active: "goal.active",
      paused: "goal.paused",
      blocked: "goal.blocked",
      complete: "goal.complete",
    };

    const GOAL_PHASE_TONES = {
      active: "brand",
      paused: "warn",
      blocked: "error",
      complete: "success",
    };

    function ProgressSection({ summary, goal, t, waiting, cfg, asOf }) {
      const fmtTime = (ts) => formatTime(ts, cfg.timeMode, summary.turnStart);
      const timeTitle = (ts) => (cfg.timeMode === "elapsed" ? formatTime(ts) : undefined);
      /* timeline scrubbing: only what already happened at `asOf` is shown */
      const asOfTime = typeof asOf === "number" && asOf > 0 ? asOf : null;
      const pinMilestones = isRecord(cfg) && cfg.stepAnchors === true;
      const inTime = (record) => asOfTime === null || ((record.firstTime || record.time || 0) <= asOfTime);
      /* todo → composer prompt flash */
      const [promptFlash, setPromptFlash] = React.useState(null);
      const flashTimer = React.useRef(undefined);
      /* step → copy summary flash */
      const [stepFlash, setStepFlash] = React.useState(null);
      const copyTimer = React.useRef(undefined);
      /* per-member expansion overrides for the merged team rows */
      const [teamExpanded, setTeamExpanded] = React.useState(null);
      React.useEffect(
        () => () => {
          if (flashTimer.current !== undefined) clearTimeout(flashTimer.current);
          if (copyTimer.current !== undefined) clearTimeout(copyTimer.current);
        },
        []
      );
      const todoPromptOn = !isRecord(cfg) || cfg.todoPrompt !== false;
      const todoPromptTemplate = isRecord(cfg) && typeof cfg.todoPromptTemplate === "string" ? cfg.todoPromptTemplate : "";
      const onTodoClick = (index, content) => {
        if (!todoPromptOn) return;
        const result = insertIntoComposer(rerunPrompt(index + 1, content, todoPromptTemplate));
        if (flashTimer.current !== undefined) clearTimeout(flashTimer.current);
        setPromptFlash({ index, state: result });
        flashTimer.current = setTimeout(() => {
          flashTimer.current = undefined;
          setPromptFlash(null);
        }, 1600);
      };
      const onStepClick = (step) => {
        const detail = typeof step.full === "string" && step.full !== "" ? step.full : typeof step.detail === "string" && step.detail !== "" ? step.detail : typeof step.name === "string" ? step.name : "";
        if (detail === "") return;
        const key = typeof step.callId === "string" && step.callId !== "" ? step.callId : `${step.name}|${step.seq}`;
        const setFlash = (state) => {
          setStepFlash({ key, state });
          if (copyTimer.current !== undefined) clearTimeout(copyTimer.current);
          copyTimer.current = setTimeout(() => {
            copyTimer.current = undefined;
            setStepFlash(null);
          }, 1200);
        };
        let handled = false;
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard !== undefined && typeof navigator.clipboard.writeText === "function") {
            handled = true;
            navigator.clipboard.writeText(detail).then(
              () => setFlash("ok"),
              () => setFlash("err")
            );
          }
        } catch {
          handled = false;
        }
        if (!handled) setFlash("err");
      };
      /* steps: newest-first window; keep the evicted bottom row as a fading ghost */
      const stepsRaw = Array.isArray(summary.steps) ? summary.steps.filter((step) => isRecord(step)) : [];
      const stepsAllRaw = Array.isArray(summary.stepsAll) ? summary.stepsAll.filter((step) => isRecord(step)) : [];
      const stepAt = (step) => asOfTime === null || (typeof step.time === "number" ? step.time <= asOfTime : true);
      /* a step whose result landed after the scrub point reads as still running */
      const stepClamped = (step) => {
        if (asOfTime === null || step.done !== true) return step;
        const end = typeof step.endTime === "number" ? step.endTime : typeof step.time === "number" ? step.time : 0;
        return end <= asOfTime ? step : { ...step, done: false, error: false, endTime: undefined };
      };
      const stepsAll = stepsAllRaw.filter(stepAt).map(stepClamped);
      /* while scrubbing, rebuild the "latest 6" window as it looked at time T:
         the live window sits near the turn end, so filtering it by T would empty
         the section mid-drag even though earlier steps already happened */
      const steps =
        asOfTime === null
          ? stepsRaw.filter(stepAt).map(stepClamped)
          : (() => {
              const visible = stepsAllRaw.filter(stepAt);
              const recent = visible.slice(-6);
              const anchors = stepsRaw.filter(
                (step) => stepAt(step) && typeof step.teamKey === "string" && step.milestone !== true && recent.indexOf(step) === -1
              );
              return [...anchors, ...recent].map(stepClamped);
            })();
      const [ghost, setGhost] = React.useState(null);
      const [stepsExpanded, setStepsExpanded] = React.useState(false);
      const ghostTimer = React.useRef(undefined);
      const prevSteps = React.useRef([]);
      const prevScope = React.useRef(summary.scope);
      /* enter animation only for rows that arrive while mounted; first paint per scope is silent */
      const stepKeyOf = (step, index) => (typeof step.callId === "string" && step.callId !== "" ? `step-${step.callId}` : `step-idx-${index}`);
      const milestoneKeyOf = (step) => (typeof step.callId === "string" && step.callId !== "" ? step.callId : `${step.name}|${step.seq}`);
      const seenSteps = React.useRef(null);
      /* full retained history for the expander: anchors outside the window + the whole bucket */
      const allStepIds = new Set(stepsAll.map((step) => step.callId).filter((id) => typeof id === "string"));
      const anchorExtras = steps.filter((step) => typeof step.callId === "string" && !allStepIds.has(step.callId));
      const expandedSteps = [...anchorExtras, ...stepsAll];
      const canExpand = expandedSteps.length > steps.length;
      const stepsOpen = stepsExpanded && canExpand;
      /* cfg.stepAnchors pins compaction/approval/failure steps above the window */
      const milestoneExtras = [];
      if (pinMilestones) {
        const baseSteps = stepsOpen ? expandedSteps : steps;
        const baseKeys = new Set(baseSteps.map(milestoneKeyOf));
        const candidates = [
          ...(Array.isArray(summary.milestones) ? summary.milestones.filter((step) => isRecord(step) && step.milestone === true) : []),
          ...stepsAll.filter((step) => step.error === true),
        ];
        for (const candidate of candidates) {
          if (!stepAt(candidate)) continue;
          const key = milestoneKeyOf(candidate);
          if (baseKeys.has(key)) continue;
          baseKeys.add(key);
          milestoneExtras.push(stepClamped(candidate));
        }
        milestoneExtras.sort((left, right) => (left.time || 0) - (right.time || 0));
      }
      const displaySteps = milestoneExtras.length > 0 ? [...milestoneExtras, ...(stepsOpen ? expandedSteps : steps)] : stepsOpen ? expandedSteps : steps;
      if (seenSteps.current === null || seenSteps.current.scope !== summary.scope) {
        seenSteps.current = { scope: summary.scope, keys: new Set(displaySteps.map(stepKeyOf)) };
      }
      React.useEffect(
        () => () => {
          if (ghostTimer.current !== undefined) clearTimeout(ghostTimer.current);
        },
        []
      );
      React.useEffect(() => {
        const previous = prevSteps.current;
        prevSteps.current = steps;
        if (prevScope.current !== summary.scope) {
          prevScope.current = summary.scope;
          return;
        }
        if (asOfTime !== null || previous.length === 0) return;
        const currentIds = new Set(steps.map((step) => step.callId));
        const dropped = previous.filter((step) => typeof step.callId === "string" && !currentIds.has(step.callId));
        if (dropped.length === 0) return;
        setGhost(dropped[dropped.length - 1]);
        if (ghostTimer.current !== undefined) clearTimeout(ghostTimer.current);
        ghostTimer.current = setTimeout(() => {
          ghostTimer.current = undefined;
          setGhost(null);
        }, 400);
      }, [steps]);
      /* team data + todos drive both the merged list and the step nesting */
      const team = isRecord(summary.team) ? summary.team : null;
      const members = team && Array.isArray(team.members) ? team.members.filter((member) => isRecord(member) && inTime(member)) : [];
      const teamTasks = team && Array.isArray(team.tasks) ? team.tasks.filter((task) => isRecord(task) && inTime(task)) : [];
      const subagents = team && Array.isArray(team.subagents) ? team.subagents.filter((sub) => isRecord(sub) && inTime(sub)) : [];
      const todoHistory = Array.isArray(summary.todoHistory) ? summary.todoHistory : [];
      let todos = Array.isArray(summary.todos) ? summary.todos : null;
      if (asOfTime !== null) {
        /* mirror buildState's turn scoping: a turn without its own todos must
           not inherit an earlier turn's snapshot while scrubbing */
        const scopeText = typeof summary.scope === "string" ? summary.scope : "";
        const scopedTurn = scopeText.startsWith("turn:")
          ? Number.parseInt(scopeText.slice(5), 10)
          : scopeText === "latest" && Number.isFinite(summary.latestTurn)
            ? summary.latestTurn
            : null;
        let snapshot = null;
        for (const record of todoHistory) {
          if (!isRecord(record) || !Array.isArray(record.todos)) continue;
          if (scopedTurn !== null && record.turn !== scopedTurn) continue;
          if ((record.time || 0) <= asOfTime) snapshot = record;
        }
        todos = snapshot !== null ? snapshot.todos : null;
      }
      const hasTodos = todos !== null && todos.length > 0;
      const hasTeam = members.length + teamTasks.length + subagents.length > 0;
      const showSteps = !hasTodos && steps.length > 0;
      const flashOf = (key) => (stepFlash !== null && isRecord(stepFlash) && stepFlash.key === key ? stepFlash.state : null);
      const overrideOf = (key, fallback) => {
        const stored = teamExpanded !== null && isRecord(teamExpanded) ? teamExpanded[key] : undefined;
        return typeof stored === "boolean" ? stored : fallback;
      };
      const toggleKey = (key, next) => setTeamExpanded({ ...(teamExpanded !== null && isRecord(teamExpanded) ? teamExpanded : {}), [key]: next });
      const ownedBy = (id) => teamTasks.filter((task) => task.ownerId === id);
      const taskRow = (task, depth) => {
        const status = TODO_KEYS[task.status] ? task.status : "pending";
        const blocked = Array.isArray(task.blockedBy) ? task.blockedBy.length : 0;
        const flash = flashOf(`teamtask-${task.id}`);
        const titleParts = [task.subject];
        if (task.description !== "") titleParts.push(task.description);
        titleParts.push(blocked > 0 ? `${t(TODO_KEYS[status])} · ${t("team.blocked", { n: blocked })}` : t(TODO_KEYS[status]));
        return h(
          "div",
          {
            className: "dsov-todo dsov-task",
            key: `task-${task.id}`,
            "data-status": status,
            "data-depth": depth > 0 ? String(depth) : undefined,
            "data-flash": flash === "ok" ? "ok" : flash === "err" ? "err" : undefined,
            title: titleParts.join("\n\n"),
            onClick: () => onStepClick({ callId: `teamtask-${task.id}`, name: task.subject, full: task.subject, seq: task.seq }),
          },
          h("span", { className: "dsov-todoIcon", "data-status": status }, h(TodoStatusIcon, { status })),
          h("span", { className: "dsov-taskSubject" }, task.subject),
          h("span", { className: "dsov-time", title: timeTitle(task.time) }, fmtTime(task.time))
        );
      };
      const subRow = (sub, depth) => {
        const flash = flashOf(`subagent-${sub.childId}`);
        return h(
          "div",
          {
            className: "dsov-todo dsov-subagent",
            key: `subagent-${sub.childId}`,
            "data-depth": depth > 0 ? String(depth) : undefined,
            "data-flash": flash === "ok" ? "ok" : flash === "err" ? "err" : undefined,
            title: sub.label !== "" ? sub.label : sub.childId,
            onClick: () => onStepClick({ callId: `subagent-${sub.childId}`, name: sub.label, full: sub.label !== "" ? sub.label : sub.childId, seq: sub.seq }),
          },
          h("span", { className: "dsov-todoIcon dsov-agentIcon" }, h(IconAgent, { size: 14 })),
          h("span", { className: "dsov-memberName" }, sub.label !== "" ? sub.label : sub.childId),
          sub.mode !== "" ? h("span", { className: "dsov-badge", "data-tone": "quiet" }, sub.mode) : null,
          h("span", { className: "dsov-time", title: timeTitle(sub.time) }, fmtTime(sub.time))
        );
      };
      /* members and subagents always read as agents: person icon, tinted red on failure */
      const memberIcon = (member, owned) => {
        const phase = typeof member.phase === "string" ? member.phase : "";
        if (phase === "failed") {
          return h("span", { className: "dsov-todoIcon dsov-agentIcon", "data-status": "failed" }, h(IconAgent, { size: 14 }));
        }
        return h("span", { className: "dsov-todoIcon dsov-agentIcon" }, h(IconAgent, { size: 14 }));
      };
      const memberRow = (member, depth, expandable, open) => {
        const owned = ownedBy(member.id);
        const phase = typeof member.phase === "string" ? member.phase : "";
        const titleParts = [];
        if (member.description !== "") titleParts.push(member.description);
        if (MEMBER_PHASE_KEYS[phase]) titleParts.push(t(MEMBER_PHASE_KEYS[phase]));
        return h(
          "div",
          {
            className: "dsov-todo dsov-member",
            key: `member-${member.id}`,
            "data-depth": depth > 0 ? String(depth) : undefined,
            "data-expandable": expandable ? "true" : "false",
            "data-open": expandable ? (open ? "true" : "false") : undefined,
            title: titleParts.length > 0 ? titleParts.join(" · ") : member.name,
            onClick: expandable ? () => toggleKey(`member:${member.id}`, !open) : undefined,
          },
          expandable ? h("span", { className: "dsov-chevron", "data-open": open ? "true" : "false" }, h(IconChevron, { size: 11 })) : null,
          memberIcon(member, owned),
          h("span", { className: "dsov-memberName" }, member.name),
          h("span", { className: "dsov-memberDesc" }, member.description),
          h("span", { className: "dsov-time", title: timeTitle(member.time) }, fmtTime(member.time))
        );
      };
      /* attach team records under their creating step (steps view only) */
      const consumedMembers = new Set();
      const consumedTasks = new Set();
      const consumedSubs = new Set();
      /* delegates matched to a todo render nested under it and skip the flat tail */
      const todoAttachments = hasTodos && hasTeam ? planTodoAttachments(todos, members, teamTasks, subagents) : new Map();
      for (const list of todoAttachments.values()) {
        for (const item of list) {
          if (item.kind === "member") {
            consumedMembers.add(item.record.id);
            item.owned.forEach((task) => consumedTasks.add(task.id));
          } else if (item.kind === "sub") {
            consumedSubs.add(item.record.childId);
          } else {
            consumedTasks.add(item.record.id);
          }
        }
      }
      const stepAttachments = new Map();
      if (showSteps && hasTeam) {
        displaySteps.forEach((step, index) => {
          const teamKey = typeof step.teamKey === "string" ? step.teamKey : "";
          if (teamKey === "" || typeof step.name !== "string") return;
          const attached = [];
          if (step.name === "spawn_teammate") {
            const member = members.find((candidate) => candidate.name === teamKey && !consumedMembers.has(candidate.id));
            if (member !== undefined) {
              consumedMembers.add(member.id);
              const phase = typeof member.phase === "string" ? member.phase : "";
              attached.push({ row: memberRow(member, 1, false, false), unfinished: phase === "provisioning" || phase === "active" });
              ownedBy(member.id).forEach((task) => {
                if (consumedTasks.has(task.id)) return;
                consumedTasks.add(task.id);
                attached.push({ row: taskRow(task, 2), unfinished: task.status !== "completed" });
              });
            }
          } else if (step.name === "subagent" || step.name === "subagent_fork") {
            const sub = subagents.find((candidate) => (candidate.label === teamKey || candidate.childId === teamKey) && !consumedSubs.has(candidate.childId));
            if (sub !== undefined) {
              consumedSubs.add(sub.childId);
              attached.push({ row: subRow(sub, 1), unfinished: false });
            }
          } else if (step.name === "team_task_create") {
            /* owned tasks nest under their member instead; only unowned tasks attach here */
            const task = teamTasks.find(
              (candidate) =>
                candidate.subject === teamKey &&
                !consumedTasks.has(candidate.id) &&
                !(typeof candidate.ownerId === "string" && members.some((member) => member.id === candidate.ownerId))
            );
            if (task !== undefined) {
              consumedTasks.add(task.id);
              attached.push({ row: taskRow(task, 1), unfinished: task.status !== "completed" });
            }
          }
          if (attached.length > 0) stepAttachments.set(stepKeyOf(step, index), attached);
        });
      }
      /* records not attached to a visible step render flat in the list */
      const pushFlatTeam = (target) => {
        teamTasks.forEach((task) => {
          if (consumedTasks.has(task.id)) return;
          const ownerKnown = typeof task.ownerId === "string" && members.some((member) => member.id === task.ownerId);
          if (ownerKnown) return;
          target.push(taskRow(task, 0));
        });
        members.forEach((member) => {
          if (consumedMembers.has(member.id)) return;
          const owned = ownedBy(member.id).filter((task) => !consumedTasks.has(task.id));
          const expandable = owned.length > 0;
          const phase = typeof member.phase === "string" ? member.phase : "";
          const open = expandable ? overrideOf(`member:${member.id}`, owned.some((task) => task.status !== "completed") || phase === "provisioning") : false;
          target.push(memberRow(member, 0, expandable, open));
          if (expandable && open) owned.forEach((task) => target.push(taskRow(task, 1)));
        });
        subagents.forEach((sub) => {
          if (consumedSubs.has(sub.childId)) return;
          target.push(subRow(sub, 0));
        });
      };
      const stepRow = (step, key, extraProps, isWaiting) => {
        const stepRunning = step.done !== true;
        const failed = step.error === true;
        const waitingRow = isWaiting === true && stepRunning && !failed;
        const detail = typeof step.detail === "string" && step.detail !== "" ? step.detail : "";
        const full = typeof step.full === "string" && step.full !== "" ? step.full : detail !== "" ? detail : typeof step.name === "string" ? step.name : "";
        const flash = stepFlash !== null && isRecord(stepFlash) && stepFlash.key === (typeof step.callId === "string" && step.callId !== "" ? step.callId : `${step.name}|${step.seq}`) ? stepFlash.state : null;
        const attached = stepAttachments.get(key);
        const expandable = Array.isArray(attached) && attached.length > 0;
        const open = expandable ? overrideOf(`step:${key}`, attached.some((item) => item.unfinished)) : false;
        const row = h(
          "div",
          {
            className: "dsov-step",
            key,
            "data-error": failed ? "true" : "false",
            "data-waiting": waitingRow ? "true" : "false",
            "data-flash": flash === "ok" ? "ok" : flash === "err" ? "err" : undefined,
            title: full === "" ? undefined : waitingRow ? `${t("progress.waiting")} · ${full}` : full,
            ...(extraProps === undefined ? {} : extraProps),
            onClick: () => onStepClick(step),
          },
          expandable
            ? h(
                "span",
                {
                  className: "dsov-chevron dsov-stepChevron",
                  "data-open": open ? "true" : "false",
                  title: t(open ? "progress.collapseTeam" : "progress.expandTeam"),
                  onClick: (event) => {
                    event.stopPropagation();
                    toggleKey(`step:${key}`, !open);
                  },
                },
                h(IconChevron, { size: 11 })
              )
            : null,
          step.name === "compact-checkpoint"
            ? h("span", { className: "dsov-todoIcon dsov-compactIcon" }, h(IconCompact, { size: 15 }))
            : waitingRow
            ? h(
                "span",
                { className: "dsov-todoIcon", "data-status": "waiting" },
                h(
                  "svg",
                  { width: 15, height: 15, viewBox: "0 0 15 15", fill: "none", "aria-hidden": "true" },
                  h("circle", { cx: 7.5, cy: 7.5, r: 6, stroke: "currentColor", strokeWidth: 1.3, opacity: 0.45 }),
                  h("circle", { cx: 7.5, cy: 7.5, r: 2.4, fill: "currentColor", className: "dsov-todoPulse" })
                )
              )
            : h("span", { className: "dsov-todoIcon", "data-status": stepRunning ? "in_progress" : "completed" }, h(TodoStatusIcon, { status: stepRunning ? "in_progress" : "completed" })),
          h(
            "span",
            { className: "dsov-stepName" },
            step.name === "compact-checkpoint" ? t("step.compact") : step.name === "approval" ? t("step.approval") : typeof step.name === "string" ? step.name : ""
          ),
          h("span", { className: "dsov-stepDetail" }, detail),
          h("span", { className: "dsov-time", title: timeTitle(typeof step.endTime === "number" ? step.endTime : step.time) }, fmtTime(typeof step.endTime === "number" ? step.endTime : step.time))
        );
        return expandable && open ? [row, ...attached.map((item) => item.row)] : row;
      };
      const pushStepRow = (target, step, key, extraProps, isWaiting) => {
        const rendered = stepRow(step, key, extraProps, isWaiting);
        if (Array.isArray(rendered)) target.push(...rendered);
        else target.push(rendered);
      };
      const kids = [];
      if (goal) {
        const phase = typeof goal.phase === "string" ? goal.phase : "";
        kids.push(
          h(
            "div",
            { className: "dsov-goal", key: "goal" },
            h("span", { className: "dsov-goalIcon" }, h(IconTarget, { size: 15 })),
            h("span", { className: "dsov-goalObjective" }, goal.objective),
            h("span", { className: "dsov-badge", "data-tone": GOAL_PHASE_TONES[phase] ?? "idle" }, GOAL_PHASE_KEYS[phase] ? t(GOAL_PHASE_KEYS[phase]) : phase || "—")
          )
        );
      }
      if (hasTodos) {
        const total = todos.length;
        const done = todos.filter((item) => item.status === "completed").length;
        kids.push(
          h(
            "div",
            { className: "dsov-progress", key: "bar" },
            h("div", { className: "dsov-progressTrack" }, h("div", { className: "dsov-progressFill", style: { width: `${Math.round((done / total) * 100)}%` } })),
            h("div", { className: "dsov-progressMeta" }, t("progress.counts", { completed: done, total }))
          )
        );
        const todoRows = [];
        todos.forEach((todo, index) => {
          const status = TODO_KEYS[todo.status] ? todo.status : "pending";
          const flash = promptFlash !== null && isRecord(promptFlash) && promptFlash.index === index ? promptFlash.state : null;
          const title = !todoPromptOn
            ? todo.content
            : flash === "inserted"
              ? t("progress.todoInserted")
              : flash === "copied"
                ? t("progress.todoCopied")
                : flash === "failed"
                  ? t("progress.todoFailed")
                  : t("progress.todoHint");
          const attached = todoAttachments.get(index);
          const expandable = Array.isArray(attached) && attached.length > 0;
          const open = expandable
            ? overrideOf(
                `todo:${index}`,
                attached.some((item) =>
                  item.kind === "task"
                    ? item.record.status !== "completed"
                    : item.kind === "member"
                      ? item.record.phase === "provisioning" || item.record.phase === "active" || item.owned.some((task) => task.status !== "completed")
                      : false
                )
              )
            : false;
          todoRows.push(
            h(
              "div",
              {
                className: "dsov-todo",
                key: `todo-${index}`,
                "data-status": status,
                "data-flash": flash === "inserted" || flash === "copied" ? "ok" : flash === "failed" ? "err" : undefined,
                "data-expandable": expandable ? "true" : undefined,
                "data-open": expandable ? (open ? "true" : "false") : undefined,
                role: "button",
                tabIndex: todoPromptOn ? 0 : undefined,
                title,
                onClick: expandable ? () => toggleKey(`todo:${index}`, !open) : undefined,
                onDoubleClick: () => onTodoClick(index, todo.content),
                onKeyDown: (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onTodoClick(index, todo.content);
                  }
                },
              },
              h(
                "span",
                { className: "dsov-todoIconSlot" },
                h("span", { className: "dsov-todoIcon", "data-status": status }, h(TodoStatusIcon, { status })),
                expandable
                  ? h(
                      "span",
                      {
                        className: "dsov-chevron dsov-todoChevron",
                        "data-open": open ? "true" : "false",
                        title: t(open ? "progress.collapseTeam" : "progress.expandTeam"),
                        onClick: (event) => {
                          event.stopPropagation();
                          toggleKey(`todo:${index}`, !open);
                        },
                      },
                      h(IconChevron, { size: 11 })
                    )
                  : null
              ),
              h("span", { className: "dsov-todoText" }, todo.content),
              h("span", { className: "dsov-todoStatus" }, t(TODO_KEYS[status]))
            )
          );
          if (expandable && open) {
            attached.forEach((item) => {
              if (item.kind === "member") {
                const memberExpandable = item.owned.length > 0;
                const memberOpen = memberExpandable ? overrideOf(`member:${item.record.id}`, item.owned.some((task) => task.status !== "completed")) : false;
                todoRows.push(memberRow(item.record, 1, memberExpandable, memberOpen));
                if (memberExpandable && memberOpen) item.owned.forEach((task) => todoRows.push(taskRow(task, 2)));
              } else if (item.kind === "sub") {
                todoRows.push(subRow(item.record, 1));
              } else {
                todoRows.push(taskRow(item.record, 1));
              }
            });
          }
        });
        kids.push(h("div", { className: "dsov-todos", key: "todos" }, todoRows));
      }
      if (hasTeam && !showSteps) pushFlatTeam(kids);
      if (showSteps) {
        const markWaiting = waiting === true && summary.scope === "latest";
        let waitingIndex = -1;
        if (markWaiting) {
          for (let index = displaySteps.length - 1; index >= 0; index -= 1) {
            if (displaySteps[index].done !== true && displaySteps[index].error !== true) {
              waitingIndex = index;
              break;
            }
          }
        }
        const rows = [];
        let freshCount = 0;
        displaySteps.forEach((step, index) => {
          const key = stepKeyOf(step, index);
          const fresh = asOfTime === null && !seenSteps.current.keys.has(key);
          if (fresh) {
            seenSteps.current.keys.add(key);
            freshCount += 1;
          }
          pushStepRow(rows, step, key, fresh ? { "data-enter": "true", style: { animationDelay: `${(freshCount - 1) * 45}ms` } } : undefined, index === waitingIndex);
        });
        if (ghost !== null && isRecord(ghost) && !stepsOpen) {
          pushStepRow(rows, ghost, `ghost-${ghost.callId}`, { "data-exit": "true" }, false);
        }
        if (hasTeam) pushFlatTeam(rows);
        kids.push(
          h(
            "div",
            { className: "dsov-stepsHead", key: "stepsHead" },
            h("span", null, t(stepsOpen ? "progress.allSteps" : "progress.recentSteps")),
            canExpand
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "dsov-moreSteps",
                    title: stepsOpen ? t("progress.hideEarlierSteps") : t("progress.moreStepsCount", { n: expandedSteps.length - steps.length }),
                    onClick: () => setStepsExpanded(!stepsOpen),
                  },
                  t(stepsOpen ? "progress.hideEarlierSteps" : "progress.showEarlierSteps"),
                  h(IconHistory, { size: 12, className: "dsov-moreIcon" })
                )
              : null
          )
        );
        kids.push(h("div", { className: "dsov-steps", key: "steps" }, rows));
      }
      return h(Section, { id: "progress", icon: h(IconProgress, { size: 15 }), title: t("section.progress"), empty: t(summary.scope === "all" ? "progress.empty" : "progress.emptyTurn") }, kids);
    }

    function ArtifactsSection({ summary, t, binding, stats, asOf }) {
      const cfg = useConfig();
      const asOfTime = typeof asOf === "number" && asOf > 0 ? asOf : null;
      const visibleArtifacts = asOfTime === null ? summary.artifacts : summary.artifacts.filter((artifact) => (artifact.firstTime || artifact.time || 0) <= asOfTime);
      const fmtTime = (ts) => formatTime(ts, cfg.timeMode, summary.turnStart);
      const timeTitle = (ts) => (cfg.timeMode === "elapsed" ? formatTime(ts) : undefined);
      const sessionId = binding ? binding.sessionId : undefined;
      const cwd = sessionCwd(sessionId);
      const canFileMenu = hostSessionRemote() !== null;
      const [fileMenu, setFileMenu] = React.useState(null);
      React.useEffect(() => {
        if (fileMenu === null) return undefined;
        const close = () => setFileMenu(null);
        const onKey = (event) => {
          if (event.key === "Escape") close();
        };
        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
          document.removeEventListener("mousedown", close);
          document.removeEventListener("keydown", onKey);
          window.removeEventListener("scroll", close, true);
          window.removeEventListener("resize", close);
        };
      }, [fileMenu]);
      const turns = summary.changeTurns;
      const latest = turns.length > 0 ? turns[turns.length - 1] : null;
      const action =
        latest && latest.turn >= 1
          ? h(
              "button",
              { type: "button", className: "dsov-headAction", onClick: () => openChangesReview(sessionId, latest) },
              h(IconCompare, { size: 13 }),
              t("artifacts.viewAll")
            )
          : null;
      const rows = visibleArtifacts.map((artifact, index) => {
        const stat = stats ? stats.get(absPath(cwd, artifact.path)) : undefined;
        const showCounts = stat !== undefined && !stat.binary && !stat.oversized && (stat.added > 0 || stat.deleted > 0);
        const isMemory = typeof artifact.path === "string" && artifact.path.startsWith("viking://");
        return h(
          "button",
          {
            type: "button",
            className: "dsov-row",
            key: `${artifact.path}#${index}`,
            title: artifact.description ? `${artifact.path} — ${artifact.description}` : artifact.path,
            onClick: () => openArtifact(binding, artifact, stats),
            onContextMenu:
              canFileMenu && !isMemory
                ? (event) => {
                    event.preventDefault();
                    setFileMenu({ x: event.clientX, y: event.clientY, path: absPath(cwd, artifact.path) });
                  }
                : undefined,
          },
          h("span", { className: "dsov-fileIcon" }, h(FileTypeIcon, { path: artifact.path, size: 20 })),
          h("span", { className: "dsov-artifactName" }, basename(artifact.path)),
          showCounts
            ? h(
                "span",
                { className: "dsov-counts" },
                stat.added > 0 ? h("span", { className: "dsov-added" }, `+${stat.added}`) : null,
                stat.deleted > 0 ? h("span", { className: "dsov-deleted" }, `-${stat.deleted}`) : null
              )
            : stat !== undefined && (stat.binary || stat.oversized)
              ? h("span", { className: "dsov-badge", "data-tone": "quiet" }, t("artifact.binary"))
              : null,
          isMemory ? h("span", { className: "dsov-badge", "data-tone": "quiet" }, t("artifact.memory")) : null,
          artifact.presented ? h("span", { className: "dsov-badge", "data-tone": "brand" }, t("artifact.presented")) : null,
          h("span", { className: "dsov-rowTail" }, h("span", { className: "dsov-time", title: timeTitle(artifact.time) }, fmtTime(artifact.time)))
        );
      });
      if (fileMenu !== null) rows.push(h(ArtifactFileMenu, { key: "dsov-file-menu", menu: fileMenu, t, onClose: () => setFileMenu(null) }));
      return h(
        Section,
        {
          id: "artifacts",
          icon: h(IconArtifact, { size: 15 }),
          title: t("section.artifacts"),
          badge: visibleArtifacts.length > 0 ? String(visibleArtifacts.length) : undefined,
          empty: t("artifacts.empty"),
          action,
        },
        rows
      );
    }

    const PRODUCER_KEYS = {
      "runtime-context": "reference.producer.runtimeContext",
      "skill-catalog": "reference.producer.skillCatalog",
      "agent-instructions": "reference.producer.agentInstructions",
    };

    const KIND_KEYS = {
      context: "reference.kind.context",
      memory: "reference.kind.memory",
      "memory-file": "reference.kind.memory",
      skill: "reference.kind.skill",
      file: "reference.kind.file",
      session: "reference.kind.session",
    };

    function refTitle(ref, t) {
      if (ref.kind === "context" && typeof ref.producer === "string") {
        const key = PRODUCER_KEYS[ref.producer];
        if (key) return t(key);
      }
      return ref.label || (KIND_KEYS[ref.kind] ? t(KIND_KEYS[ref.kind]) : "");
    }

    /* Multi-select dropdown filtering references by display type; menu stays open while toggling. */
    function RefTypeFilter({ types, selected, label, t }) {
      const [open, setOpen] = React.useState(false);
      const rootRef = React.useRef(null);
      React.useEffect(() => {
        if (!open || typeof document === "undefined") return undefined;
        const onDocDown = (event) => {
          const root = rootRef.current;
          if (root && event.target instanceof Node && !root.contains(event.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDocDown, true);
        return () => document.removeEventListener("pointerdown", onDocDown, true);
      }, [open]);
      const toggle = (kind) => {
        if (selected.indexOf(kind) === -1) setRefTypes([...selected, kind]);
        else setRefTypes(selected.filter((item) => item !== kind));
      };
      return h(
        "div",
        { className: "dsov-typeFilter", ref: rootRef },
        h(
          "button",
          {
            type: "button",
            className: "dsov-filterBtn",
            "data-active": selected.length > 0 ? "true" : "false",
            "aria-haspopup": "menu",
            "aria-expanded": open === true,
            title: t("reference.types.title"),
            onClick: () => setOpen(!open),
          },
          t("reference.types"),
          selected.length > 0 ? h("span", { className: "dsov-typeCount" }, String(selected.length)) : null,
          h("span", { className: "dsov-set-caret", "data-open": open === true ? "true" : "false" }, h(IconChevron, { size: 10 }))
        ),
        open === true
          ? h(
              "div",
              { className: "dsov-set-menu dsov-typeMenu", role: "menu" },
              h(
                "button",
                {
                  type: "button",
                  role: "menuitem",
                  className: "dsov-set-menuItem",
                  "data-selected": selected.length === 0 ? "true" : "false",
                  onClick: () => {
                    setRefTypes([]);
                    setOpen(false);
                  },
                },
                h("span", { className: "dsov-typeCheck", "aria-hidden": "true" }, selected.length === 0 ? "✓" : ""),
                t("reference.types.all")
              ),
              types.map((kind) =>
                h(
                  "button",
                  {
                    type: "button",
                    role: "menuitemcheckbox",
                    key: kind,
                    className: "dsov-set-menuItem",
                    "aria-checked": selected.indexOf(kind) !== -1,
                    "data-selected": selected.indexOf(kind) !== -1 ? "true" : "false",
                    onClick: () => toggle(kind),
                  },
                  h("span", { className: "dsov-typeCheck", "aria-hidden": "true" }, selected.indexOf(kind) !== -1 ? "✓" : ""),
                  label(kind)
                )
              )
            )
          : null
      );
    }

    /** Ref tile: viking rows get file/folder icons, other kinds keep their type icon. */
    function refTile(ref) {
      if (ref.kind === "file") return h(FileTypeIcon, { path: ref.label, size: 18 });
      if ((ref.kind === "memory-file" || ref.kind === "skill") && typeof ref.uri === "string" && isVikingUri(ref.uri)) {
        return vikingIsDir(ref.uri) ? h(FileTypeIcon, { kind: "folder", size: 18 }) : h(FileTypeIcon, { path: ref.uri, size: 18 });
      }
      return h(RefIcon, { kind: ref.kind, size: 14 });
    }

    function ReferencesSection({ summary, t, sessionId, asOf }) {
      const cfg = useConfig();
      const asOfTime = typeof asOf === "number" && asOf > 0 ? asOf : null;
      const allRefs = asOfTime === null ? summary.references : summary.references.filter((ref) => (ref.firstTime || ref.time || 0) <= asOfTime);
      const fmtTime = (ts) => formatTime(ts, cfg.timeMode, summary.turnStart);
      const timeTitle = (ts) => (cfg.timeMode === "elapsed" ? formatTime(ts) : undefined);
      const sortMode = useRefSort();
      const hideCommon = useHideCommonRefs();
      const typeFilter = useRefTypes();
      const [revealState, setRevealState] = React.useState({});
      const revealTimers = React.useRef({});
      React.useEffect(() => {
        const timers = revealTimers.current;
        return () => {
          for (const key of Object.keys(timers)) clearTimeout(timers[key]);
        };
      }, []);
      /* Per-key flash: a new click never keeps an older chip lit; ok/err fade after 1.2s. */
      const flashChip = (chip, value) => {
        setRevealState((previous) => {
          const base = isRecord(previous) ? previous : {};
          if (value === undefined) {
            if (!(chip in base)) return previous;
            const next = { ...base };
            delete next[chip];
            return next;
          }
          return { ...base, [chip]: value };
        });
        const existing = revealTimers.current[chip];
        if (existing !== undefined) {
          clearTimeout(existing);
          delete revealTimers.current[chip];
        }
        if (value !== undefined && value !== "pending") {
          revealTimers.current[chip] = setTimeout(() => {
            delete revealTimers.current[chip];
            flashChip(chip, undefined);
          }, 1200);
        }
      };
      const scoped = hideCommon ? allRefs.filter((ref) => ref.ubiquitous !== true) : allRefs;
      const selectedTypes = Array.isArray(typeFilter) ? typeFilter : [];
      const filtered = selectedTypes.length === 0 ? scoped : scoped.filter((ref) => selectedTypes.indexOf(refDisplayType(ref)) !== -1);
      const sorted = sortReferences(filtered, sortMode);
      const rows = sorted.map((ref, index) => {
        const detail = Array.isArray(ref.detail) ? ref.detail : [];
        const shown = detail.slice(0, 8);
        const extra = detail.length - shown.length;
        const skillCatalog = ref.producer === "skill-catalog" && shown.length > 0;
        const content = [
          h("span", { className: "dsov-tile", key: "tile" }, refTile(ref)),
          h(
            "span",
            { className: "dsov-rowText", key: "text" },
            h(
              "span",
              { className: "dsov-rowTitle" },
              h("span", { className: "dsov-rowName" }, refTitle(ref, t)),
              h("span", { className: "dsov-badge" }, t(KIND_KEYS[ref.kind] ?? "reference.kind.context")),
              ref.form ? h("span", { className: "dsov-badge", "data-tone": "quiet" }, t(`reference.form.${ref.form}`) === `reference.form.${ref.form}` ? ref.form : t(`reference.form.${ref.form}`)) : null,
              ref.count > 1 ? h("span", { className: "dsov-badge", "data-tone": "quiet" }, t("reference.times", { n: ref.count })) : null
            ),
            shown.length > 0
              ? h(
                  "span",
                  { className: "dsov-chips" },
                  shown.map((chip, chipIndex) => {
                    if (!skillCatalog) return h("span", { className: "dsov-chip", key: `${chip}#${chipIndex}`, title: chip }, chip);
                    const state = isRecord(revealState) ? revealState[chip] : undefined;
                    const failed = typeof state === "string" && state !== "pending" && state !== "ok";
                    const title =
                      state === "ok"
                        ? t("viking.revealed")
                        : failed
                          ? `${t("skill.revealFailed")}: ${state}`
                          : state === "pending"
                            ? t("skill.revealPending")
                            : t("skill.revealTitle", { name: chip });
                    return h(
                      "button",
                      {
                        type: "button",
                        className: "dsov-chip dsov-chipBtn",
                        key: `${chip}#${chipIndex}`,
                        title,
                        "data-flash": state === "ok" ? "ok" : failed ? "err" : state === "pending" ? "pending" : undefined,
                        onClick: (event) => {
                          event.stopPropagation();
                          flashChip(chip, "pending");
                          revealInSystem({ kind: "skill", name: chip, account: cfg.vikingAccount, user: cfg.vikingUser })
                            .then((failure) => flashChip(chip, failure === null ? "ok" : failure))
                            .catch(() => flashChip(chip, "error"));
                        },
                      },
                      chip
                    );
                  }),
                  extra > 0 ? h("span", { className: "dsov-chip" }, t("reference.more", { n: extra })) : null
                )
              : null
          ),
          h("span", { className: "dsov-time", key: "time", title: timeTitle(ref.time) }, fmtTime(ref.time)),
        ];
        const isFile = ref.kind === "file";
        if (isFile) {
          return h(
            "button",
            {
              type: "button",
              className: "dsov-row",
              key: `ref-${index}`,
              title: ref.label,
              onClick: () => openSessionFile(sessionId, ref.label),
            },
            ...content
          );
        }
        if ((ref.kind === "memory-file" || ref.kind === "skill") && isVikingUri(ref.uri) && cfg.vikingPreview && cfg.vikingUrl !== "") {
          return h(
            "button",
            {
              type: "button",
              className: "dsov-row",
              key: `ref-${index}`,
              title: ref.uri,
              onClick: () => openVikingPreview(ref.uri),
            },
            ...content
          );
        }
        if (typeof ref.previewKey === "string" && readContextPreview(ref.previewKey) !== null) {
          return h(
            "button",
            {
              type: "button",
              className: "dsov-row",
              key: `ref-${index}`,
              title: t("reference.previewHint"),
              onClick: () => openContextPreview(ref.previewKey),
            },
            ...content
          );
        }
        return h(
          "div",
          { className: "dsov-row dsov-rowStatic", key: `ref-${index}`, title: isVikingUri(ref.uri) ? ref.uri : ref.label },
          ...content
        );
      });
      const ubiquitousCount = allRefs.filter((ref) => ref.ubiquitous === true).length;
      const typeSet = [];
      for (const ref of allRefs) {
        const kind = refDisplayType(ref);
        if (kind !== "" && typeSet.indexOf(kind) === -1) typeSet.push(kind);
      }
      typeSet.sort((left, right) => kindRank(left) - kindRank(right));
      const typeLabel = (kind) => (KIND_KEYS[kind] ? t(KIND_KEYS[kind]) : kind);
      const chips =
        selectedTypes.length > 0
          ? h(
              "div",
              { className: "dsov-typeChips", key: "typeChips" },
              selectedTypes.map((kind) =>
                h(
                  "button",
                  {
                    type: "button",
                    key: kind,
                    className: "dsov-typeChip",
                    title: t("reference.types.remove"),
                    onClick: () => setRefTypes(selectedTypes.filter((item) => item !== kind)),
                  },
                  typeLabel(kind),
                  h("span", { className: "dsov-typeChipX", "aria-hidden": "true" }, "×")
                )
              )
            )
          : null;
      return h(
        Section,
        {
          id: "references",
          icon: h(IconReference, { size: 15 }),
          title: t("section.references"),
          badge: filtered.length > 0 ? String(filtered.length) : undefined,
          empty: hideCommon && ubiquitousCount > 0 && scoped.length === 0 ? t("references.onlyCommon") : t("references.empty"),
          action:
            allRefs.length > 1
              ? h(
                  "div",
                  { className: "dsov-refControls" },
                  typeSet.length > 1
                    ? h(RefTypeFilter, { types: typeSet, selected: selectedTypes, label: typeLabel, t })
                    : null,
                  ubiquitousCount > 0
                    ? h(
                        "button",
                        {
                          type: "button",
                          className: "dsov-filterBtn",
                          "data-active": hideCommon ? "true" : "false",
                          title: t("reference.hideCommon.title"),
                          onClick: () => setHideCommonRefs(!hideCommon),
                        },
                        h(IconFilter, { size: 11 }),
                        t("reference.hideCommon")
                      )
                    : null,
                  h(
                    "div",
                    { className: "dsov-seg" },
                    REF_SORT_MODES.map((mode) =>
                      h(
                        "button",
                        {
                          type: "button",
                          key: mode,
                          className: "dsov-segBtn",
                          "data-active": sortMode === mode ? "true" : "false",
                          title: sortMode === mode ? `${t(`reference.sort.${mode}.title`)} · ${t("reference.sort.cancel")}` : t(`reference.sort.${mode}.title`),
                          onClick: () => setRefSort(sortMode === mode ? "" : mode),
                        },
                        t(`reference.sort.${mode}`)
                      )
                    )
                  )
                )
              : null,
        },
        chips,
        ...rows
      );
    }

    /* ------------------------------------------------------------------ */
    /* Composed content                                                    */
    /* ------------------------------------------------------------------ */

    function formatDuration(ms) {
      const total = Math.max(0, Math.round((Number.isFinite(ms) ? ms : 0) / 1000));
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
      if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
      return `${seconds}s`;
    }

    /** Left-hand stat pills on the scope row: duration, tool calls, commands, files, failures. */
    function StatsBar({ stats, t, canTimeline, timelineOpen, scrubbing, onToggleTimeline, prevJump, onPrevTurn }) {
      if (!isRecord(stats)) return null;
      const duration = typeof stats.durationMs === "number" ? stats.durationMs : 0;
      const toolCalls = typeof stats.toolCalls === "number" ? stats.toolCalls : 0;
      const commands = typeof stats.commands === "number" ? stats.commands : 0;
      const files = typeof stats.files === "number" ? stats.files : 0;
      const errors = typeof stats.errors === "number" ? stats.errors : 0;
      /* scrubbed to 0s: every pill is zero and the bar would vanish — keep it
         alive with the "previous turn" jump instead */
      const jumpBtn =
        Number.isFinite(prevJump) && typeof onPrevTurn === "function"
          ? h(
              "button",
              { type: "button", className: "dsov-stat dsov-statBtn dsov-prevTurn", key: "prevTurn", title: t("timeline.prevTurnTitle", { n: prevJump }), onClick: onPrevTurn },
              `\u2039 ${t("timeline.prevTurn")}`
            )
          : null;
      if (duration === 0 && toolCalls === 0) return jumpBtn === null ? null : h("div", { className: "dsov-stats" }, jumpBtn);
      const pill = (key, text, title, tone) => h("span", { className: "dsov-stat", key, title, ...(tone === undefined ? {} : { "data-tone": tone }) }, text);
      const scrubable = canTimeline === true && typeof onToggleTimeline === "function";
      return h(
        "div",
        { className: "dsov-stats" },
        jumpBtn,
        duration > 0
          ? scrubable
            ? h(
                "button",
                {
                  type: "button",
                  className: "dsov-stat dsov-statBtn",
                  key: "duration",
                  title: t("stats.duration.timeline"),
                  "data-active": timelineOpen === true ? "true" : undefined,
                  "data-scrub": scrubbing === true ? "true" : undefined,
                  onClick: onToggleTimeline,
                },
                t("stats.duration", { v: formatDuration(duration) })
              )
            : pill("duration", t("stats.duration", { v: formatDuration(duration) }), t("stats.duration.title"))
          : null,
        pill("tools", t("stats.tools", { n: toolCalls }), t("stats.tools.title")),
        commands > 0 ? pill("commands", t("stats.commands", { n: commands }), t("stats.commands.title")) : null,
        files > 0 ? pill("files", t("stats.files", { n: files }), t("stats.files.title")) : null,
        errors > 0 ? pill("errors", t("stats.errors", { n: errors }), t("stats.errors.title"), "err") : null
      );
    }

    function OverviewContent({ binding, t, variant }) {
      const [selection, setSelection] = React.useState("latest");
      /* timeline scrubbing: a null asOf always means "live/latest state" */
      const [asOf, setAsOf] = React.useState(null);
      const [timelineOpen, setTimelineOpen] = React.useState(false);
      const sessionWaiting = useSessionWaiting(binding ? binding.sessionId : undefined);
      /* Follow quick-nav linkage clicks issued after this instance mounted. */
      const navRev = useNavScopeRev();
      const mountNavRev = React.useRef(navRev);
      React.useEffect(() => {
        if (navScopeStore.rev === mountNavRev.current) return;
        if (typeof navScopeStore.selection === "string") setSelection(navScopeStore.selection);
      }, [navRev]);
      React.useEffect(() => {
        /* new scope: back to live, but keep the timeline row open so a
           "上一轮" jump lands ready to drag in the previous turn */
        setAsOf(null);
      }, [selection]);
      const summary = useSummary(binding, selection);
      useBackfill(binding, summary.hasMore);
      const goal = useGoal(binding);
      const stats = useArtifactStats(binding, summary.changeTurns);
      const cfg = useConfig();
      const sessionId = binding ? binding.sessionId : undefined;
      const rootClass = variant === "panel" ? "dsov-panel" : "dsov-view";
      const rootRef = React.useRef(null);
      const scope = summary.scope === selection || selection === "latest" ? summary.scope : selection;
      const hasTurns = Array.isArray(summary.turns) && summary.turns.length >= 2;
      const turnOptions = Array.isArray(summary.turns) ? summary.turns.slice().reverse() : [];
      const scopeTurn = typeof scope === "string" && scope.startsWith("turn:") ? Number.parseInt(scope.slice(5), 10) : null;
      if (scopeTurn !== null && Number.isFinite(scopeTurn) && !turnOptions.includes(scopeTurn)) turnOptions.unshift(scopeTurn);
      const scopeSelect = hasTurns || scopeTurn !== null
        ? h(
            "select",
            {
              className: "dsov-turnSelect",
              value: scope,
              title: t("scope.label"),
              "aria-label": t("scope.label"),
              onChange: (event) => setSelection(event.target.value),
            },
            h("option", { value: "latest", key: "latest" }, t("scope.latest")),
            ...turnOptions.map((turn) => h("option", { value: `turn:${turn}`, key: `turn:${turn}` }, t("scope.turn", { n: turn }))),
            h("option", { value: "all", key: "all" }, t("scope.all"))
          )
        : null;
      /* while scrubbing, the stats pills recompute from the steps that already happened */
      const viewStats = React.useMemo(() => {
        if (asOf === null || typeof summary.turnStart !== "number") return summary.stats;
        const list = (Array.isArray(summary.stepsAll) ? summary.stepsAll : []).filter((step) => isRecord(step) && (step.time || 0) <= asOf);
        return {
          ...summary.stats,
          durationMs: Math.max(0, asOf - summary.turnStart),
          toolCalls: list.length,
          commands: list.filter((step) => step.name === "bash").length,
          errors: list.filter((step) => step.error === true && (step.endTime || step.time || 0) <= asOf).length,
        };
      }, [asOf, summary]);
      const canTimeline = typeof summary.turnStart === "number" && typeof summary.turnEnd === "number" && summary.turnEnd > summary.turnStart;
      /* at the 0s point nothing has happened yet in this turn: offer a jump to
         the previous turn, rendered inside the (otherwise empty) stats bar */
      const turnNums = Array.isArray(summary.turns) ? summary.turns.filter((value) => Number.isFinite(value)) : [];
      let prevTurn = null;
      if (scopeTurn !== null) {
        const oldest = turnNums.length > 0 ? turnNums[0] : 1;
        if (scopeTurn - 1 >= oldest) prevTurn = scopeTurn - 1;
      } else if (scope === "latest" && turnNums.length >= 2) {
        prevTurn = turnNums[turnNums.length - 2];
      }
      const statsBar =
        cfg.showStats !== false
          ? h(StatsBar, {
              stats: viewStats,
              t,
              canTimeline,
              timelineOpen,
              scrubbing: asOf !== null,
              prevJump: asOf !== null && asOf <= summary.turnStart ? prevTurn : null,
              onPrevTurn: () => {
                setSelection(`turn:${prevTurn}`);
                setAsOf(null);
                setTimelineOpen(true);
              },
              onToggleTimeline: () => {
                setTimelineOpen((open) => {
                  if (open) setAsOf(null);
                  return !open;
                });
              },
            })
          : null;
      const timelineTotal = canTimeline ? summary.turnEnd - summary.turnStart : 0;
      const timelineValue = asOf === null ? summary.turnEnd : Math.min(Math.max(asOf, summary.turnStart), summary.turnEnd);
      const timelinePct = timelineTotal > 0 ? ((timelineValue - summary.turnStart) / timelineTotal) * 100 : 100;
      const timelineBubble = asOf === null ? t("timeline.live") : `${formatElapsed(asOf - summary.turnStart)} · ${formatTime(asOf)}`;
      const timelineRow =
        timelineOpen && canTimeline
          ? h(
              "div",
              { className: "dsov-timeline" },
              /* fixed-width label: the scope's total duration never changes while scrubbing */
              h("span", { className: "dsov-timelineLabel" }, t("stats.duration", { v: formatDuration(timelineTotal) })),
              h(
                "div",
                { className: "dsov-timelineTrack" },
                h("input", {
                  type: "range",
                  className: "dsov-timelineSlider",
                  min: summary.turnStart,
                  max: summary.turnEnd,
                  step: Math.max(1, Math.floor(timelineTotal / 1000)),
                  value: timelineValue,
                  title: timelineBubble,
                  onChange: (event) => {
                    const next = Number(event.target.value);
                    setAsOf(next >= summary.turnEnd ? null : next);
                  },
                }),
                h("span", { className: "dsov-timelineBubble", style: { left: `${timelinePct}%` } }, timelineBubble)
              ),
              h(
                "button",
                { type: "button", className: "dsov-moreSteps", title: t("timeline.reset"), disabled: asOf === null, onClick: () => setAsOf(null) },
                t("timeline.reset")
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "dsov-moreSteps",
                  title: t("timeline.close"),
                  "aria-label": t("timeline.close"),
                  onClick: () => {
                    setTimelineOpen(false);
                    setAsOf(null);
                  },
                },
                "\u00d7"
              )
            )
          : null;
      const hasStats = cfg.showStats !== false && isRecord(summary.stats) && (summary.stats.durationMs > 0 || summary.stats.toolCalls > 0);
      const barPresent = variant === "panel" ? scopeSelect !== null || hasStats : !(scopeSelect === null && cfg.placement === "conversation" && !hasStats);
      /* toggle data-stuck on the sticky wrapper: background only shows while pinned */
      React.useEffect(() => {
        const root = rootRef.current;
        if (root === null || typeof window === "undefined" || typeof getComputedStyle !== "function") return undefined;
        const wrapper = root.querySelector('[data-sticky-bar="true"]');
        if (wrapper === null) return undefined;
        let scroller = root;
        while (scroller !== null && scroller !== document.body && scroller !== document.documentElement) {
          const oy = getComputedStyle(scroller).overflowY;
          if (oy === "auto" || oy === "scroll" || oy === "overlay") break;
          /* an overflow:hidden ancestor only counts when it actually scrolls; otherwise the
             search continues to the real scroller (the conversation tab has hidden wrappers) */
          if (oy === "hidden" && scroller.scrollHeight > scroller.clientHeight + 1) break;
          scroller = scroller.parentElement;
        }
        const target = scroller !== null && scroller !== document.body && scroller !== document.documentElement ? scroller : null;
        /* Transform-based pinning: CSS sticky binds to the nearest scrollport, which an
           overflow:hidden wrapper can hijack, leaving the bar to slide under the tab bar. */
        let lastDelta = 0;
        const update = () => {
          const frameTop = target === null ? 0 : target.getBoundingClientRect().top;
          const scrolled = target === null ? window.scrollY : target.scrollTop;
          const natural = wrapper.getBoundingClientRect().top - lastDelta - frameTop + scrolled;
          const delta = Math.max(0, scrolled - natural);
          if (delta !== lastDelta) {
            wrapper.style.transform = delta > 0 ? `translateY(${delta}px)` : "";
            lastDelta = delta;
          }
          const flag = delta > 0.5 ? "true" : "false";
          if (wrapper.getAttribute("data-stuck") !== flag) wrapper.setAttribute("data-stuck", flag);
        };
        update();
        const host = target === null ? window : target;
        host.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
          host.removeEventListener("scroll", update);
          window.removeEventListener("resize", update);
          wrapper.style.transform = "";
        };
      }, [variant, barPresent]);
      return h(
        "div",
        { className: rootClass, ref: rootRef, "data-conversation-overview": variant === "panel" ? "panel" : "view" },
        variant === "panel"
          ? scopeSelect !== null || hasStats
            ? h(
                "div",
                { className: "dsov-turnbarWrap", "data-sticky-bar": "true", "data-stuck": "false" },
                h(
                  "div",
                  { className: "dsov-turnbar" },
                  statsBar !== null ? h("div", { className: "dsov-turnbarScroll" }, statsBar) : null,
                  scopeSelect !== null ? h("div", { className: "dsov-turnbarFixed" }, scopeSelect) : null
                ),
                timelineRow
              )
            : null
          : scopeSelect === null && cfg.placement === "conversation" && !hasStats
            ? null
            : h(
                "div",
                { className: "dsov-toolbarWrap", "data-sticky-bar": "true", "data-stuck": "false" },
                h(
                  "div",
                  { className: "dsov-toolbar" },
                  statsBar !== null ? h("div", { className: "dsov-toolbarScroll" }, statsBar) : null,
                  h(
                    "div",
                    { className: "dsov-toolbarFixed" },
                    scopeSelect,
                    cfg.placement === "conversation"
                      ? null
                      : h(
                          "button",
                          { type: "button", className: "dsov-iconBtn", onClick: openOverviewTab, title: t("action.openInSidebar") },
                          h(IconOpenSidebar, { size: 14 }),
                          t("action.openInSidebar")
                        )
                  )
                ),
                timelineRow
              ),
        summary.hasMore ? h("div", { className: "dsov-loading" }, t("state.loadingHistory")) : null,
        cfg.showProgress ? h(ProgressSection, { summary, goal, t, waiting: sessionWaiting && asOf === null, cfg, asOf }) : null,
        cfg.showArtifacts ? h(ArtifactsSection, { summary, t, binding, stats, asOf }) : null,
        cfg.showReferences ? h(ReferencesSection, { summary, t, sessionId, asOf }) : null
      );
    }

    class OverviewBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { failed: false, message: "" };
      }
      static getDerivedStateFromError(error) {
        return { failed: true, message: error && typeof error.message === "string" ? error.message : String(error) };
      }
      componentDidCatch(error, info) {
        /* surface the real cause: in the console and inside the fallback panel */
        try {
          console.error("[dsh-conversation-overview] overview render failed:", error, info && info.componentStack);
        } catch {
          /* console is best-effort */
        }
      }
      render() {
        if (this.state.failed) {
          return h(
            "div",
            { className: this.props.variant === "panel" ? "dsov-panel" : "dsov-view" },
            h("div", { className: "dsov-empty" }, translate("state.error")),
            this.state.message !== "" ? h("pre", { className: "dsov-renderErr" }, this.state.message) : null
          );
        }
        return this.props.children;
      }
    }

    function OverviewSurface(props, variant) {
      const t = typeof props.t === "function" ? props.t : translate;
      const binding = resolveBinding(props.sessionId);
      if (!binding) {
        return h("div", { className: variant === "panel" ? "dsov-panel" : "dsov-view" }, h("div", { className: "dsov-empty" }, t("state.noSession")));
      }
      return h(OverviewBoundary, { variant }, h(OverviewContent, { binding, t, variant }));
    }

    function ConversationOverviewView(props) {
      return OverviewSurface(props, "view");
    }

    function SidebarOverviewBody(props) {
      return OverviewSurface(props, "panel");
    }

    /** Sidebar tab body previewing one viking:// memory: file (frontmatter + markdown) or directory listing. */
    function VikingPreviewBody(props) {
      const t = typeof props.t === "function" ? props.t : translate;
      const info = typeof props.useTabInfo === "function" ? props.useTabInfo() : null;
      const uri = info && isRecord(info.tab) ? parseVikingAddress(info.tab.contentId) : undefined;
      const [state, setState] = React.useState({ status: "loading", mode: "file", text: "", entries: [], error: "", directory: false });
      const [reload, setReload] = React.useState(0);
      const [source, setSource] = React.useState(false);
      const [revealMsg, setRevealMsg] = React.useState(null);
      React.useEffect(() => {
        if (!uri) return undefined;
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        const signal = controller ? controller.signal : undefined;
        const cfg = readConfig();
        setState({ status: "loading", mode: "file", text: "", entries: [], error: "", directory: false });
        (async () => {
          try {
            const text = await fetchVikingContent(uri, cfg, signal);
            setState({ status: "ready", mode: "file", text, entries: [], error: "", directory: false });
          } catch (error) {
            if (error && error.name === "AbortError") return;
            if (error && error.directory === true) {
              try {
                const entries = await fetchVikingDir(uri, cfg, signal);
                setState({ status: "ready", mode: "dir", text: "", entries, error: "", directory: true });
              } catch (dirError) {
                if (dirError && dirError.name === "AbortError") return;
                setState({ status: "error", mode: "dir", text: "", entries: [], error: errorMessageOf(dirError), directory: true });
              }
              return;
            }
            setState({ status: "error", mode: "file", text: "", entries: [], error: errorMessageOf(error), directory: false });
          }
        })();
        return () => {
          if (controller) controller.abort();
        };
      }, [uri, reload]);
      if (!uri) {
        return h("div", { className: "dsov-viking" }, h("div", { className: "dsov-vikingError" }, t("viking.badAddress")));
      }
      const view = isRecord(state) ? state : { status: "loading", mode: "file", text: "", entries: [], error: "", directory: false };
      const parsed = view.status === "ready" && view.mode === "file" ? parseFrontmatter(view.text) : null;
      const titleText = (parsed ? frontmatterTitle(parsed.fields) : null) || vikingName(uri);
      const revealTarget = view.directory ? `${uri.replace(/\/+$/, "")}/` : vikingParentUri(uri);
      return h(
        "div",
        { className: "dsov-viking" },
        h(
          "div",
          { className: "dsov-vikingHead" },
          h("span", { className: "dsov-vikingIcon" }, view.directory ? h(FileTypeIcon, { kind: "folder", size: 16 }) : h(IconMemory, { size: 15 })),
          h(
            "span",
            { className: "dsov-vikingHeadText" },
            h("span", { className: "dsov-vikingName" }, titleText),
            revealTarget !== null
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "dsov-vikingPathBtn",
                    title: t("viking.revealTitle"),
                    onClick: () => {
                      setRevealMsg(null);
                      revealInSystem({ kind: "viking", uri: revealTarget, account: readConfig().vikingAccount })
                        .then((failure) => setRevealMsg(failure === null ? "ok" : failure))
                        .catch(() => setRevealMsg("error"));
                    },
                  },
                  h("span", { className: "dsov-vikingPathText" }, uri),
                  h("span", { className: "dsov-vikingPathHint" }, t("viking.revealHint"))
                )
              : h("span", { className: "dsov-vikingPathText", title: uri }, uri),
            revealMsg !== null && revealMsg !== "ok"
              ? h("span", { className: "dsov-revealErr" }, `${t("viking.revealFailed")}: ${revealMsg}`)
              : revealMsg === "ok"
                ? h("span", { className: "dsov-revealOk" }, t("viking.revealed"))
                : null
          ),
          view.status === "ready" && view.mode === "file"
            ? h(
                "span",
                { className: "dsov-seg dsov-vikingMode" },
                h("button", { type: "button", className: "dsov-segBtn", "data-active": source !== true, onClick: () => setSource(false) }, t("viking.preview")),
                h("button", { type: "button", className: "dsov-segBtn", "data-active": source === true, onClick: () => setSource(true) }, t("viking.source"))
              )
            : null
        ),
        view.status === "loading" ? h("div", { className: "dsov-loading" }, t("viking.loading")) : null,
        view.status === "error"
          ? h(
              "div",
              { className: "dsov-vikingError" },
              h("div", null, t("viking.error")),
              view.error ? h("div", { className: "dsov-vikingErrorDetail" }, view.error) : null,
              h(
                "button",
                { type: "button", className: "dsov-headAction", onClick: () => setReload((value) => value + 1) },
                t("viking.retry")
              )
            )
          : null,
        view.status === "ready" && view.mode === "dir"
          ? view.entries.length === 0
            ? h("div", { className: "dsov-empty" }, t("viking.dirEmpty"))
            : h(
                "div",
                { className: "dsov-vikingList" },
                view.entries.map((entry) =>
                  h(
                    "button",
                    {
                      type: "button",
                      className: "dsov-row",
                      key: entry.uri,
                      title: entry.abstract || entry.uri,
                      onClick: () => openVikingPreview(entry.isDir ? `${entry.uri.replace(/\/+$/, "")}/` : entry.uri),
                    },
                    h("span", { className: "dsov-tile" }, entry.isDir ? h(FileTypeIcon, { kind: "folder", size: 18 }) : h(FileTypeIcon, { path: entry.name, size: 18 })),
                    h("span", { className: "dsov-rowText" }, h("span", { className: "dsov-rowTitle" }, h("span", { className: "dsov-rowName" }, entry.name))),
                    h(
                      "span",
                      { className: "dsov-rowTail" },
                      entry.isDir || entry.size === null ? null : h("span", { className: "dsov-vikingSize" }, formatBytes(entry.size)),
                      h("span", { className: "dsov-time" }, formatTime(entry.time))
                    )
                  )
                )
              )
          : null,
        view.status === "ready" && view.mode === "file" && source === true ? h("pre", { className: "dsov-vikingSource" }, view.text) : null,
        view.status === "ready" && view.mode === "file" && source !== true && parsed ? renderFrontmatterFields(parsed, t) : null,
        view.status === "ready" && view.mode === "file" && source !== true && parsed
          ? h("div", { className: "dsov-md", dangerouslySetInnerHTML: { __html: mdToHtml(parsed.body) } })
          : null
      );
    }

    function errorMessageOf(error) {
      if (error && typeof error.message === "string" && error.message !== "") return error.message;
      return String(error);
    }

    const FRONTMATTER_TITLE_KEYS = ["title", "name"];
    const FRONTMATTER_TAG_KEYS = ["keywords", "tags"];
    const FRONTMATTER_SCENARIO_KEYS = ["usage_scenario", "when_to_use"];
    const FRONTMATTER_SOURCE_KEYS = ["source", "sources"];
    const FRONTMATTER_SKIP_KEYS = new Set([...FRONTMATTER_TITLE_KEYS, ...FRONTMATTER_TAG_KEYS, ...FRONTMATTER_SCENARIO_KEYS, ...FRONTMATTER_SOURCE_KEYS, "description"]);

    function frontmatterTitle(fields) {
      for (const key of FRONTMATTER_TITLE_KEYS) {
        const field = fields.find((candidate) => candidate.key === key);
        if (field && field.value !== "") return field.value;
      }
      return null;
    }

    /** Structured preview of frontmatter fields: description paragraph, scenario list, keyword tags, then leftovers. */
    function renderFrontmatterFields(parsed, t) {
      const fields = parsed.fields;
      if (fields.length === 0) return null;
      const blocks = [];
      const description = fields.find((field) => field.key === "description");
      if (description && description.value !== "") {
        blocks.push(h("p", { className: "dsov-vikingDesc", key: "description" }, description.value));
      }
      const sourceField = fields.find((field) => FRONTMATTER_SOURCE_KEYS.indexOf(field.key) !== -1 && (field.value !== "" || field.items.length > 0));
      if (sourceField) {
        const values = sourceField.items.length > 0 ? sourceField.items : [sourceField.value];
        blocks.push(
          h(
            "div",
            { className: "dsov-vikingField", key: "source" },
            h("div", { className: "dsov-vikingFieldLabel" }, t("viking.field.source")),
            h(
              "div",
              { className: "dsov-vikingSource" },
              values.map((value, index) =>
                /^https?:\/\//i.test(value)
                  ? h("a", { key: `${value}#${index}`, className: "dsov-vikingSourceLink", href: value, target: "_blank", rel: "noreferrer" }, value)
                  : h("span", { key: `${value}#${index}`, className: "dsov-vikingFieldValue" }, value)
              )
            )
          )
        );
      }
      const scenarios = fields.filter((field) => FRONTMATTER_SCENARIO_KEYS.indexOf(field.key) !== -1 && field.items.length > 0);
      if (scenarios.length > 0) {
        blocks.push(
          h(
            "div",
            { className: "dsov-vikingField", key: "scenarios" },
            h("div", { className: "dsov-vikingFieldLabel" }, t("viking.field.scenarios")),
            h(
              "ul",
              { className: "dsov-vikingScenarios" },
              scenarios.flatMap((field) => field.items).map((item, index) => h("li", { key: `${item}#${index}` }, item))
            )
          )
        );
      }
      const tags = fields.filter((field) => FRONTMATTER_TAG_KEYS.indexOf(field.key) !== -1 && field.items.length > 0);
      if (tags.length > 0) {
        blocks.push(
          h(
            "div",
            { className: "dsov-vikingField", key: "tags" },
            h("div", { className: "dsov-vikingFieldLabel" }, t("viking.field.keywords")),
            h(
              "div",
              { className: "dsov-vikingTags" },
              tags.flatMap((field) => field.items).map((item, index) => h("span", { className: "dsov-tag", key: `${item}#${index}` }, item))
            )
          )
        );
      }
      const others = fields.filter((field) => !FRONTMATTER_SKIP_KEYS.has(field.key) && (field.value !== "" || field.items.length > 0));
      for (const field of others) {
        blocks.push(
          h(
            "div",
            { className: "dsov-vikingField", key: field.key },
            h("div", { className: "dsov-vikingFieldLabel" }, field.key),
            field.items.length > 0
              ? h("ul", { className: "dsov-vikingScenarios" }, field.items.map((item, index) => h("li", { key: `${item}#${index}` }, item)))
              : h("div", { className: "dsov-vikingFieldValue" }, field.value)
          )
        );
      }
      return blocks.length > 0 ? h("div", { className: "dsov-vikingFields" }, ...blocks) : null;
    }

    /** Sidebar tab body previewing one captured context injection snapshot as markdown. */
    function ContextPreviewBody(props) {
      const t = typeof props.t === "function" ? props.t : translate;
      const info = typeof props.useTabInfo === "function" ? props.useTabInfo() : null;
      const key = info && isRecord(info.tab) ? parseContextAddress(info.tab.contentId) : undefined;
      const entry = key === undefined ? null : readContextPreview(key);
      if (entry === null) {
        return h("div", { className: "dsov-viking" }, h("div", { className: "dsov-vikingError" }, t("context.unavailable")));
      }
      return h(
        "div",
        { className: "dsov-viking" },
        h(
          "div",
          { className: "dsov-vikingHead" },
          h("span", { className: "dsov-vikingIcon" }, h(IconReference, { size: 15 })),
          h(
            "span",
            { className: "dsov-vikingHeadText" },
            h("span", { className: "dsov-vikingName" }, entry.title),
            h("span", { className: "dsov-vikingPathText" }, t("context.subtitle"))
          )
        ),
        h("div", { className: "dsov-md", dangerouslySetInnerHTML: { __html: mdToHtml(entry.text) } })
      );
    }

    /* ------------------------------------------------------------------ */
    /* Settings form (settings page + Plugins row config slot)             */
    /* ------------------------------------------------------------------ */

    let configFormsRef = null;
    let settingsFormCache = { snap: null, handle: null };

    /** Live {state, mutate} handle for this plugin's Host config form, or null. */
    function useSettingsForm() {
      useConfig(); // form pulls notify through the config store; ride it for re-renders
      const subscribe = React.useCallback((onChange) => {
        const forms = configFormsRef;
        if (!forms) return () => {};
        let form = null;
        try {
          form = forms.get(ROW_ID);
        } catch (_missing) {
          return () => {};
        }
        if (!form || typeof form.subscribe !== "function") return () => {};
        return form.subscribe(onChange);
      }, []);
      const get = React.useCallback(() => {
        const forms = configFormsRef;
        if (!forms) return null;
        let form = null;
        try {
          form = forms.get(ROW_ID);
        } catch (_missing) {
          return null;
        }
        if (!form || typeof form.getSnapshot !== "function") return null;
        const snap = form.getSnapshot();
        if (settingsFormCache.snap !== snap) {
          settingsFormCache = {
            snap,
            handle: { state: snap, mutate: (ops, revision) => form.mutate(ops, revision) },
          };
        }
        return settingsFormCache.handle;
      }, []);
      return React.useSyncExternalStore(subscribe, get);
    }

    function SettingsSection() {
      return h(
        "div",
        { className: "dsov-settingsPage" },
        h("h2", { className: "dsov-settingsHeading" }, translate("settings.pageTitle")),
        h(SettingsForm, { view: "page" })
      );
    }

    /* dsh-context style settings rows: label left, pill-select control right. */
    function SettingSelect({ label, value, options, onPick }) {
      const [open, setOpen] = React.useState(false);
      const rootRef = React.useRef(null);
      React.useEffect(() => {
        if (!open || typeof document === "undefined") return undefined;
        const onDocDown = (event) => {
          const root = rootRef.current;
          if (root && event.target instanceof Node && !root.contains(event.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDocDown, true);
        return () => document.removeEventListener("pointerdown", onDocDown, true);
      }, [open]);
      const current = options.find((option) => option.id === value);
      return h(
        "div",
        { className: "dsov-set-row" },
        h("span", { className: "dsov-set-label" }, label),
        h(
          "div",
          { className: "dsov-set-control", ref: rootRef },
          h(
            "button",
            {
              type: "button",
              className: "dsov-set-select",
              "aria-haspopup": "menu",
              "aria-expanded": open === true,
              onClick: () => setOpen(!open),
            },
            h("span", { className: "dsov-set-selectLabel" }, current ? current.label : String(value)),
            h("span", { className: "dsov-set-caret", "data-open": open === true ? "true" : "false" }, h(IconChevron, { size: 13 }))
          ),
          open === true
            ? h(
                "div",
                { className: "dsov-set-menu", role: "menu" },
                options.map((option) =>
                  h(
                    "button",
                    {
                      type: "button",
                      role: "menuitem",
                      key: option.id,
                      className: "dsov-set-menuItem",
                      "data-selected": option.id === value ? "true" : "false",
                      onClick: () => {
                        setOpen(false);
                        if (option.id !== value) onPick(option.id);
                      },
                    },
                    option.label
                  )
                )
              )
            : null
        )
      );
    }

    /* Column text row committing on blur and on unmount, like the context plugin's textarea row. */
    function SettingText({ label, value, onCommit }) {
      const [draft, setDraft] = React.useState(value);
      const [focused, setFocused] = React.useState(false);
      const pending = React.useRef({ draft: value, value, commit: onCommit });
      pending.current = { draft, value, commit: onCommit };
      React.useEffect(
        () => () => {
          const state = pending.current;
          if (typeof state.draft === "string" && state.draft !== state.value) state.commit(state.draft);
        },
        []
      );
      return h(
        "div",
        { className: "dsov-set-row dsov-set-textrow" },
        h("span", { className: "dsov-set-label" }, label),
        h("input", {
          className: "dsov-set-input",
          type: "text",
          value: focused === true ? draft : value,
          onFocus: () => {
            setDraft(value);
            setFocused(true);
          },
          onBlur: () => {
            setFocused(false);
            if (typeof draft === "string" && draft !== value) onCommit(draft);
          },
          onChange: (event) => setDraft(event.target.value),
        })
      );
    }

    /* Multi-line text row committing on blur and on unmount (prompt template). */
    function SettingTextarea({ label, value, placeholder, onCommit }) {
      const [draft, setDraft] = React.useState(value);
      const [focused, setFocused] = React.useState(false);
      const pending = React.useRef({ draft: value, value, commit: onCommit });
      pending.current = { draft, value, commit: onCommit };
      React.useEffect(
        () => () => {
          const state = pending.current;
          if (typeof state.draft === "string" && state.draft !== state.value) state.commit(state.draft);
        },
        []
      );
      return h(
        "div",
        { className: "dsov-set-row dsov-set-arearow" },
        h("span", { className: "dsov-set-label" }, label),
        h("textarea", {
          className: "dsov-set-textarea",
          rows: 7,
          value: focused === true ? draft : value,
          placeholder,
          onFocus: () => {
            setDraft(value);
            setFocused(true);
          },
          onBlur: () => {
            setFocused(false);
            if (typeof draft === "string" && draft !== value) onCommit(draft);
          },
          onChange: (event) => setDraft(event.target.value),
        })
      );
    }

    function SettingsForm(props) {
      const t = typeof props.t === "function" ? props.t : translate;
      const hookForm = useSettingsForm();
      if (props.view === "summary") {
        return h("span", null, t("settings.summary"));
      }
      const form = props.form || hookForm;
      const state = form && isRecord(form.state) ? form.state : null;
      const status = state && typeof state.status === "string" ? state.status : "unavailable";
      const ready = status === "ready";
      const formUsable = ready && state.writable !== false && form && typeof form.mutate === "function";
      const cfg = ready ? normalizeConfig(state.value) : configStore.current;
      const set = (field, value) => {
        if (formUsable) {
          form.mutate([{ op: "set", path: [field], value }], state.revision);
          return;
        }
        setOverlayConfig({ ...configStore.current, [field]: value });
      };
      const boolOptions = [
        { id: "on", label: t("settings.on") },
        { id: "off", label: t("settings.off") },
      ];
      const placeOptions = [
        { id: "conversation", label: t("settings.placement.conversation") },
        { id: "sidebar", label: t("settings.placement.sidebar") },
        { id: "both", label: t("settings.placement.both") },
      ];
      const timeOptions = [
        { id: "clock", label: t("settings.timeMode.clock") },
        { id: "elapsed", label: t("settings.timeMode.elapsed") },
      ];
      const boolRow = (label, field) =>
        h(SettingSelect, {
          label,
          value: cfg[field] ? "on" : "off",
          options: boolOptions,
          onPick: (id) => set(field, id === "on"),
        });
      const note = (text) => h("div", { className: "dsov-set-note" }, text);
      const group = (title, ...rows) =>
        h("div", { className: "dsov-set-group" }, h("div", { className: "dsov-set-group-title" }, title), ...rows);
      return h(
        "div",
        { className: "dsov-set-prefs" },
        status === "loading" ? note(t("settings.loading")) : null,
        formUsable ? null : note(t(status === "loading" ? "settings.localNoteBrief" : "settings.localNote")),
        group(
          t("settings.sections"),
          boolRow(t("settings.showProgress"), "showProgress"),
          boolRow(t("settings.showArtifacts"), "showArtifacts"),
          boolRow(t("settings.showReferences"), "showReferences"),
          boolRow(t("settings.showStats"), "showStats")
        ),
        group(
          t("settings.interaction"),
          h(SettingSelect, { label: t("settings.timeMode"), value: cfg.timeMode, options: timeOptions, onPick: (id) => set("timeMode", id) }),
          note(t("settings.timeModeNote")),
          boolRow(t("settings.stepAnchors"), "stepAnchors"),
          note(t("settings.stepAnchorsNote")),
          boolRow(t("settings.todoPromptRow"), "todoPrompt"),
          cfg.todoPrompt
            ? h(SettingTextarea, {
                label: t("settings.todoPromptTemplate"),
                value: cfg.todoPromptTemplate,
                placeholder: DEFAULT_TODO_TEMPLATE,
                onCommit: (value) => set("todoPromptTemplate", value),
              })
            : null,
          note(t("settings.todoPromptNote")),
          cfg.todoPrompt ? note(t("settings.todoPromptTemplateNote")) : null
        ),
        group(
          t("settings.quickNav"),
          boolRow(t("settings.quickNavRow"), "quickNav"),
          boolRow(t("settings.quickNavLinkRow"), "quickNavLink"),
          note(t("settings.quickNavNote")),
          note(t("settings.quickNavLinkNote"))
        ),
        group(
          t("settings.layout"),
          h(SettingSelect, {
            label: t("settings.placementRow"),
            value: cfg.placement,
            options: placeOptions,
            onPick: (id) => set("placement", id),
          }),
          boolRow(t("settings.fullHeightRow"), "sectionFullHeight"),
          note(t("settings.fullHeightNote"))
        ),
        group(
          t("settings.viking"),
          boolRow(t("settings.vikingEnable"), "vikingPreview"),
          cfg.vikingPreview
            ? h(SettingText, { label: t("settings.vikingUrl"), value: cfg.vikingUrl, onCommit: (value) => set("vikingUrl", value) })
            : null,
          cfg.vikingPreview
            ? h(SettingText, { label: t("settings.vikingAccount"), value: cfg.vikingAccount, onCommit: (value) => set("vikingAccount", value) })
            : null,
          cfg.vikingPreview
            ? h(SettingText, { label: t("settings.vikingUser"), value: cfg.vikingUser, onCommit: (value) => set("vikingUser", value) })
            : null,
          note(cfg.vikingPreview ? t("settings.vikingNote") : t("settings.vikingOffNote"))
        ),
        group(
          t("settings.feedbackGroup"),
          h(VersionRow, { t }),
          h(
            "a",
            { className: "dsov-set-link", href: FEEDBACK_URL, target: "_blank", rel: "noreferrer", title: FEEDBACK_URL },
            h("span", null, t("settings.feedback")),
            h(
              "svg",
              { width: 11, height: 11, viewBox: "0 0 12 12", fill: "none", "aria-hidden": "true" },
              h("path", { d: "M4.6 2.4H2.8c-.7 0-1.3.6-1.3 1.3v5.5c0 .7.6 1.3 1.3 1.3h5.5c.7 0 1.3-.6 1.3-1.3V7.4M7.2 1.5h3.3v3.3M6.3 5.7 10.2 1.8", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round", strokeLinejoin: "round" })
            )
          )
        ),
        formUsable ? note(t("settings.hint")) : null
      );
    }

    /* ------------------------------------------------------------------ */
    /* Styles (theme tokens only)                                          */
    /* ------------------------------------------------------------------ */

    const CSS = `
.dsov-view{box-sizing:border-box;width:100%;max-width:880px;margin:0 auto;padding:20px 28px 64px;display:flex;flex-direction:column;gap:14px}
.dsov-panel{box-sizing:border-box;height:100%;min-height:0;overflow-y:auto;padding:14px 16px 28px;display:flex;flex-direction:column;gap:12px}
.dsov-panel,.dsov-viking,.dsov-secBody,.dsov-typeMenu,.dsov-md-pre,.dsov-turnbarScroll,.dsov-toolbarScroll{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--dsw-alias-label-secondary) 35%,transparent) transparent}
.dsov-panel::-webkit-scrollbar,.dsov-viking::-webkit-scrollbar,.dsov-secBody::-webkit-scrollbar,.dsov-typeMenu::-webkit-scrollbar,.dsov-md-pre::-webkit-scrollbar,.dsov-turnbarScroll::-webkit-scrollbar,.dsov-toolbarScroll::-webkit-scrollbar{width:6px;height:5px}
.dsov-panel::-webkit-scrollbar-thumb,.dsov-viking::-webkit-scrollbar-thumb,.dsov-secBody::-webkit-scrollbar-thumb,.dsov-typeMenu::-webkit-scrollbar-thumb,.dsov-md-pre::-webkit-scrollbar-thumb,.dsov-turnbarScroll::-webkit-scrollbar-thumb,.dsov-toolbarScroll::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsw-alias-label-secondary) 35%,transparent);border-radius:3px}
.dsov-panel::-webkit-scrollbar-track,.dsov-viking::-webkit-scrollbar-track,.dsov-secBody::-webkit-scrollbar-track,.dsov-typeMenu::-webkit-scrollbar-track,.dsov-md-pre::-webkit-scrollbar-track,.dsov-turnbarScroll::-webkit-scrollbar-track,.dsov-toolbarScroll::-webkit-scrollbar-track{background:transparent}
.dsov-toolbar{display:flex;align-items:center;gap:8px}
.dsov-toolbarScroll{flex:1 1 auto;min-width:0;display:flex;align-items:center;overflow-x:auto;overflow-y:hidden;padding-bottom:5px}
.dsov-toolbarFixed{flex:none;display:flex;align-items:center;gap:8px;margin-left:auto;padding-bottom:5px}
.dsov-iconBtn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap;flex:none}
.dsov-turnSelect{flex:none}
.dsov-iconBtn:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);color:var(--dsw-alias-label-primary)}
.dsov-section{background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.dsov-sectionHead{display:flex;align-items:center;gap:6px}
.dsov-sectionToggle{flex:1;min-width:0;display:flex;align-items:center;gap:8px;background:transparent;border:none;margin:0;padding:2px 4px;border-radius:8px;font:inherit;color:inherit;text-align:left;cursor:pointer}
.dsov-sectionToggle:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
.dsov-chevron{flex:none;display:inline-flex;color:var(--dsw-alias-label-secondary);transition:transform .15s ease}
.dsov-chevron[data-open=true]{transform:rotate(90deg)}
.dsov-moreSteps{appearance:none;background:transparent;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px;flex:none;margin-left:auto;padding:1px 6px;border-radius:8px;font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dsov-moreSteps:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsov-moreIcon{flex:none;display:inline-flex;opacity:.75}
.dsov-sectionIcon{flex:none;display:inline-flex;color:var(--dsw-alias-label-secondary)}
.dsov-sectionTitle{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap}
.dsov-count{flex:none;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:999px;padding:0 8px;font-variant-numeric:tabular-nums}
.dsov-headAction{flex:none;display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.dsov-headAction:hover{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.dsov-empty{font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);padding:4px 2px}
.dsov-secBody{max-height:320px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;margin:0 -12px 0 -8px;padding:0 12px 0 8px}
.dsov-section[data-full=true] .dsov-secBody{max-height:none;overflow:visible;margin:0;padding:0}
.dsov-loading{font-size:12px;color:var(--dsw-alias-label-secondary)}
.dsov-goal{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--dsw-alias-label-primary);padding:2px}
.dsov-goalIcon{flex:none;display:inline-flex;margin-top:2px;color:var(--dsw-alias-brand-primary)}
.dsov-goalObjective{flex:1;min-width:0;line-height:1.55;overflow-wrap:anywhere}
.dsov-badge{flex:none;font-size:10.5px;line-height:17px;padding:0 7px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dsov-badge[data-tone=brand]{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent)}
.dsov-badge[data-tone=success]{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,transparent)}
.dsov-badge[data-tone=warn]{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 45%,transparent)}
.dsov-badge[data-tone=error]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent)}
.dsov-badge[data-tone=quiet]{border-color:transparent;background:var(--dsw-alias-bg-layer-2)}
.dsov-progress{display:flex;flex-direction:column;gap:6px;margin-top:2px}
.dsov-progressTrack{height:4px;border-radius:2px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.dsov-progressFill{height:100%;border-radius:2px;background:var(--dsw-alias-state-success-primary);transition:width .25s ease}
.dsov-progressMeta{font-size:11.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dsov-todo{display:flex;align-items:flex-start;gap:8px;font-size:13px;line-height:1.55;color:var(--dsw-alias-label-primary);padding:4px 6px;border-radius:8px;cursor:pointer;transition:background-color .18s ease,color .18s ease}
.dsov-todo+.dsov-todo{margin-top:3px}
.dsov-todo:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
.dsov-todo:focus-visible{outline:1.5px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsov-todo[data-flash=ok]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#34c759) 12%,transparent)}
.dsov-todo[data-flash=err]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ff453a) 12%,transparent)}
.dsov-todoIcon{flex:none;display:inline-flex;margin-top:2px}
.dsov-todoIcon[data-status=pending]{color:var(--dsw-alias-state-idle-primary)}
.dsov-todoIcon[data-status=in_progress]{color:var(--dsw-alias-brand-primary)}
.dsov-todoIcon[data-status=completed]{color:var(--dsw-alias-state-success-primary)}
.dsov-todoText{flex:1;min-width:0;overflow-wrap:anywhere}
.dsov-todo[data-status=completed] .dsov-todoText{color:var(--dsw-alias-label-secondary)}
.dsov-todoStatus{flex:none;font-size:11px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.dsov-stepsHead{display:flex;align-items:center;gap:8px;font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));letter-spacing:.02em;padding:1px 2px 4px}
.dsov-steps{position:relative;display:flex;flex-direction:column;gap:3px}
.dsov-step{display:flex;align-items:center;gap:6px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary);padding:3px 6px;min-width:0;border-radius:8px;cursor:pointer;transition:background-color .18s ease}
.dsov-step:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
.dsov-step[data-flash=ok]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#34c759) 12%,transparent)}
.dsov-step[data-flash=err]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ff453a) 12%,transparent)}
.dsov-stepName{flex:none;font-weight:500}
.dsov-stepDetail{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dsov-step .dsov-time{flex:none;margin-left:auto}
.dsov-step[data-error=true] .dsov-stepName{color:var(--dsw-alias-state-error-primary,#ff453a)}
.dsov-step[data-error=true] .dsov-todoIcon[data-status=completed]{color:var(--dsw-alias-state-error-primary,#ff453a)}
.dsov-step[data-waiting=true]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#ff9f0a) 9%,transparent)}
.dsov-step[data-waiting=true] .dsov-stepName{color:var(--dsw-alias-state-warn-primary,#ff9f0a)}
.dsov-step[data-waiting=true] .dsov-todoIcon[data-status=waiting]{color:var(--dsw-alias-state-warn-primary,#ff9f0a)}
.dsov-agentIcon{color:var(--dsw-alias-brand-primary)}
.dsov-memberName{flex:none;font-weight:500}
.dsov-memberDesc{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dsov-todo .dsov-chevron{margin-top:4px}
.dsov-todoIcon[data-status=failed]{color:var(--dsw-alias-state-error-primary)}
.dsov-taskSubject{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsov-todo[data-depth="1"]{position:relative;margin-left:26px}
.dsov-todo[data-depth="2"]{position:relative;margin-left:46px}
.dsov-todo[data-depth]::before{content:"";position:absolute;left:-15px;top:-4px;bottom:50%;width:9px;border-left:1px solid var(--dsw-alias-border-l2);border-bottom:1px solid var(--dsw-alias-border-l2);border-bottom-left-radius:6px}
.dsov-member[data-expandable=false]{cursor:default}
.dsov-member[data-expandable=false]:hover{background:transparent}
.dsov-stepChevron{flex:none;margin-right:-2px}
.dsov-compactIcon{color:var(--dsw-alias-label-secondary)}
.dsov-todoIconSlot{position:relative;flex:none;display:inline-flex;margin-top:2px}
.dsov-todoIconSlot .dsov-todoIcon{margin-top:0}
.dsov-todoChevron{position:absolute;inset:0;display:inline-flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .12s ease}
.dsov-todo[data-expandable=true]:hover .dsov-todoChevron,.dsov-todo[data-expandable=true][data-open=true] .dsov-todoChevron{opacity:1;pointer-events:auto}
.dsov-todo[data-expandable=true]:hover .dsov-todoIconSlot .dsov-todoIcon,.dsov-todo[data-expandable=true][data-open=true] .dsov-todoIconSlot .dsov-todoIcon{visibility:hidden}
.dsov-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:6px 8px;margin:0 -8px;border-radius:10px;border:none;background:transparent;cursor:pointer;font:inherit;color:inherit;box-sizing:content-box}
.dsov-row:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
.dsov-rowStatic{cursor:default}
.dsov-rowStatic:hover{background:transparent}
.dsov-tile{flex:none;width:28px;height:28px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1);display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary)}
.dsov-fileIcon{flex:none;width:22px;display:inline-flex;justify-content:center}
.dsov-fileIcon svg{display:block}
.dsov-artifactName{flex:1;min-width:0;font-size:13px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsov-counts{flex:none;display:inline-flex;gap:6px;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;font-variant-numeric:tabular-nums}
.dsov-added{color:var(--dsw-alias-state-success-primary)}
.dsov-deleted{color:var(--dsw-alias-state-error-primary)}
.dsov-rowTail{flex:none;display:inline-flex;align-items:center;gap:8px;margin-left:auto}
.dsov-rowText{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dsov-rowTitle{display:flex;align-items:center;gap:6px;min-width:0;font-size:13px;color:var(--dsw-alias-label-primary)}
.dsov-rowName{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dsov-rowSub{font-size:11.5px;color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsov-time{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;align-self:flex-start;margin-top:2px}
.dsov-chips{display:flex;flex-wrap:wrap;gap:4px}
.dsov-chip{font-size:10.5px;line-height:17px;padding:0 6px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsov-settingsPage{display:flex;flex-direction:column;gap:14px;padding:6px 2px;max-width:560px}
.dsov-settingsHeading{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary);margin:0}
.dsov-set-prefs{padding:4px 0}
.dsov-set-group{border-top:.5px solid var(--dsw-alias-border-l2);margin-top:20px;padding-top:16px}
.dsov-set-group:first-child{border-top:none;margin-top:0;padding-top:0}
.dsov-set-link{display:inline-flex;align-items:center;gap:6px;padding:6px 0;font-size:13px;line-height:20px;color:var(--dsw-alias-brand-primary);text-decoration:none;width:fit-content}
.dsov-set-link:hover{text-decoration:underline}
.dsov-set-group-title{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:18px;letter-spacing:.02em;margin-bottom:10px}
.dsov-set-row{align-items:center;gap:10px;padding:8px 0;display:flex}
.dsov-set-label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:400;line-height:20px}
.dsov-set-control{position:relative;flex:none;display:inline-flex}
.dsov-set-select{background:var(--dsw-alias-bg-module-platform,var(--dsw-alias-bg-layer-2));height:32px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;transition:background-color var(--ds-transition-duration,.2s) var(--ds-ease-in-out,ease-in-out);border:none;border-radius:16px;align-items:center;gap:10px;padding:0 12px;font-size:13px;line-height:20px;display:inline-flex}
.dsov-set-select:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent))}
.dsov-set-selectLabel{max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsov-set-caret{flex:none;display:inline-flex;color:var(--dsw-alias-label-secondary);transform:rotate(90deg);transition:transform .15s ease}
.dsov-set-caret[data-open=true]{transform:rotate(-90deg)}
.dsov-set-menu{position:absolute;top:calc(100% + 4px);right:0;z-index:30;min-width:140px;display:flex;flex-direction:column;padding:4px;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 6px 20px color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent)}
.dsov-set-menuItem{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.dsov-set-menuItem:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
.dsov-set-menuItem[data-selected=true]{color:var(--dsw-alias-brand-primary);font-weight:500}
.dsov-set-note{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));margin:4px 0 0;font-size:12px;line-height:1.55}
.dsov-set-note+.dsov-set-note{margin-top:2px}
.dsov-set-textrow{flex-direction:column;align-items:stretch;gap:6px}
.dsov-set-input{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4,var(--dsw-alias-border-l2));border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-2));width:100%;color:var(--dsw-alias-label-primary);font:inherit;padding:6px 12px;font-size:13px;line-height:1.5}
.dsov-set-input:focus{outline:none;border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent)}
.dsov-set-arearow{display:block}
.dsov-set-arearow .dsov-set-label{display:block;margin-bottom:6px}
.dsov-set-textarea{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4,var(--dsw-alias-border-l2));border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-2));width:100%;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:1.55;padding:8px 12px;resize:vertical}
.dsov-set-textarea:focus{outline:none;border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent)}
.dsov-set-textarea::placeholder{color:var(--dsw-alias-label-quaternary,var(--dsw-alias-label-secondary));opacity:.75}
html[data-dsov-quicknav="on"] nav:has(button[data-index][aria-label]),html[data-dsov-quicknav="on"] nav[class*="_frame"]{display:block!important}
html[data-dsov-quicknav="off"] nav:has(button[data-index][aria-label]),html[data-dsov-quicknav="off"] nav[class*="_frame"]{display:none!important}
.dsov-viking{box-sizing:border-box;height:100%;min-height:0;overflow-y:auto;padding:14px 16px 28px;display:flex;flex-direction:column;gap:10px}
.dsov-vikingHead{display:flex;align-items:flex-start;gap:8px}
.dsov-vikingIcon{flex:none;display:inline-flex;margin-top:2px;color:var(--dsw-alias-brand-primary)}
.dsov-vikingHeadText{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dsov-vikingName{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.dsov-vikingUri{font-size:11px;color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}
.dsov-vikingPath{display:flex;flex-wrap:wrap;align-items:center;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dsov-vikingPathBtn{display:inline-flex;align-items:baseline;gap:6px;max-width:100%;border:none;background:transparent;padding:1px 4px;margin:0 0 0 -4px;font:inherit;text-align:left;cursor:pointer;border-radius:6px}
.dsov-vikingPathBtn:hover{background:var(--dsw-alias-bg-layer-2)}
.dsov-vikingPathBtn:hover .dsov-vikingPathText{color:var(--dsw-alias-brand-primary);text-decoration:underline}
.dsov-vikingPathText{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}
.dsov-vikingPathHint{flex:none;font-size:10px;line-height:16px;color:var(--dsw-alias-label-secondary);opacity:.75;white-space:nowrap}
.dsov-revealErr{font-size:11px;color:var(--dsw-alias-state-error-primary,var(--dsw-alias-label-secondary));overflow-wrap:anywhere}
.dsov-revealOk{font-size:11px;color:var(--dsw-alias-state-success-primary,var(--dsw-alias-label-secondary))}
.dsov-chipBtn{font-family:inherit;font-size:9.5px;line-height:15px;padding:0 5px;border-radius:4px;cursor:pointer;border:none;margin:0;transition:color .18s ease,background-color .18s ease,opacity .18s ease}
.dsov-chipBtn:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-primary)}
.dsov-chipBtn[data-flash=pending]{opacity:.5}
.dsov-chipBtn[data-flash=ok]{color:var(--dsw-alias-state-success-primary,#34c759);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#34c759) 14%,transparent)}
.dsov-chipBtn[data-flash=err]{color:var(--dsw-alias-state-error-primary,#ff453a);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ff453a) 14%,transparent)}
.dsov-refControls{display:flex;align-items:center;gap:6px}
.dsov-typeFilter{position:relative;display:inline-flex}
.dsov-typeCount{flex:none;min-width:14px;height:14px;padding:0 3px;border-radius:7px;background:var(--dsw-alias-brand-primary);color:#fff;font-size:9.5px;line-height:14px;text-align:center;font-variant-numeric:tabular-nums}
.dsov-typeMenu{min-width:118px;max-height:240px;overflow-y:auto}
.dsov-typeCheck{flex:none;width:12px;font-size:11px;color:var(--dsw-alias-brand-primary)}
.dsov-typeChips{display:flex;flex-wrap:wrap;gap:5px;padding:2px 2px 6px}
.dsov-typeChip{display:inline-flex;align-items:center;gap:4px;font-family:inherit;font-size:10.5px;line-height:18px;padding:0 7px;border-radius:999px;cursor:pointer;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);border:.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 32%,transparent);transition:background-color .15s ease}
.dsov-typeChip:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent)}
.dsov-typeChipX{font-size:11.5px;opacity:.7;line-height:1}
.dsov-filterBtn{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;line-height:1;cursor:pointer;white-space:nowrap}
.dsov-filterBtn:hover{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
.dsov-filterBtn[data-active=true]{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.dsov-turnbar{display:flex;justify-content:flex-start;align-items:center;gap:8px;padding:0}
.dsov-turnbarScroll{flex:1 1 auto;min-width:0;display:flex;align-items:center;overflow-x:auto;overflow-y:hidden;padding-bottom:5px}
.dsov-turnbarFixed{flex:none;display:flex;align-items:center;margin-left:auto;padding-bottom:5px}
.dsov-panel .dsov-turnbarWrap{position:relative;z-index:5;margin:-14px -16px 0;padding:8px 16px 3px;background:transparent;transition:background-color .18s ease,box-shadow .18s ease}
.dsov-panel .dsov-turnbarWrap[data-stuck=true]{background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-base));box-shadow:0 6px 10px -8px color-mix(in srgb,var(--dsw-alias-label-primary) 25%,transparent)}
.dsov-view .dsov-toolbarWrap{position:relative;z-index:4;margin:-20px -28px 0;padding:10px 28px 5px;background:transparent;transition:background-color .18s ease,box-shadow .18s ease}
.dsov-view .dsov-toolbarWrap[data-stuck=true]{background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-1));backdrop-filter:var(--dsw-menu-backdrop-filter,none);box-shadow:0 6px 10px -8px color-mix(in srgb,var(--dsw-alias-label-primary) 22%,transparent)}
.dsov-stats{display:flex;align-items:center;gap:5px;margin-right:auto;flex:none}
.dsov-stat{flex:none;font-size:10.5px;line-height:18px;padding:0 8px;border-radius:999px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);white-space:nowrap;font-variant-numeric:tabular-nums}
.dsov-stat[data-tone=err]{color:var(--dsw-alias-state-error-primary,#ff453a);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ff453a) 10%,transparent)}
.dsov-statBtn{cursor:pointer;border:none;margin:0;font-family:inherit;transition:color .15s ease,background-color .15s ease}
.dsov-statBtn:hover{color:var(--dsw-alias-label-primary)}
.dsov-statBtn[data-active=true]{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.dsov-statBtn[data-scrub=true]{color:var(--dsw-alias-brand-primary)}
.dsov-timeline{display:flex;align-items:center;gap:8px;margin-top:6px}
.dsov-timelineLabel{flex:none;font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap;font-variant-numeric:tabular-nums}
.dsov-prevTurn{color:var(--dsw-alias-brand-primary,#247bbf)}
.dsov-timelineTrack{position:relative;flex:1 1 auto;min-width:0;display:flex;align-items:center}
.dsov-timelineSlider{flex:1 1 auto;min-width:0;height:18px;margin:0;cursor:pointer;accent-color:var(--dsw-alias-brand-primary)}
.dsov-timelineBubble{position:absolute;bottom:19px;left:0;transform:translateX(-50%);z-index:6;padding:1px 7px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);font-size:10.5px;line-height:16px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .12s ease;font-variant-numeric:tabular-nums}
.dsov-timelineTrack:hover .dsov-timelineBubble,.dsov-timelineSlider:focus-visible+.dsov-timelineBubble{opacity:1}
.dsov-moreSteps[disabled]{opacity:.45;cursor:default;pointer-events:none}
.dsov-newVer{display:inline-flex;align-items:center;flex:none;padding:1px 8px;border-radius:999px;font-size:11px;line-height:18px;text-decoration:none;white-space:nowrap;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);border:.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent)}
.dsov-newVer:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent)}
.dsov-set-ver{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary);padding:3px 0}
.dsov-fileMenu{position:fixed;z-index:80;min-width:190px;max-width:260px;max-height:320px;overflow-y:auto;padding:4px;border-radius:9px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);box-shadow:0 10px 30px rgba(0,0,0,.30)}
.dsov-fileMenuItem{display:flex;align-items:center;gap:7px;width:100%;padding:5px 8px;border:none;margin:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:12px;line-height:18px;text-align:left;cursor:pointer}
.dsov-fileMenuItem:hover{background:var(--dsw-alias-bg-layer-2)}
.dsov-fileMenuIcon{flex:none;width:16px;height:16px;border-radius:4px;object-fit:contain;background:var(--dsw-alias-bg-layer-2)}
.dsov-fileMenuName{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsov-fileMenuTag{flex:none;font-size:10px;line-height:14px;padding:0 5px;border-radius:999px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}
.dsov-fileMenuHead{padding:5px 8px 3px;font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.dsov-fileMenuSep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1)}
.dsov-fileMenuHint{padding:5px 8px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dsov-fileMenuErr{padding:5px 8px;font-size:11px;color:var(--dsw-alias-state-error-primary,#ff453a)}
.dsov-renderErr{margin:8px 12px 0;padding:6px 8px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary,#ff453a);font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-all;text-align:left;max-height:140px;overflow:auto}
.dsov-turnSelect{flex:none;max-width:150px;height:24px;padding:0 22px 0 9px;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 12px) 10px,calc(100% - 8px) 10px;background-size:4px 4px,4px 4px;background-repeat:no-repeat}
.dsov-turnSelect:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l3,var(--dsw-alias-border-l2))}
@keyframes dsov-spin{to{transform:rotate(360deg)}}
@keyframes dsov-pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes dsov-stepIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes dsov-stepOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-6px)}}
.dsov-step[data-enter=true]{animation:dsov-stepIn .34s ease both}
.dsov-step[data-exit=true]{position:absolute;top:0;left:0;right:0;animation:dsov-stepOut .4s ease both;pointer-events:none}
.dsov-todoSpin{transform-origin:7.5px 7.5px;animation:dsov-spin 1.1s linear infinite}
.dsov-todoPulse{animation:dsov-pulse 1.4s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.dsov-todoSpin,.dsov-todoPulse,.dsov-step[data-enter=true]{animation:none}.dsov-step[data-exit=true]{animation:none;opacity:0}}
.dsov-vikingMode{align-self:flex-start;margin-left:auto}
.dsov-seg{flex:none;display:inline-flex;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}
.dsov-segBtn{border:none;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:18px;padding:0 8px;border-radius:6px;cursor:pointer;white-space:nowrap}
.dsov-segBtn:hover{color:var(--dsw-alias-label-primary)}
.dsov-segBtn[data-active=true]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-weight:500;box-shadow:0 0 0 .5px var(--dsw-alias-border-l1)}
.dsov-refControls .dsov-seg{display:inline-flex;align-items:stretch;gap:0;padding:0;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:transparent;overflow:hidden}
.dsov-refControls .dsov-segBtn{height:19px;align-self:center;line-height:1;padding:0 9px;border:none;border-radius:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:10.5px}
.dsov-refControls .dsov-segBtn+.dsov-segBtn{border-left:.5px solid var(--dsw-alias-border-l2)}
.dsov-refControls .dsov-segBtn:hover{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
.dsov-refControls .dsov-segBtn[data-active=true]{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent);font-weight:500;box-shadow:none}
.dsov-refControls .dsov-segBtn[data-active=true]:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.dsov-vikingList{display:flex;flex-direction:column}
.dsov-vikingSize{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dsov-vikingSource{white-space:pre-wrap;overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;margin:0}
.dsov-vikingFields{display:flex;flex-direction:column;gap:10px}
.dsov-vikingDesc{font-size:13px;line-height:1.65;color:var(--dsw-alias-label-primary);margin:0;overflow-wrap:anywhere}
.dsov-vikingField{display:flex;flex-direction:column;gap:5px}
.dsov-vikingFieldLabel{font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.dsov-vikingScenarios{margin:0;padding-left:18px;font-size:12.5px;line-height:1.7;color:var(--dsw-alias-label-primary)}
.dsov-vikingTags{display:flex;flex-wrap:wrap;gap:5px}
.dsov-tag{font-size:11px;line-height:19px;padding:0 8px;border-radius:999px;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);border:.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent)}
.dsov-vikingFieldValue{font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.dsov-vikingSource{display:flex;flex-direction:column;gap:2px}
.dsov-vikingSourceLink{font-size:12.5px;line-height:1.6;color:var(--dsw-alias-brand-primary);text-decoration:none;overflow-wrap:anywhere}
.dsov-vikingSourceLink:hover{text-decoration:underline}
.dsov-vikingError{display:flex;flex-direction:column;align-items:flex-start;gap:8px;font-size:13px;color:var(--dsw-alias-state-error-primary)}
.dsov-vikingErrorDetail{font-size:12px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsov-md{font-size:13.5px;line-height:1.65;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:2px}
.dsov-md-h{font-size:14px;font-weight:600;margin:14px 0 4px;color:var(--dsw-alias-label-primary)}
.dsov-md p{margin:4px 0}
.dsov-md-list{margin:4px 0;padding-left:20px}
.dsov-md-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:1px 4px}
.dsov-md-pre{background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;overflow-x:auto;margin:6px 0}
.dsov-md-pre code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;background:none;padding:0}
.dsov-md-quote{border-left:2px solid var(--dsw-alias-border-l2);padding-left:10px;color:var(--dsw-alias-label-secondary);margin:6px 0}
.dsov-md-hr{border:none;border-top:.5px solid var(--dsw-alias-border-l2);margin:10px 0}
.dsov-md a{color:var(--dsw-alias-brand-primary);text-decoration:none}
.dsov-md a:hover{text-decoration:underline}
.dsov-ft-icon{--dsh-file-type-violet:rgb(139,118,246);color:var(--dsh-file-type-icon-color,var(--dsh-file-type-default-color))}
.dsov-ft-code{--dsh-file-type-default-color:var(--dsw-static-deepseek-500)}
.dsov-ft-excel{--dsh-file-type-default-color:var(--dsw-static-green-500)}
.dsov-ft-folder{--dsh-file-type-default-color:var(--dsw-static-amber-400)}
.dsov-ft-html{--dsh-file-type-default-color:var(--dsw-static-deepseek-500)}
.dsov-ft-image{--dsh-file-type-default-color:var(--dsh-file-type-violet)}
.dsov-ft-markdown{--dsh-file-type-default-color:var(--dsw-static-deepseek-500)}
.dsov-ft-other{--dsh-file-type-default-color:var(--dsw-static-neutral-bluish-300)}
.dsov-ft-pdf{--dsh-file-type-default-color:var(--dsw-static-red-600)}
.dsov-ft-ppt{--dsh-file-type-default-color:var(--dsw-static-amber-500)}
.dsov-ft-video{--dsh-file-type-default-color:var(--dsh-file-type-violet)}
.dsov-ft-word{--dsh-file-type-default-color:var(--dsw-static-deepseek-450)}
`;

    /* ------------------------------------------------------------------ */
    /* Plugin body                                                         */
    /* ------------------------------------------------------------------ */

    const inject = ["slots", "locale", "sessions", "sidebarRight", "sidebarRightTabs", "uiSession"];

    function apply(ctx) {
      runtime = { ctx, t: ctx.locale.bind(NS) };

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "conversation-overview: dictionaries");

      ctx.effect(() => {
        if (typeof document === "undefined") return undefined;
        if (document.querySelector(`style[data-plugin-css="${CSS_TAG}"]`) !== null) return undefined;
        const style = document.createElement("style");
        style.dataset.plugin = "dsh-conversation-overview";
        style.dataset.pluginCss = CSS_TAG;
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => {
          style.remove();
        };
      }, "conversation-overview: styles");

      ctx.effect(() => {
        let detached = null;
        let disposed = false;
        let migrated = false;
        const attach = (forms) => {
          if (disposed || !forms || typeof forms.get !== "function") return;
          configFormsRef = forms;
          const form = forms.get(ROW_ID);
          if (!form || typeof form.subscribe !== "function" || typeof form.getSnapshot !== "function") return;
          const pull = () => {
            const snapshot = form.getSnapshot();
            if (!snapshot || snapshot.status !== "ready") return;
            setFormConfig(snapshot.value);
            // Fold a browser-local fallback edit into the profile config once the Host serves the form.
            if (migrated) return;
            const overlay = readOverlay();
            if (overlay === null) return;
            migrated = true;
            if (snapshot.writable === false || typeof form.mutate !== "function") return;
            const host = normalizeConfig(snapshot.value);
            const ops = [];
            for (const field of CONFIG_FIELDS) {
              if (overlay[field] !== host[field]) ops.push({ op: "set", path: [field], value: overlay[field] });
            }
            if (ops.length === 0) {
              clearOverlayConfig();
              return;
            }
            Promise.resolve(form.mutate(ops, snapshot.revision)).then(
              (accepted) => {
                if (accepted === true) clearOverlayConfig();
              },
              () => {}
            );
          };
          detached = form.subscribe(pull);
          pull();
        };
        try {
          const pending = typeof ctx.inject === "function" ? ctx.inject(["configForms"], (deps) => attach(deps ? deps.configForms : undefined)) : null;
          if (pending && typeof pending.catch === "function") pending.catch(() => {});
        } catch (_missingSettings) {
          /* settings domain absent: boot global + local overlay stay authoritative */
        }
        return () => {
          disposed = true;
          configFormsRef = null;
          if (typeof detached === "function") detached();
        };
      }, "conversation-overview: settings sync");

      ctx.effect(() => {
        let disposeView = null;
        let disposeTabType = null;
        let disposeTabBody = null;
        const sync = () => {
          const cfg = configStore.current;
          const wantView = cfg.placement !== "sidebar";
          const wantSide = cfg.placement !== "conversation";
          if (wantView && disposeView === null) {
            disposeView = ctx.slots.inject(
              "conversation.view",
              () =>
                ctx.slots.register(
                  {
                    name: "conversation.view",
                    id: VIEW_ID,
                    order: 5,
                    locale: NS,
                    label: () => runtime.t("view.tab"),
                  },
                  ConversationOverviewView
                )
            );
          } else if (!wantView && disposeView !== null) {
            disposeView();
            disposeView = null;
          }
          if (wantSide && disposeTabType === null) {
            disposeTabType = ctx.sidebarRightTabs.register({
              id: TAB_ID,
              kind: TAB_KIND,
              title: () => runtime.t("panel.title"),
              keepMounted: true,
              guide: [
                {
                  id: "overview",
                  order: 15,
                  title: () => runtime.t("guide.title"),
                  description: () => runtime.t("guide.description"),
                  icon: OverviewGlyph,
                },
              ],
            });
            disposeTabBody = ctx.slots.inject(
              "sidebar.right.pane.tab",
              () =>
                ctx.slots.register(
                  {
                    name: "sidebar.right.pane.tab",
                    key: TAB_ID,
                    locale: NS,
                  },
                  SidebarOverviewBody
                )
            );
          } else if (!wantSide && disposeTabType !== null) {
            if (disposeTabBody !== null) {
              disposeTabBody();
              disposeTabBody = null;
            }
            disposeTabType();
            disposeTabType = null;
          }
        };
        sync();
        configStore.listeners.add(sync);
        return () => {
          configStore.listeners.delete(sync);
          if (disposeView !== null) disposeView();
          if (disposeTabBody !== null) disposeTabBody();
          if (disposeTabType !== null) disposeTabType();
        };
      }, "conversation-overview: surfaces");

      ctx.effect(
        () =>
          ctx.sidebarRightTabs.register({
            id: VIKING_TAB_ID,
            kind: VIKING_TAB_KIND,
            patterns: ["dsh-resource://viking-memory/**"],
            priority: "builtin",
            canOpen: (address) => parseVikingAddress(address) !== undefined,
            title: (address) => {
              const uri = parseVikingAddress(address);
              return uri === undefined ? String(address) : vikingName(uri);
            },
          }),
        "conversation-overview: viking tab type"
      );

      ctx.effect(
        () =>
          ctx.slots.inject(
            "sidebar.right.pane.tab",
            () =>
              ctx.slots.register(
                {
                  name: "sidebar.right.pane.tab",
                  key: VIKING_TAB_ID,
                  locale: NS,
                },
                VikingPreviewBody
              )
          ),
        "conversation-overview: viking tab body"
      );

      ctx.effect(
        () =>
          ctx.sidebarRightTabs.register({
            id: CONTEXT_TAB_ID,
            kind: CONTEXT_TAB_KIND,
            patterns: [`${CONTEXT_ADDRESS_PREFIX}**`],
            priority: "builtin",
            canOpen: (address) => parseContextAddress(address) !== undefined,
            title: (address) => {
              const key = parseContextAddress(address);
              if (key === undefined) return String(address);
              const entry = readContextPreview(key);
              return entry !== null ? entry.title : translate("context.tab");
            },
          }),
        "conversation-overview: context tab type"
      );

      ctx.effect(
        () =>
          ctx.slots.inject(
            "sidebar.right.pane.tab",
            () =>
              ctx.slots.register(
                {
                  name: "sidebar.right.pane.tab",
                  key: CONTEXT_TAB_ID,
                  locale: NS,
                },
                ContextPreviewBody
              )
          ),
        "conversation-overview: context tab body"
      );

      ctx.effect(() => {
        if (typeof document === "undefined" || !document.documentElement) return undefined;
        const applyAttr = () => {
          if (typeof document === "undefined" || !document.documentElement) return;
          document.documentElement.dataset.dsovQuicknav = configStore.current.quickNav ? "on" : "off";
        };
        applyAttr();
        configStore.listeners.add(applyAttr);
        return () => {
          configStore.listeners.delete(applyAttr);
          delete document.documentElement.dataset.dsovQuicknav;
        };
      }, "conversation-overview: quick nav");

      /* Quick-nav linkage: give each rail tick a turn-number tooltip and broadcast rail
         clicks so every open overview switches to that turn (gated by quickNavLink). */
      ctx.effect(() => {
        if (typeof document === "undefined" || !document.documentElement) return undefined;
        const RAIL_BUTTON = 'nav[class*="_frame"] button[data-index]';
        const turnOf = (button) => {
          const label = typeof button.getAttribute === "function" ? button.getAttribute("aria-label") || "" : "";
          const match = /(\d+)/.exec(label);
          return match === null ? null : Number.parseInt(match[1], 10);
        };
        const onClick = (event) => {
          if (configStore.current.quickNavLink !== true) return;
          const target = event.target;
          if (target === null || typeof target !== "object" || typeof target.closest !== "function") return;
          const button = target.closest(RAIL_BUTTON);
          if (button === null) return;
          const turn = turnOf(button);
          if (turn === null || !Number.isFinite(turn)) return;
          requestNavScope(`turn:${turn}`);
        };
        let pending = 0;
        const annotate = () => {
          pending = 0;
          if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return;
          let buttons;
          try {
            buttons = document.querySelectorAll(`${RAIL_BUTTON}[aria-label]`);
          } catch {
            return;
          }
          for (const button of buttons) {
            const label = button.getAttribute("aria-label");
            if (typeof label === "string" && label !== "" && button.getAttribute("title") !== label) button.setAttribute("title", label);
          }
        };
        const schedule = () => {
          if (pending !== 0 || typeof requestAnimationFrame !== "function") return;
          pending = requestAnimationFrame(annotate);
        };
        let observer = null;
        if (typeof MutationObserver === "function") {
          observer = new MutationObserver(schedule);
          try {
            observer.observe(document.documentElement, { childList: true, subtree: true });
          } catch {
            observer = null;
          }
        }
        document.addEventListener("click", onClick, true);
        schedule();
        return () => {
          document.removeEventListener("click", onClick, true);
          if (observer !== null) observer.disconnect();
          if (pending !== 0 && typeof cancelAnimationFrame === "function") cancelAnimationFrame(pending);
        };
      }, "conversation-overview: quick nav link");

      ctx.effect(
        () =>
          ctx.slots.inject(
            "plugins.detail.badge",
            () =>
              ctx.slots.register(
                {
                  name: "plugins.detail.badge",
                  id: "dsov-new-version",
                  order: 100,
                  locale: NS,
                },
                NewVersionBadge
              )
          ),
        "conversation-overview: new version badge"
      );

      ctx.effect(
        () =>
          ctx.slots.inject(
            "plugins.row.config",
            () =>
              ctx.slots.register(
                {
                  name: "plugins.row.config",
                  key: ROW_KEY,
                  locale: NS,
                },
                SettingsForm
              )
          ),
        "conversation-overview: settings form"
      );

      ctx.effect(
        () =>
          ctx.slots.inject(
            "settings.section",
            () =>
              ctx.slots.register(
                {
                  name: "settings.section",
                  id: "conversation-overview",
                  order: 90,
                  locale: NS,
                  label: () => runtime.t("settings.nav"),
                },
                SettingsSection
              )
          ),
        "conversation-overview: settings page"
      );
    }

    /** Diagnostics face for offline tests; the runner only reads `inject`/`apply`. */
    const _test = {
      zh,
      en,
      createFolder,
      foldEvent,
      foldEntry,
      buildState,
      planTodoAttachments,
      vikingLabel,
      vikingRefKind,
      vikingIsDir,
      normalizeSelection,
      vikingParentUri,
      rememberContextPreview,
      readContextPreview,
      contextPreviewAddress,
      parseContextAddress,
      mentionsOfUserText,
      mutationPath,
      fileAddressFor,
      contextLabel,
      contextDetail,
      extractVikingUris,
      classifyFileType,
      isChangesSummary,
      changesReviewAddress,
      absPath,
      normalizeConfig,
      setFormConfig,
      setOverlayConfig,
      clearOverlayConfig,
      compareVersions,
      ProgressSection,
      ArtifactsSection,
      ReferencesSection,
      StatsBar,
      ArtifactFileMenu,
      OverviewGlyph,
      OverviewContent,
      OverviewBoundary,
      SettingsForm,
      SettingsSection,
      vikingName,
      vikingAddress,
      parseVikingAddress,
      mdToHtml,
      parseFrontmatter,
      frontmatterTitle,
      vikingSegments,
      formatBytes,
      sortReferences,
      setRefSort,
      getRefSort: () => refSortStore.mode,
      setHideCommonRefs,
      getHideCommonRefs: () => refCommonStore.hidden,
      setRefTypes,
      getRefTypes: () => refTypesStore.kinds,
      refDisplayType,
      stepDetail,
      stepFull,
      teamStepKey,
      formatDuration,
      rerunPrompt,
      insertIntoComposer,
      requestNavScope,
      readNavScope: () => ({ rev: navScopeStore.rev, selection: navScopeStore.selection }),
      renderFrontmatterFields,
    };

    return { inject, apply, _test };
  },
});
