import z from "@deepseek-ai/schemastery";
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Display preferences shared by the Host row config and the browser overview surfaces. */
const Config = z.object({
  showProgress: z.boolean().default(true),
  showArtifacts: z.boolean().default(true),
  showReferences: z.boolean().default(true),
  placement: z.union([z.const("conversation"), z.const("sidebar"), z.const("both")]).default("both"),
  sectionFullHeight: z.boolean().default(false),
  quickNav: z.boolean().default(true),
  quickNavLink: z.boolean().default(true),
  vikingPreview: z.boolean().default(true),
  vikingUrl: z.string().default("http://127.0.0.1:1933"),
  vikingAccount: z.string().default(""),
  vikingUser: z.string().default(""),
});

/** Authenticated POST route revealing one viking:// directory or skill folder in the system file manager. */
const REVEAL_PATH = "/api/overview.reveal";
const VIKING_SCHEME = "viking://";

/* ------------------------------------------------------------------ */
/* OpenViking storage mapping                                          */
/* ------------------------------------------------------------------ */

let vikingRootCache = { key: null, root: null };

/** The on-disk viking storage root ({storage.workspace}/viking), cached by ov.conf mtime. */
async function vikingStorageRoot() {
  const conf = join(homedir(), ".openviking", "ov.conf");
  try {
    const info = await stat(conf);
    const key = `${info.mtimeMs}:${info.size}`;
    if (vikingRootCache.key !== key) {
      const parsed = JSON.parse(await readFile(conf, "utf8"));
      const workspace =
        parsed && parsed.storage && typeof parsed.storage.workspace === "string" && parsed.storage.workspace !== ""
          ? parsed.storage.workspace
          : null;
      vikingRootCache = { key, root: workspace === null ? null : resolve(join(workspace, "viking")) };
    }
  } catch {
    vikingRootCache = { key: null, root: null };
  }
  return vikingRootCache.root;
}

/** One filesystem-safe path segment check for URI bodies, account ids, and skill names. */
function isSafeSegment(segment) {
  return (
    typeof segment === "string" &&
    segment !== "" &&
    segment !== "." &&
    segment !== ".." &&
    !segment.includes("/") &&
    !segment.includes("\\") &&
    !segment.includes(sep) &&
    !segment.includes("\0")
  );
}

/**
 * Map one viking:// URI onto the account's storage subtree, rejecting escapes.
 * @returns the absolute disk path, or null when the URI is unsafe.
 */
function resolveVikingTarget(root, account, uri) {
  if (!isSafeSegment(account)) return null;
  if (typeof uri !== "string" || !uri.startsWith(VIKING_SCHEME)) return null;
  const base = resolve(join(root, account));
  const body = uri.slice(VIKING_SCHEME.length).replace(/^\/+/, "").replace(/\/+$/, "");
  if (body === "") return base;
  const segments = body.split("/");
  for (const segment of segments) if (!isSafeSegment(segment)) return null;
  const target = resolve(base, ...segments);
  if (target !== base && !target.startsWith(base + sep)) return null;
  return target;
}

/* ------------------------------------------------------------------ */
/* Skill directory discovery                                           */
/* ------------------------------------------------------------------ */

/** Every plausible skills root on this machine: user dirs, installed packages, viking storage. */
async function skillRoots() {
  const roots = [join(homedir(), ".agents", "skills"), join(homedir(), ".claude", "skills")];
  const moduleRoots = new Set();
  const addAncestors = (start) => {
    try {
      const resolved = resolve(start);
      /* Launch entries are often symlinks (e.g. /opt/homebrew/bin/dsh → lib/node_modules/…);
         without realpath the walk never sees the real node_modules ancestors. */
      let real;
      try {
        real = realpathSync(resolved);
      } catch {
        real = resolved;
      }
      let dir = dirname(real);
      for (let depth = 0; depth < 10; depth += 1) {
        moduleRoots.add(join(dir, "node_modules"));
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    } catch {
      /* unusable start path */
    }
  };
  try {
    addAncestors(fileURLToPath(import.meta.url));
  } catch {
    /* import.meta unavailable */
  }
  try {
    if (typeof process !== "undefined" && Array.isArray(process.argv) && typeof process.argv[1] === "string" && process.argv[1] !== "") {
      addAncestors(process.argv[1]);
    }
  } catch {
    /* no launch path */
  }
  // Every DSH profile's installed packages (the launch path finds npx roots only).
  try {
    const profiles = join(homedir(), ".dsh", "profiles");
    for (const profile of await readdir(profiles)) {
      if (!isSafeSegment(profile)) continue;
      moduleRoots.add(join(profiles, profile, "node_modules"));
    }
  } catch {
    /* no profiles directory */
  }
  for (const modules of moduleRoots) {
    for (const scope of ["@openviking", "@deepseek-ai"]) {
      try {
        for (const entry of await readdir(join(modules, scope))) {
          roots.push(join(modules, scope, entry, "skills"));
        }
      } catch {
        /* scope absent in this node_modules */
      }
    }
  }
  const vikingRoot = await vikingStorageRoot();
  if (vikingRoot !== null) {
    try {
      for (const account of await readdir(vikingRoot)) {
        roots.push(join(vikingRoot, account, "agent", "skills"));
        try {
          for (const user of await readdir(join(vikingRoot, account, "user"))) {
            roots.push(join(vikingRoot, account, "user", user, "skills"));
          }
        } catch {
          /* account without user storage */
        }
      }
    } catch {
      /* storage root not listable */
    }
  }
  return roots;
}

/* ------------------------------------------------------------------ */
/* Desktop reveal                                                      */
/* ------------------------------------------------------------------ */

/** Hand one existing path to the platform file manager; directories open, files are selected. */
function revealOnDesktop(target, isDirectory) {
  const os = platform();
  let command;
  let args;
  if (os === "darwin") {
    command = "open";
    args = isDirectory ? [target] : ["-R", target];
  } else if (os === "win32") {
    command = "explorer";
    args = isDirectory ? [target] : ["/select,", target];
  } else {
    command = "xdg-open";
    args = [isDirectory ? target : dirname(target)];
  }
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
}

/** Answer one reveal request: validate, map to disk, and hand the target to the desktop. */
async function handleReveal(request) {
  const query = new URL(request.url, "http://localhost").searchParams;
  const kind = query.get("kind");
  if (kind !== "viking" && kind !== "skill") return new Response("Invalid reveal kind.", { status: 400 });
  let target = null;
  if (kind === "viking") {
    const uri = query.get("uri");
    const account = query.get("account");
    if (typeof uri !== "string" || uri === "" || typeof account !== "string") return new Response("Invalid viking reveal request.", { status: 400 });
    const root = await vikingStorageRoot();
    if (root === null) return new Response("OpenViking storage root unavailable.", { status: 422 });
    target = resolveVikingTarget(root, account, uri);
    if (target === null) return new Response("Rejected viking path.", { status: 400 });
  } else {
    const name = query.get("name");
    if (!isSafeSegment(name)) return new Response("Invalid skill name.", { status: 400 });
    for (const root of await skillRoots()) {
      const candidate = join(root, name);
      try {
        const info = await stat(candidate);
        if (info.isDirectory()) {
          target = candidate;
          break;
        }
      } catch {
        /* not in this root */
      }
    }
    if (target === null) return new Response("Skill directory not found.", { status: 404 });
  }
  let info;
  try {
    info = await stat(target);
  } catch {
    return new Response("Target missing on disk.", { status: 404 });
  }
  try {
    revealOnDesktop(target, info.isDirectory());
  } catch {
    return new Response("Desktop reveal unavailable.", { status: 422 });
  }
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

/**
 * Embed the validated display preferences in served browser pages and
 * register the desktop reveal route inside the connection's auth fence.
 * @param ctx - Host context serving browser pages.
 * @param config - Row config validated against {@link Config}.
 */
function apply(ctx, config) {
  ctx.on("webserver/index-inject", (table) => {
    table.push({
      kind: "global",
      name: "__DSH_CONVERSATION_OVERVIEW_CONFIG__",
      value: config,
    });
  });
  const connection = ctx.connection;
  if (connection && connection.fetch && typeof connection.fetch.register === "function") {
    ctx.effect(() => {
      const unregister = connection.fetch.register({
        path: REVEAL_PATH,
        methods: ["POST"],
        requestBody: "buffered",
        fetch: (request) => handleReveal(request),
      });
      return typeof unregister === "function" ? unregister : undefined;
    }, "conversation-overview: desktop reveal route");
  }
}

/** Host sandbox requires declared injects: reading ctx.connection without it throws. */
export const inject = ["connection"];

export { Config, apply };

/** Test-only surface: disk mapping and discovery without the desktop spawn. */
export const _internal = { vikingStorageRoot, resolveVikingTarget, skillRoots, isSafeSegment, REVEAL_PATH };
