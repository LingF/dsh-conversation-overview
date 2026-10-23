/* Offline structural + fold test for dsh-conversation-overview.
 * Loads client.js with a stubbed module loader and React, then:
 *  1. checks zh/en dictionary key parity
 *  2. exercises apply() against a mock ctx and asserts registrations
 *  3. folds real session-log events and asserts the derived summary
 *  4. unit-checks mention/mutation/address helpers
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
const clientSource = readFileSync(new URL("../client.js", import.meta.url), "utf8");

/* ---- stub environment -------------------------------------------------- */
let captured = null;
globalThis.window = {
  __ModuleLoader__: {
    load(registration) {
      captured = registration;
    },
  },
};
globalThis.document = undefined; // apply() guards on typeof document

let hookStates = [];
let hookIndex = 0;
/* index-only reset models a re-render of the same tree; full reset starts a fresh instance */
function resetHooks(full = false) {
  if (full) hookStates = [];
  hookIndex = 0;
}
const ReactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Component: class {},
  useMemo: () => null,
  useEffect: () => {},
  useState: (init) => {
    const i = hookIndex++;
    if (!(i in hookStates)) hookStates[i] = typeof init === "function" ? init() : init;
    return [hookStates[i], (v) => { hookStates[i] = typeof v === "function" ? v(hookStates[i]) : v; }];
  },
  useRef: (init) => ({ current: init === undefined ? null : init }),
  useCallback: (fn) => fn,
  useId: () => "stub",
  useSyncExternalStore: () => null,
};

const jsxStub = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
};

eval(clientSource); // registers into globalThis.window.__ModuleLoader__
const mod = captured.factory((specifier) => {
  if (specifier === "react") return ReactStub;
  if (specifier === "react/jsx-runtime") return jsxStub;
  throw new Error(`unexpected require: ${specifier}`);
});

assert.deepEqual(mod.inject, ["slots", "locale", "sessions", "sidebarRight", "sidebarRightTabs", "uiSession"]);
assert.equal(typeof mod.apply, "function");
const T = mod._test;

/* ---- 1. dictionary parity --------------------------------------------- */
const zhKeys = Object.keys(T.zh).sort();
const enKeys = Object.keys(T.en).sort();
assert.deepEqual(enKeys, zhKeys, "zh/en dictionaries must share the key set");

/* ---- 2. apply() registrations + config gating --------------------------- */
const requireStub = (specifier) => {
  if (specifier === "react") return ReactStub;
  if (specifier === "react/jsx-runtime") return jsxStub;
  throw new Error(`unexpected require: ${specifier}`);
};

function materialize(globalConfig, options = {}) {
  if (globalConfig === undefined) delete globalThis.__DSH_CONVERSATION_OVERVIEW_CONFIG__;
  else globalThis.__DSH_CONVERSATION_OVERVIEW_CONFIG__ = globalConfig;
  const instance = captured.factory(requireStub);
  instance._test.clearOverlayConfig(); // isolate scenarios from any persisted browser storage
  const registrations = [];
  const disposals = [];
  const cleanups = [];
  let dictionary = null;
  const docStub = options.doc
    ? {
        documentElement: { dataset: {} },
        querySelector: () => null,
        createElement: () => ({ dataset: {}, remove() {} }),
        head: { appendChild() {} },
        addEventListener() {},
        removeEventListener() {},
      }
    : undefined;
  const mockCtx = {
    locale: {
      register(ns, dicts) {
        dictionary = { ns, dicts };
        return () => {};
      },
      bind: () => (key) => key,
      subscribe: () => () => {},
    },
    effect(fn) {
      const dispose = fn();
      if (typeof dispose === "function") cleanups.push(dispose);
      return typeof dispose === "function" ? dispose : () => {};
    },
    inject(list, fn) {
      try {
        return Promise.resolve(fn({}));
      } catch (error) {
        return Promise.reject(error);
      }
    },
    slots: {
      inject(owner, cb) {
        const dispose = cb();
        return () => {
          disposals.push(owner);
          if (typeof dispose === "function") dispose();
        };
      },
      register(regOptions, Component) {
        registrations.push({ options: regOptions, Component });
        return () => {
          disposals.push(`register:${regOptions.name}`);
        };
      },
    },
    sidebarRightTabs: {
      register(def) {
        registrations.push({ tabType: def });
        return () => {
          disposals.push(`tabType:${def.kind}`);
        };
      },
    },
    sidebarRight: {},
    sessions: { binding: () => null, list: { getSnapshot: () => ({ byId: {} }) } },
  };
  /* the doc stub stays installed for the scenario; the next materialize replaces it */
  globalThis.document = docStub;
  instance.apply(mockCtx);
  return { instance, registrations, disposals, cleanups, docStub, dictionary: () => dictionary };
}

const findReg = (scenario, name) => scenario.registrations.find((r) => r.options && r.options.name === name);
const tabTypesOf = (scenario) => scenario.registrations.filter((r) => r.tabType).map((r) => r.tabType);
const bodiesOf = (scenario, name) => scenario.registrations.filter((r) => r.options && r.options.name === name);

/* scenario A: no boot global -> defaults, every surface registered */
const both = materialize(undefined, { doc: true });
assert.ok(both.dictionary() && both.dictionary().ns === "conversationOverview", "dictionary registered");
const view = findReg(both, "conversation.view");
assert.ok(view, "conversation.view registered");
assert.equal(view.options.id, "overview");
assert.equal(view.options.order, 5);
assert.equal(view.options.label(), "view.tab");
assert.equal(typeof view.Component, "function");
const tabTypes = tabTypesOf(both);
const tabType = tabTypes.find((d) => d.kind === "conversation-overview");
assert.ok(tabType, "sidebar tab type registered");
assert.equal(tabType.keepMounted, true);
assert.equal(tabType.guide.length, 1);
assert.equal(tabType.guide[0].id, "overview");
assert.equal(typeof tabType.guide[0].icon, "function");
assert.equal(tabType.title(), "panel.title");
const vikingType = tabTypes.find((d) => d.kind === "viking-memory");
assert.ok(vikingType, "viking tab type registered");
assert.deepEqual(vikingType.patterns, ["dsh-resource://viking-memory/**"]);
assert.equal(vikingType.priority, "builtin");
assert.equal(vikingType.canOpen("dsh-resource://viking-memory/viking%3A%2F%2Fuser%2Fa.md"), true);
assert.equal(vikingType.canOpen("dsh-resource://file/x"), false);
assert.equal(vikingType.title("dsh-resource://viking-memory/viking%3A%2F%2Fuser%2Fnotes%2Fx.md"), "x");
const paneBodies = bodiesOf(both, "sidebar.right.pane.tab");
assert.ok(paneBodies.some((b) => b.options.key === "dsh-conversation-overview/overview"), "overview body registered");
const vikingBody = paneBodies.find((b) => b.options.key === "dsh-conversation-overview/viking");
assert.ok(vikingBody, "viking body registered");
assert.equal(typeof vikingBody.Component, "function");
const rowConfig = findReg(both, "plugins.row.config");
assert.ok(rowConfig, "settings form registered");
assert.equal(rowConfig.options.key, "dsh-conversation-overview#conversation-overview");
assert.equal(typeof rowConfig.Component, "function");
const settingsPage = findReg(both, "settings.section");
assert.ok(settingsPage, "settings page registered");
assert.equal(settingsPage.options.id, "conversation-overview");
assert.equal(settingsPage.options.label(), "settings.nav");
assert.equal(typeof settingsPage.Component, "function");
/* quick nav attribute lifecycle */
assert.equal(both.docStub.documentElement.dataset.dsovQuicknav, "on", "quick nav forced on by default");
both.instance._test.setOverlayConfig({ quickNav: false });
assert.equal(both.docStub.documentElement.dataset.dsovQuicknav, "off", "quick nav toggle applies live");
for (const cleanup of both.cleanups) cleanup();
assert.equal(both.docStub.documentElement.dataset.dsovQuicknav, undefined, "quick nav attribute removed on dispose");

/* scenario B: placement=conversation -> no overview sidebar surfaces, viking tab kept */
const conv = materialize({ placement: "conversation" });
assert.ok(findReg(conv, "conversation.view"), "view kept for conversation placement");
assert.ok(!tabTypesOf(conv).some((d) => d.kind === "conversation-overview"), "overview sidebar tab type skipped");
assert.ok(tabTypesOf(conv).some((d) => d.kind === "viking-memory"), "viking tab type kept");
assert.ok(!bodiesOf(conv, "sidebar.right.pane.tab").some((b) => b.options.key === "dsh-conversation-overview/overview"), "overview body skipped");
assert.ok(bodiesOf(conv, "sidebar.right.pane.tab").some((b) => b.options.key === "dsh-conversation-overview/viking"), "viking body kept");
assert.ok(findReg(conv, "plugins.row.config"), "settings form kept");

/* scenario C: placement=sidebar -> no conversation view */
const side = materialize({ placement: "sidebar" });
assert.ok(!findReg(side, "conversation.view"), "view skipped for sidebar placement");
assert.ok(tabTypesOf(side).some((d) => d.kind === "conversation-overview"), "sidebar tab type kept");
assert.ok(bodiesOf(side, "sidebar.right.pane.tab").some((b) => b.options.key === "dsh-conversation-overview/overview"), "sidebar body kept");
assert.ok(findReg(side, "plugins.row.config"), "settings form kept");

/* scenario D: live config changes dispose and re-register surfaces */
const live = materialize({});
live.instance._test.setOverlayConfig({ placement: "conversation" });
assert.ok(live.disposals.includes("sidebar.right.pane.tab"), "sidebar body disposed on placement change");
assert.ok(live.disposals.includes("tabType:conversation-overview"), "sidebar tab type disposed on placement change");
assert.ok(!live.disposals.includes("conversation.view"), "view kept on placement change");
assert.ok(!live.disposals.includes("tabType:viking-memory"), "viking tab type untouched by placement change");
const before = live.registrations.length;
live.instance._test.setFormConfig({ placement: "both" });
assert.ok(live.registrations.length > before, "sidebar surfaces re-registered");
const afterResync = live.registrations.length;
live.instance._test.setFormConfig({ placement: "both" });
assert.equal(live.registrations.length, afterResync, "idempotent update adds nothing");
/* host form value outranks the overlay */
live.instance._test.setOverlayConfig({ placement: "sidebar" });
assert.equal(live.registrations.length, afterResync, "overlay ignored once the host form is ready");

/* scenario E: normalizeConfig units */
assert.deepEqual(T.normalizeConfig(undefined), {
  showProgress: true,
  showArtifacts: true,
  showReferences: true,
  placement: "both",
  sectionFullHeight: false,
  quickNav: true,
  quickNavLink: true,
  vikingPreview: true,
  vikingUrl: "http://127.0.0.1:1933",
  vikingAccount: "",
  vikingUser: "",
});
assert.equal(T.normalizeConfig({ showProgress: false, placement: "sidebar", quickNav: false }).quickNav, false);
assert.equal(T.normalizeConfig({ vikingPreview: false }).vikingPreview, false);
assert.equal(T.normalizeConfig({ sectionFullHeight: true }).sectionFullHeight, true);
assert.equal(T.normalizeConfig({ sectionFullHeight: "yes" }).sectionFullHeight, false);
assert.equal(T.normalizeConfig({ vikingUrl: "http://x:1/" }).vikingUrl, "http://x:1");
assert.equal(T.normalizeConfig({ vikingAccount: "  " }).vikingAccount, "");
assert.deepEqual(T.normalizeConfig({ placement: "nope", showArtifacts: "x", showReferences: null }).placement, "both");

/* tree helpers: expand component nodes and collect matches */
function expand(node) {
  if (Array.isArray(node)) return node.map(expand);
  if (node && typeof node === "object") {
    if (typeof node.type === "function" && node.props) return expand(node.type(node.props));
    return { type: node.type, props: node.props, children: expand(node.children) };
  }
  return node;
}
function collect(tree, pred, out = [], seen = new Set()) {
  if (Array.isArray(tree)) {
    tree.forEach((n) => collect(n, pred, out, seen));
    return out;
  }
  if (tree && typeof tree === "object") {
    if (seen.has(tree)) return out;
    seen.add(tree);
    if (pred(tree)) out.push(tree);
    collect(tree.children, pred, out, seen);
  }
  return out;
}
const selectButtons = (tree) => collect(tree, (n) => n.type === "button" && n.props && n.props.className === "dsov-set-select");
const menuItems = (tree) => collect(tree, (n) => n.type === "button" && n.props && n.props.className === "dsov-set-menuItem");
const textInputs = (tree) => collect(tree, (n) => n.type === "input" && n.props && n.props.className === "dsov-set-input");
const selectLabel = (button) => {
  const node = collect(button, (n) => n.props && n.props.className === "dsov-set-selectLabel")[0];
  return node ? node.children[0] : undefined;
};
function renderForm(host, props) {
  resetHooks();
  return expand(host.instance._test.SettingsForm(props));
}

/* scenario F: SettingsForm renders summary and page states */
const formHost = materialize(undefined);
const keyT = (key) => key;
resetHooks(true);
assert.ok(expand(formHost.instance._test.SettingsForm({ view: "summary", t: keyT })), "summary view renders");
const mutations = [];
const formProps = {
  view: "page",
  t: keyT,
  form: {
    state: { status: "ready", value: { showProgress: false, showArtifacts: true, showReferences: true, placement: "sidebar" }, writable: true, revision: 7 },
    mutate: (ops, revision) => { mutations.push({ ops, revision }); return Promise.resolve(true); },
  },
};
const pageForm = renderForm(formHost, formProps);
const selects = selectButtons(pageForm);
assert.equal(selects.length, 8, "section selects + full height + quick nav + link + placement + viking preview");
assert.equal(selectLabel(selects[0]), "settings.off", "showProgress=false reflected");
assert.equal(selectLabel(selects[1]), "settings.on", "showArtifacts=true reflected");
assert.equal(selectLabel(selects[3]), "settings.on", "quickNav defaults on");
assert.equal(selectLabel(selects[4]), "settings.on", "quickNavLink defaults on");
assert.equal(selectLabel(selects[5]), "settings.placement.sidebar", "placement=sidebar reflected");
assert.equal(selectLabel(selects[6]), "settings.off", "sectionFullHeight defaults off, grouped with placement");
const formInputs = textInputs(pageForm);
assert.equal(formInputs.length, 3, "viking url/account/user inputs");
assert.deepEqual(formInputs.map((i) => i.props.value), ["http://127.0.0.1:1933", "", ""]);
/* open the placement menu and pick an option */
selects[5].props.onClick();
const opened = renderForm(formHost, formProps);
const items = menuItems(opened);
assert.ok(items.length >= 3, "placement menu rendered");
const convItem = items.find((n) => n.children[0] === "settings.placement.conversation");
assert.ok(convItem, "conversation option present");
convItem.props.onClick();
assert.deepEqual(mutations.at(-1), { ops: [{ op: "set", path: ["placement"], value: "conversation" }], revision: 7 }, "select writes one field op");
/* boolean row writes true/false */
resetHooks();
const reopened = renderForm(formHost, formProps);
const selects2 = selectButtons(reopened);
selects2[1].props.onClick();
const opened2 = renderForm(formHost, formProps);
const offItem = menuItems(opened2).find((n) => n.children[0] === "settings.off");
offItem.props.onClick();
assert.deepEqual(mutations.at(-1), { ops: [{ op: "set", path: ["showArtifacts"], value: false }], revision: 7 }, "boolean select maps to false");
/* same option click is a no-op */
const beforeCount = mutations.length;
resetHooks();
const reopened3 = renderForm(formHost, formProps);
selectButtons(reopened3)[1].props.onClick();
const opened3 = renderForm(formHost, formProps);
menuItems(opened3).find((n) => n.children[0] === "settings.on").props.onClick();
assert.equal(mutations.length, beforeCount, "selecting the current value writes nothing");
/* text input commits on blur */
resetHooks();
const textForm = renderForm(formHost, formProps);
const user2 = textInputs(textForm)[2];
user2.props.onFocus();
user2.props.onChange({ target: { value: "alice" } });
const editing = renderForm(formHost, formProps);
assert.equal(textInputs(editing)[2].props.value, "alice", "draft shown while focused");
textInputs(editing)[2].props.onBlur();
assert.deepEqual(mutations.at(-1), { ops: [{ op: "set", path: ["vikingUser"], value: "alice" }], revision: 7 }, "blur commits the text field");

/* scenario G: SettingsForm overlay path without a host form */
const localHost = materialize(undefined);
const localProps = { view: "page", t: keyT };
resetHooks(true);
const localForm = renderForm(localHost, localProps);
const localSelects = selectButtons(localForm);
assert.equal(localSelects.length, 8, "fallback form renders all controls");
assert.equal(selectLabel(localSelects[5]), "settings.placement.both", "default placement shown");
localSelects[3].props.onClick();
const localOpened = renderForm(localHost, localProps);
menuItems(localOpened).find((n) => n.children[0] === "settings.off").props.onClick();
const afterOverlay = renderForm(localHost, localProps);
assert.equal(selectLabel(selectButtons(afterOverlay)[3]), "settings.off", "overlay edit reflected on rerender");
/* placement through the overlay too */
selectButtons(afterOverlay)[5].props.onClick();
const localOpened2 = renderForm(localHost, localProps);
menuItems(localOpened2).find((n) => n.children[0] === "settings.placement.sidebar").props.onClick();
const afterOverlay2 = renderForm(localHost, localProps);
assert.equal(selectLabel(selectButtons(afterOverlay2)[5]), "settings.placement.sidebar", "overlay placement edit persisted");
assert.ok(localHost.disposals.includes("conversation.view"), "overlay placement change disposed the conversation view");

/* viking preview toggle gates the text rows */
assert.equal(selectLabel(selectButtons(afterOverlay2)[7]), "settings.on", "vikingPreview defaults on");
assert.equal(textInputs(afterOverlay2).length, 3, "viking text rows visible while enabled");
selectButtons(afterOverlay2)[7].props.onClick();
const vikingOpened = renderForm(localHost, localProps);
menuItems(vikingOpened).find((n) => n.children[0] === "settings.off").props.onClick();
const vikingOff = renderForm(localHost, localProps);
assert.equal(selectLabel(selectButtons(vikingOff)[7]), "settings.off", "vikingPreview toggled off");
assert.equal(textInputs(vikingOff).length, 0, "viking text rows hidden while disabled");
const offNote = collect(vikingOff, (n) => n.type === "div" && n.props && n.props.className === "dsov-set-note" && n.children[0] === "settings.vikingOffNote");
assert.ok(offNote.length > 0, "off note rendered");
selectButtons(vikingOff)[7].props.onClick();
menuItems(renderForm(localHost, localProps)).find((n) => n.children[0] === "settings.on").props.onClick();
assert.equal(textInputs(renderForm(localHost, localProps)).length, 3, "text rows return after re-enabling");

/* scenario H: standalone settings page renders */
resetHooks(true);
const page = expand(localHost.instance._test.SettingsSection());
assert.ok(page && page.props.className === "dsov-settingsPage", "settings section page renders");
assert.ok(selectButtons(page).length === 8, "settings page embeds the form");

/* ---- 3. fold real session events ---------------------------------------- */
function loadEvents(file) {
  const out = execFileSync("zstdcat", [file], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  const events = [];
  for (const line of out.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      /* header/partial line */
    }
  }
  return events;
}

function foldFolder(events) {
  const folder = T.createFolder();
  for (const event of events) T.foldEntry(folder, { type: "durable", event });
  folder.changed = false;
  return folder;
}

const FOLD_WINDOW = { hasMore: false, entries: [] };

function foldAll(events) {
  return T.buildState(foldFolder(events), FOLD_WINDOW, 0, "all");
}

const logs = process.argv.slice(2);
assert.ok(logs.length > 0, "pass at least one session.v4.jsonl.zstd path");
for (const log of logs) {
  const events = loadEvents(log);
  const state = foldAll(events);
  const counts = {
    todoWrites: events.filter((e) => e.type === "todo/write").length,
    presented: events.filter((e) => e.type === "deliverables/presented").length,
    changes: events.filter((e) => e.type === "workspace/changes").length,
    injections: events.filter((e) => e.type === "user/message" && e.data && e.data.source && e.data.source.kind !== "user").length,
    skills: events.filter((e) => e.type === "tool/call" && e.data && e.data.name === "skill").length,
    userMsgs: events.filter((e) => e.type === "user/message" && e.data && e.data.source && e.data.source.kind === "user").length,
  };
  console.log(`\n### ${log.split("/").slice(-2).join("/")}  events=${events.length}`);
  console.log("  log counts:", JSON.stringify(counts));
  console.log("  todos:", state.todos ? state.todos.length : null, "artifacts:", state.artifacts.length, "references:", state.references.length, "changeTurns:", state.changeTurns.length);
  if (counts.todoWrites > 0) assert.ok(Array.isArray(state.todos) && state.todos.length >= 0, "todos folded");
  if (counts.presented > 0) assert.ok(state.artifacts.some((a) => a.presented), "presented artifacts folded");
  if (counts.injections > 0) assert.ok(state.references.some((r) => r.kind !== "file"), "context references folded");
  if (counts.skills > 0) assert.ok(state.references.some((r) => r.kind === "skill"), "skill references folded");
  /* viking:// memory refs are split into clickable memory-file rows */
  const memFiles = state.references.filter((r) => r.kind === "memory-file");
  for (const ref of memFiles) {
    assert.ok(typeof ref.uri === "string" && ref.uri.startsWith("viking://"), `memory-file uri: ${ref.uri}`);
    assert.equal(ref.label, T.vikingName(ref.uri), "memory-file label is the uri name");
  }
  const vikingInjections = events.filter(
    (e) => e.type === "user/message" && e.data && e.data.source && String(e.data.source.kind || "").startsWith("plugin:openviking") && JSON.stringify(e.data.content || "").includes("viking://")
  );
  const vikingReads = events.filter((e) => e.type === "tool/call" && e.data && /mcp__openviking__/i.test(String(e.data.name)) && JSON.stringify(e.data.arguments || "").includes("viking://"));
  if (vikingInjections.length + vikingReads.length > 0) assert.ok(memFiles.length > 0, "viking uris folded into memory-file refs");
  console.log("  memory-file refs:", memFiles.length, memFiles.slice(0, 3).map((r) => r.label).join(", "));
  assert.equal(state.changeTurns.length, counts.changes, "workspace/changes turns folded");
  for (const turn of state.changeTurns) {
    assert.ok(Number.isSafeInteger(turn.seq) && Number.isSafeInteger(turn.turn) && turn.turn >= 1, `turn coords: ${JSON.stringify(turn)}`);
  }
  if (state.changeTurns.length > 0) console.log("   changeTurns:", JSON.stringify(state.changeTurns.slice(0, 4)));
  /* per-turn views */
  const folder2 = foldFolder(events);
  const turnStarts = events.filter((e) => e.type === "turn/start").map((e) => e.data.turn);
  assert.deepEqual(state.turns, [...new Set(turnStarts)].filter((n) => Number.isSafeInteger(n) && n >= 1).sort((a, b) => a - b), "turns tracked from turn/start");
  assert.equal(state.latestTurn, state.turns.length > 0 ? Math.max(...state.turns) : null, "latestTurn is the max");
  if (state.latestTurn !== null) {
    const latest = T.buildState(folder2, FOLD_WINDOW, 0, "latest");
    assert.equal(latest.scope, "latest");
    assert.ok(latest.references.length <= state.references.length, "latest turn refs subset of all");
    for (const change of latest.changeTurns) assert.equal(change.turn, state.latestTurn, "latest view changeTurns belong to the latest turn");
    const scoped = T.buildState(folder2, FOLD_WINDOW, 0, `turn:${state.turns[0]}`);
    assert.equal(scoped.scope, `turn:${state.turns[0]}`);
    assert.ok(scoped.references.length + scoped.artifacts.length <= state.references.length + state.artifacts.length, "turn view is a slice");
    console.log("  latest turn:", state.latestTurn, "refs:", latest.references.length, "arts:", latest.artifacts.length, "| all refs:", state.references.length, "arts:", state.artifacts.length, "| turns:", state.turns.join(","));
  }
  for (const ref of state.references.slice(0, 8)) {
    console.log(`   ref [${ref.kind}${ref.form ? "/" + ref.form : ""}] ${ref.label} x${ref.count}${ref.detail && ref.detail.length ? " | " + ref.detail.slice(0, 3).join(", ") : ""}`);
  }
  for (const artifact of state.artifacts.slice(0, 8)) {
    console.log(`   art [${artifact.presented ? "presented" : "produced"}] ${artifact.path}`);
  }
  if (state.todos) for (const todo of state.todos.slice(0, 8)) console.log(`   todo [${todo.status}] ${todo.content}`);
}

/* ---- 4. helper unit checks ---------------------------------------------- */
const m1 = T.mentionsOfUserText('看 @src/main.ts 和 @"path with space/a.md"，还有 email a@b.com 与 @[标题](dsh-session:abc) 以及 `@code/x` 与 @https://x.com');
assert.deepEqual(m1.files.sort(), ["path with space/a.md", "src/main.ts"], `mention files: ${JSON.stringify(m1.files)}`);
assert.deepEqual(m1.sessions, ["标题"]);
assert.equal(T.mutationPath("write", JSON.stringify({ file_path: "/a/b.ts", content: "x" })), "/a/b.ts");
assert.equal(T.mutationPath("write", JSON.stringify({ file_path: "/a/b.ts" })), null);
assert.equal(T.mutationPath("edit", JSON.stringify({ file_path: "/a/b.ts", old_string: "x", new_string: "y" })), "/a/b.ts");
assert.equal(T.mutationPath("str_replace_editor", JSON.stringify({ command: "create", path: "/a/c.py", file_text: "t" })), "/a/c.py");
assert.equal(T.mutationPath("bash", JSON.stringify({ command: "rm x" })), null);
assert.equal(T.fileAddressFor("s-1", "/work/proj", "/work/proj/a b.ts"), "dsh-resource://file/session/s-1/a%20b.ts");
assert.equal(T.fileAddressFor("s-1", "/work/proj", "/elsewhere/x.ts"), "dsh-resource://file/session/s-1//elsewhere/x.ts");
assert.equal(T.fileAddressFor("s-1", "/work/proj", "rel/y.ts"), "dsh-resource://file/session/s-1/rel/y.ts");
assert.equal(T.contextLabel({ kind: "plugin:openviking-memory", plugin: "openviking-memory" }, "plugin:openviking-memory"), "openviking-memory");
const detail = T.contextDetail({ kind: "plugin:openviking-memory" }, [{ type: "text", text: '<memory uri="viking://user/a/b.md" /> see viking://user/c.md' }]);
assert.deepEqual(detail, ["viking://user/a/b.md", "viking://user/c.md"]);
const punctuated = T.contextDetail({ kind: "plugin:openviking-memory" }, [{ type: "text", text: "见 viking://user/c/plan.md。还有 viking://user/c/x.md," }]);
assert.deepEqual(punctuated, ["viking://user/c/plan.md", "viking://user/c/x.md"], "trailing punctuation stripped from extracted uris");
/* quoted extraction recovers URIs containing spaces; truncated bare prefixes are dropped */
const spacedText = '<memory uri="viking://user/alice/memories/preferences/alice/大 json 前端渲染方案.md" type="preferences" score="0.83" />';
assert.deepEqual(T.extractVikingUris(spacedText), ["viking://user/alice/memories/preferences/alice/大 json 前端渲染方案.md"], "quoted uri keeps inner spaces");
assert.equal(T.vikingName(T.extractVikingUris(spacedText)[0]), "大 json 前端渲染方案", "display name uses the full segment");
assert.deepEqual(T.extractVikingUris('uri="viking://a/b c.md" 以及 viking://a/b'), ["viking://a/b c.md"], "space-truncated bare prefix dropped");
assert.deepEqual(T.extractVikingUris("viking://a/dir viking://a/dir/sub.md"), ["viking://a/dir", "viking://a/dir/sub.md"], "slash-child uri is not a space prefix");

/* ---- 5. file-type classification + changes helpers ---------------------- */
assert.equal(T.classifyFileType("src/client.js"), "javascript");
assert.equal(T.classifyFileType("/a/b/client.ts"), "typescript");
assert.equal(T.classifyFileType("README.md"), "markdown");
assert.equal(T.classifyFileType("icon.svg"), "image");
assert.equal(T.classifyFileType("package.json"), "node"); // host FILE_NAME_TYPES: package.json gets the node icon
assert.equal(T.classifyFileType("data.json"), "json");
assert.equal(T.classifyFileType("Dockerfile"), "docker");
assert.equal(T.classifyFileType("app.vue"), "vue");
assert.equal(T.classifyFileType("data.xlsx"), "excel");
assert.equal(T.classifyFileType("notes.unknownext"), "other");
assert.ok(
  T.isChangesSummary({ turn: 1, total: 1, added: 3, deleted: 1, files: [{ path: "a.ts", display: "a.ts", added: 3, deleted: 1 }] }),
  "valid summary accepted"
);
assert.ok(!T.isChangesSummary({ turn: 0, total: 0, added: 0, deleted: 0, files: [] }), "turn 0 rejected");
assert.ok(!T.isChangesSummary({ turn: 1, total: 1, added: 0, deleted: 0, files: [{ path: "", display: "x", added: 0, deleted: 0 }] }), "bad file rejected");
assert.equal(T.changesReviewAddress("s 1", 55, 2), "dsh-resource://changes-review/session/s%201/55/2");
assert.equal(T.absPath("/work/proj", "rel/a.ts"), "/work/proj/rel/a.ts");
assert.equal(T.absPath("/work/proj", "/abs/b.ts"), "/abs/b.ts");
assert.equal(T.absPath("/work/proj/", "rel/a.ts"), "/work/proj/rel/a.ts");

/* ---- 6. viking helpers + markdown renderer ------------------------------ */
assert.equal(T.vikingName("viking://user/a/notes/plan.md"), "plan");
assert.equal(T.vikingName("viking://user/a/dir/"), "dir");
assert.equal(T.vikingName("viking://x"), "x");
assert.equal(T.vikingName("viking://"), "viking:");
const vAddr = T.vikingAddress("viking://user/a b.md");
assert.equal(vAddr, "dsh-resource://viking-memory/viking%3A%2F%2Fuser%2Fa%20b.md");
assert.equal(T.parseVikingAddress(vAddr), "viking://user/a b.md");
assert.equal(T.parseVikingAddress("dsh-resource://viking-memory/https%3A%2F%2Fx"), undefined);
assert.equal(T.parseVikingAddress("dsh-resource://file/x"), undefined);
assert.equal(T.parseVikingAddress("dsh-resource://viking-memory/%E0%A4%A"), undefined);
const html = T.mdToHtml("# Title\n\ntext **bold** and <script>alert(1)</script>\n\n- a\n- b\n\n1. one\n2. two\n\n> quote\n\n```\ncode <b>\n```\n\n[link](https://example.com)");
assert.ok(html.includes('<h2 class="dsov-md-h">Title</h2>'), `heading rendered: ${html.slice(0, 80)}`);
assert.ok(html.includes("<strong>bold</strong>"), "bold rendered");
assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "html escaped");
assert.ok(!html.includes("<script>"), "no raw script");
assert.ok(html.includes('<ul class="dsov-md-list"><li>a</li><li>b</li></ul>'), "unordered list");
assert.ok(html.includes('<ol class="dsov-md-list"><li>one</li>'), "ordered list");
assert.ok(html.includes('<blockquote class="dsov-md-quote">quote</blockquote>'), "blockquote");
assert.ok(html.includes("<pre") && html.includes("code &lt;b&gt;"), "fenced code escaped");
assert.ok(html.includes('<a href="https://example.com" target="_blank" rel="noreferrer noopener">link</a>'), "external link");
assert.ok(!T.mdToHtml("a<b").includes("<b>"), "bare angle brackets escaped");

/* ---- 7. frontmatter, breadcrumbs, reference sorting ---------------------- */
const sample = [
  "---",
  'title: "前端文件加密检测能力实现"',
  "usage_scenario:",
  '    - "验收文件上传安全能力是否满足客户要求"',
  '    - "新增类似文件检测场景时复用detectFileEncrypted逻辑"',
  "keywords:",
  '    - "文件加密检测"',
  '    - "detectFileEncrypted"',
  "---",
  "",
  "项目已实现前端文件加密检测核心能力。",
].join("\n");
const fm = T.parseFrontmatter(sample);
assert.deepEqual(fm.fields.map((f) => f.key), ["title", "usage_scenario", "keywords"]);
assert.equal(T.frontmatterTitle(fm.fields), "前端文件加密检测能力实现");
assert.deepEqual(fm.fields[1].items, ["验收文件上传安全能力是否满足客户要求", "新增类似文件检测场景时复用detectFileEncrypted逻辑"]);
assert.deepEqual(fm.fields[2].items, ["文件加密检测", "detectFileEncrypted"]);
assert.equal(fm.body.trim(), "项目已实现前端文件加密检测核心能力。");
const noFm = T.parseFrontmatter("# plain\n\ntext");
assert.deepEqual(noFm.fields, []);
assert.equal(noFm.body, "# plain\n\ntext");
const skillFm = T.parseFrontmatter("---\nname: xunshan-api-migration\ndescription: Migrate or replace an API\n  call spanning lines.\ntags:\n- api\n- typescript\n---\nbody");
assert.equal(T.frontmatterTitle(skillFm.fields), "xunshan-api-migration");
assert.equal(skillFm.fields.find((f) => f.key === "description").value, "Migrate or replace an API call spanning lines.");
assert.deepEqual(skillFm.fields.find((f) => f.key === "tags").items, ["api", "typescript"]);
const rendered = T.renderFrontmatterFields(fm, keyT);
const flat = JSON.stringify(rendered, (key, value) => (typeof value === "function" ? "[fn]" : value));
assert.ok(flat.includes("viking.field.scenarios"), "scenarios block rendered");
assert.ok(flat.includes("viking.field.keywords"), "keywords block rendered");
assert.ok(flat.includes("文件加密检测"), "keyword value rendered");
assert.ok(!flat.includes('"title"'), "title consumed as heading, not a field row");

/* breadcrumbs */
const segs = T.vikingSegments("viking://user/alice/memories/x.md");
assert.deepEqual(segs.map((s) => s.name), ["user", "alice", "memories", "x.md"]);
assert.equal(segs[0].uri, "viking://user/");
assert.equal(segs[2].uri, "viking://user/alice/memories/");
assert.equal(segs[3].leaf, true);
assert.equal(segs[3].uri, "viking://user/alice/memories/x.md");
const dirSegs = T.vikingSegments("viking://user/alice/skills/");
assert.equal(dirSegs.at(-1).name, "skills");
assert.equal(dirSegs.at(-1).uri, "viking://user/alice/skills");
assert.equal(T.formatBytes(6067), "5.9 KB");
assert.equal(T.formatBytes(512), "512 B");

/* reference sorting */
const refs = [
  { kind: "context", label: "c", count: 3, time: 30, seq: 3 },
  { kind: "memory-file", label: "m", count: 1, time: 10, seq: 1 },
  { kind: "file", label: "f", count: 2, time: 20, seq: 2 },
];
assert.deepEqual(T.sortReferences(refs, "time").map((r) => r.label), ["c", "m", "f"], "time mode keeps incoming order");
assert.deepEqual(T.sortReferences(refs, "kind").map((r) => r.label), ["m", "f", "c"], "kind mode groups memory-file before file before context");
assert.deepEqual(T.sortReferences(refs, "count").map((r) => r.label), ["c", "f", "m"], "count mode ranks by count desc");
assert.equal(T.getRefSort(), "time", "default sort mode");
T.setRefSort("count");
assert.equal(T.getRefSort(), "count");
T.setRefSort("bogus");
assert.equal(T.getRefSort(), "count", "invalid mode ignored");
T.setRefSort("time");
assert.equal(T.getRefSort(), "time");

/* ---- 8. per-turn folding + context previews ------------------------------ */
{
  const ev = (type, data, seq, time) => ({ type, data, seq, time });
  const folder = T.createFolder();
  folder.sessionId = "s-test";
  const W = "/w";
  T.foldEvent(folder, ev("turn/start", { turn: 1 }, 1, 100), W);
  T.foldEvent(folder, ev("user/message", { source: { kind: "runtime-context", sections: [{ name: "Policy" }] }, content: [{ type: "text", text: "current policy text" }] }, 2, 101), W);
  T.foldEvent(folder, ev("todo/write", { todos: [{ content: "a", status: "in_progress" }] }, 3, 102), W);
  T.foldEvent(folder, ev("turn/start", { turn: 2 }, 4, 200), W);
  T.foldEvent(folder, ev("tool/call", { callId: "c1", name: "write", arguments: JSON.stringify({ file_path: "out.md", content: "x" }) }, 5, 201), W);
  T.foldEvent(folder, ev("tool/result", { message: { source: { callId: "c1" }, content: [{ type: "text", text: "ok" }] } }, 6, 202), W);
  T.foldEvent(folder, ev("tool/call", { callId: "c2", name: "skill", arguments: JSON.stringify({ name: "demo-skill" }) }, 7, 203), W);
  T.foldEvent(folder, ev("tool/result", { message: { source: { callId: "c2" }, content: [{ type: "text", text: "# Demo skill content" }] } }, 8, 204), W);
  T.foldEvent(folder, ev("todo/write", { todos: [{ content: "a", status: "completed" }] }, 9, 205), W);
  const win = { hasMore: false, entries: [] };
  const all = T.buildState(folder, win, 0, "all");
  const latest = T.buildState(folder, win, 0, "latest");
  const t1 = T.buildState(folder, win, 0, "turn:1");
  const t2 = T.buildState(folder, win, 0, "turn:2");
  assert.deepEqual(all.turns, [1, 2], "turn list");
  assert.equal(all.latestTurn, 2);
  assert.equal(all.references.length, 2, "all: runtime-context + skill refs");
  assert.equal(all.artifacts.length, 1, "all: one produced artifact");
  assert.equal(latest.scope, "latest");
  assert.equal(latest.references.length, 1, "latest turn holds only its own refs");
  assert.equal(latest.references[0].kind, "skill", "latest ref is the skill call");
  assert.equal(latest.artifacts.length, 1, "latest turn holds its artifact");
  assert.deepEqual(latest.todos.map((x) => x.status), ["completed"], "latest todos are current");
  assert.equal(t1.references.length, 1, "turn 1 holds the injection ref");
  assert.equal(t1.references[0].kind, "context");
  assert.equal(t1.artifacts.length, 0, "turn 1 has no artifacts");
  assert.deepEqual(t1.todos.map((x) => x.status), ["in_progress"], "turn 1 todos as-of that turn");
  assert.equal(t2.artifacts.length, 1);
  assert.deepEqual(t2.todos.map((x) => x.status), ["completed"]);
  assert.equal(T.normalizeSelection("bogus"), "latest");
  assert.equal(T.normalizeSelection("turn:x"), "latest");
  assert.equal(T.normalizeSelection("turn:3"), "turn:3");
  assert.equal(T.normalizeSelection("all"), "all");
  /* context preview snapshots */
  const ctxRef = t1.references[0];
  assert.ok(typeof ctxRef.previewKey === "string" && ctxRef.previewKey.startsWith("s-test|"), `previewKey: ${ctxRef.previewKey}`);
  const entry = T.readContextPreview(ctxRef.previewKey);
  assert.ok(entry !== null, "preview snapshot stored");
  assert.equal(entry.title, "runtime-context");
  assert.ok(entry.text.includes("current policy text"), "snapshot text");
  assert.ok(latest.references[0].previewKey.startsWith("s-test|skill|demo-skill"), "skill result preview");
  assert.ok(T.readContextPreview(latest.references[0].previewKey).text.includes("Demo skill content"));
  assert.equal(T.parseContextAddress(T.contextPreviewAddress(ctxRef.previewKey)), ctxRef.previewKey, "address roundtrip");
  assert.equal(T.parseContextAddress("dsh-resource://overview-context/bogus%zz"), undefined, "bad encoding rejected");
  assert.equal(T.readContextPreview("missing|key"), null);
  /* no sessionId → no preview capture */
  const anon = T.createFolder();
  T.foldEvent(anon, ev("turn/start", { turn: 1 }, 1, 100), W);
  T.foldEvent(anon, ev("user/message", { source: { kind: "runtime-context" }, content: [{ type: "text", text: "x" }] }, 2, 101), W);
  const anonState = T.buildState(anon, win, 0, "all");
  assert.equal(anonState.references[0].previewKey, undefined, "anonymous folder captures no preview");
  /* vikingParentUri */
  assert.equal(T.vikingParentUri("viking://user/a/b.md"), "viking://user/a/");
  assert.equal(T.vikingParentUri("viking://user/a/"), "viking://user/");
  assert.equal(T.vikingParentUri("viking://user"), null);
  assert.equal(T.vikingParentUri("viking://"), null);
  assert.equal(T.vikingParentUri("not-a-uri"), null);
  /* a fresh turn without todo/write shows no inherited plan */
  T.foldEvent(folder, ev("turn/start", { turn: 3 }, 20, 400), W);
  const l3 = T.buildState(folder, win, 0, "latest");
  assert.equal(l3.latestTurn, 3);
  assert.equal(l3.todos, null, "new turn without todos shows no plan instead of inheriting");
  assert.equal(l3.references.length, 0, "new turn has no refs of its own");
  assert.equal(l3.artifacts.length, 0);
  assert.deepEqual(T.buildState(folder, win, 0, "turn:2").todos.map((x) => x.status), ["completed"], "older turn keeps its own plan");
}

/* ---- 9. ubiquitous reference detection ----------------------------------- */
{
  const ev = (type, data, seq, time) => ({ type, data, seq, time });
  const W = "/w";
  const win = { hasMore: false, entries: [] };
  const folder = T.createFolder();
  folder.sessionId = "s-ubiq";
  T.foldEvent(folder, ev("turn/start", { turn: 1 }, 1, 100), W);
  T.foldEvent(folder, ev("user/message", { source: { kind: "runtime-context", sections: [{ name: "Policy" }] }, content: [{ type: "text", text: "shared ctx t1" }] }, 2, 101), W);
  T.foldEvent(folder, ev("user/message", { source: { kind: "skill-catalog", entries: [{ name: "only-turn1" }] } }, 3, 102), W);
  T.foldEvent(folder, ev("turn/start", { turn: 2 }, 4, 200), W);
  T.foldEvent(folder, ev("user/message", { source: { kind: "runtime-context", sections: [{ name: "Policy" }] }, content: [{ type: "text", text: "shared ctx t2" }] }, 5, 201), W);
  T.foldEvent(folder, ev("user/message", { source: { kind: "skill-catalog", entries: [{ name: "only-turn2" }] } }, 6, 202), W);
  const all = T.buildState(folder, win, 0, "all");
  assert.equal(all.references.length, 3, "shared ref merged, two distinct catalogs");
  const shared = all.references.find((ref) => ref.refTurns === 2);
  assert.ok(shared !== undefined, "shared ref tracked across both turns");
  assert.equal(shared.ubiquitous, true, "ref present in every turn is ubiquitous");
  assert.equal(shared.label, "runtime-context");
  for (const ref of all.references.filter((r) => r !== shared)) {
    assert.equal(ref.ubiquitous, false, `turn-specific ref not ubiquitous: ${ref.label}`);
    assert.equal(ref.refTurns, 1);
  }
  const latest = T.buildState(folder, win, 0, "latest");
  assert.equal(latest.references.length, 2, "latest turn sees shared + own catalog");
  assert.equal(latest.references.filter((ref) => ref.ubiquitous).length, 1, "one common ref in the latest view");
  /* preview snapshot follows the latest injection */
  assert.ok(T.readContextPreview(shared.previewKey).text.includes("shared ctx t2"), "preview text updated on re-injection");
  /* hide-common store */
  T.setHideCommonRefs(true);
  assert.equal(T.getHideCommonRefs(), true);
  T.setHideCommonRefs(false);
  assert.equal(T.getHideCommonRefs(), false);
}

/* ---- 10. key-step stream + quick-nav linkage ----------------------------- */
{
  const ev = (type, data, seq, time) => ({ type, data, seq, time });
  const W = "/w";
  const win = { hasMore: false, entries: [] };
  /* stepDetail extraction */
  assert.equal(T.stepDetail("read", { file_path: "/tmp/a.txt" }), "/tmp/a.txt");
  assert.equal(T.stepDetail("bash", { command: "node  x.js\n--flag" }), "node x.js --flag");
  assert.equal(T.stepDetail("web_search", { queries: ["dsh plugin", "second"] }), "dsh plugin");
  assert.equal(T.stepDetail("todo_write", { todos: [] }), "");
  assert.equal(T.stepDetail("x", "not-an-object"), "");
  assert.equal(T.stepFull("bash", { command: "node  x.js\n--flag" }), "node  x.js\n--flag", "full text keeps raw whitespace");
  assert.equal(T.stepFull("y".repeat(1), { command: "z".repeat(5000) }).length, 4000, "full text capped at 4000");
  assert.equal(T.stepFull("todo_write", { todos: [] }), "");
  assert.ok(T.stepDetail("bash", { command: "y".repeat(200) }).endsWith("…"), "long detail truncated");

  const folder = T.createFolder();
  folder.sessionId = "s-steps";
  T.foldEvent(folder, ev("turn/start", { turn: 1 }, 1, 100), W);
  T.foldEvent(folder, ev("tool/call", { callId: "c1", name: "read", arguments: JSON.stringify({ file_path: "/tmp/a.txt" }) }, 2, 101), W);
  T.foldEvent(folder, ev("tool/result", { message: { source: { callId: "c1" }, content: [{ type: "text", text: "file body" }] } }, 3, 102), W);
  T.foldEvent(folder, ev("tool/call", { callId: "c2", name: "bash", arguments: JSON.stringify({ command: "node test.mjs" }) }, 4, 103), W);
  T.foldEvent(folder, ev("tool/result", { message: { source: { callId: "c2" }, isError: true, content: [{ type: "text", text: "boom" }] } }, 5, 104), W);
  T.foldEvent(folder, ev("tool/call", { callId: "c3", name: "grep", arguments: JSON.stringify({ pattern: "dsov" }) }, 6, 105), W);
  const latest = T.buildState(folder, win, 0, "latest");
  assert.equal(latest.todos, null, "no plan in this turn");
  assert.equal(latest.steps.length, 3, "all three tool calls recorded");
  /* chronological: oldest on top, newest at the bottom */
  assert.equal(latest.steps[0].name, "read");
  assert.equal(latest.steps[0].done, true);
  assert.ok(latest.steps[0].error === undefined || latest.steps[0].error === false);
  assert.equal(latest.steps[1].name, "bash");
  assert.equal(latest.steps[1].done, true);
  assert.equal(latest.steps[1].error, true, "failed result flags the step");
  assert.equal(latest.steps[2].name, "grep");
  assert.equal(latest.steps[2].done, false, "running step stays open");
  assert.equal(latest.steps[2].detail, "dsov");
  /* per-turn stats bar counters */
  assert.equal(latest.stats.durationMs, 5, "turn duration spans first to last event");
  assert.equal(latest.stats.toolCalls, 3);
  assert.equal(latest.stats.commands, 1, "bash counted as command");
  assert.equal(latest.stats.errors, 1, "failed result counted");
  assert.equal(latest.stats.files, 0);
  assert.equal(T.formatDuration(45000), "45s");
  assert.equal(T.formatDuration(75000), "1m 15s");
  assert.equal(T.formatDuration(3725000), "1h 02m");
  const all = T.buildState(folder, win, 0, "all");
  assert.equal(all.steps.length, 3, "global step stream mirrors the turn");
  /* a later turn with its own todos hides steps (todos win) */
  T.foldEvent(folder, ev("turn/start", { turn: 2 }, 7, 200), W);
  T.foldEvent(folder, ev("tool/result", { message: { source: { callId: "c3" }, content: [{ type: "text", text: "hits" }] } }, 8, 201), W);
  T.foldEvent(folder, ev("todo/write", { todos: [{ content: "plan item", status: "pending" }] }, 9, 202), W);
  const l2 = T.buildState(folder, win, 0, "latest");
  assert.equal(l2.todos.length, 1, "turn 2 has its own plan");
  assert.equal(l2.steps.length, 0, "cross-turn result does not add steps to turn 2");
  assert.equal(l2.stats.toolCalls, 0, "turn 2 stats stay per-turn");
  assert.equal(l2.stats.durationMs, 2, "turn 2 spans its own events");
  const all2 = T.buildState(folder, win, 0, "all");
  assert.equal(all2.stats.toolCalls, 3, "folder totals aggregate every turn");
  assert.equal(all2.stats.durationMs, 102, "folder spans the whole session window");
  const l1 = T.buildState(folder, win, 0, "turn:1");
  assert.equal(l1.steps.length, 3, "turn 1 keeps its three steps");
  assert.equal(l1.steps.find((s) => s.name === "grep").done, true, "late result closes the running step in turn 1");

  /* nav-scope linkage store */
  const before = T.readNavScope();
  T.requestNavScope("turn:5");
  const after = T.readNavScope();
  assert.equal(after.rev, before.rev + 1, "request bumps the revision");
  assert.equal(after.selection, "turn:5");

  /* todo → composer rerun prompt template */
  const prompt = T.rerunPrompt(3, "运行测试");
  assert.ok(prompt.startsWith("请查看当前任务的完整 TODO 计划，重新执行以下指定步骤："), "template head");
  assert.ok(prompt.includes("**目标步骤：3. 运行测试**"), "numbered step interpolated");
  assert.ok(prompt.endsWith("**请直接执行，不要只提供方案。**"), "template tail");
  assert.equal(prompt.split("\n").length, 13, "13 template lines");
  for (const n of [1, 2, 3, 4, 5, 6]) assert.ok(prompt.includes(`\n${n}. `), `requirement line ${n}`);
  assert.equal(T.insertIntoComposer("x"), "failed", "without composer or clipboard the helper reports failure");

  /* reference type filter store + display grouping */
  assert.deepEqual(T.getRefTypes(), [], "type filter starts empty (no stored value in Node)");
  T.setRefTypes(["skill", "memory-file", "skill"]);
  assert.deepEqual(T.getRefTypes(), ["memory-file", "skill"], "deduped and sorted");
  T.setRefTypes([]);
  assert.deepEqual(T.getRefTypes(), [], "cleared");
  assert.equal(T.refDisplayType({ kind: "memory-file" }), "memory", "memory-file groups with memory");
  assert.equal(T.refDisplayType({ kind: "skill" }), "skill");
  assert.equal(T.refDisplayType(null), "");

  /* URI-guard notices are meta text: no refs extracted from them */
  const guardText = '[OpenViking memory plugin] URI guard: this shell command contains the viking:// URI viking://user/c/plan.md。还有.\nExample: mcp__openviking__read(uris="viking://user/c/plan.md。还有")';
  assert.deepEqual(T.contextDetail({ kind: "plugin:openviking-memory" }, [{ type: "text", text: guardText }]), [], "guard message yields no references");
  assert.deepEqual(T.extractVikingUris('Example: read(uris="viking://user/c/plan.md。还有")'), ["viking://user/c/plan.md"], "quoted capture trims at CJK punctuation");
}

console.log("\nALL TESTS PASSED");
