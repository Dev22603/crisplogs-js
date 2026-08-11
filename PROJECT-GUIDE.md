# crisplogs — Complete Project & Interview Guide

Everything about this project in one file: what it is, how every piece works, how npm packaging works end to end, how to use it in real projects, and a large bank of interview questions with answers.

**Package:** [`crisplogs`](https://www.npmjs.com/package/crisplogs) · **Repo:** `dev22603/crisplogs-js` · **Current version:** `0.3.0` · **License:** MIT

---

## Table of Contents

1. [The 30-second pitch](#1-the-30-second-pitch)
2. [Project facts](#2-project-facts)
3. [Architecture: how a log line is born](#3-architecture-how-a-log-line-is-born)
4. [File-by-file walkthrough](#4-file-by-file-walkthrough)
5. [Deep dives into the tricky parts](#5-deep-dives-into-the-tricky-parts)
6. [npm packaging — everything you need to know](#6-npm-packaging--everything-you-need-to-know)
7. [Using crisplogs in real projects](#7-using-crisplogs-in-real-projects)
8. [Known gaps, bugs, and honest limitations](#8-known-gaps-bugs-and-honest-limitations)
9. [Interview questions & answers](#9-interview-questions--answers)
10. [Cheat sheet + 60-second walkthrough script](#10-cheat-sheet--60-second-walkthrough-script)

---

## 1. The 30-second pitch

> crisplogs is a zero-dependency Node.js logging library that gives you production-shaped terminal logs from a single function call. `setupLogging()` returns a logger with colored level tags, timestamps, the caller's `file:line`, an optional named tag, structured key-value context, box decorations, and optional file output with ANSI codes stripped. It ships dual ESM + CommonJS builds with full TypeScript declarations, targets Node 16+, and has no runtime dependencies.

```ts
import { setupLogging } from "crisplogs";

const logger = setupLogging({ level: "INFO", style: "long-boxed", file: "app.log" });
logger.info("Server started", { port: 8000 });
```

```
INFO     2026-08-11 12:30:45 [root] app.ts:5 - Server started [port=8000]
```

**The design idea in one sentence:** it's Python's `logging` module ergonomics (levels, named loggers, handlers, formatters, `strftime` date tokens, `colorlog`-compatible color strings) rebuilt for Node with a one-call setup.

---

## 2. Project facts

| Thing | Value |
|---|---|
| Package name | `crisplogs` (unscoped, public) |
| Versions published | 0.1.0, 0.2.0, 0.2.1, 0.2.2, 0.2.3, 0.3.0 |
| First publish | 2026-04-14 |
| Latest publish | 2026-05-20 (`0.3.0`) |
| Runtime dependencies | **0** |
| Dev dependencies | `typescript`, `tsup`, `vitest`, `@biomejs/biome`, `@types/node` |
| Source size | ~1,150 lines of TypeScript across 8 files |
| Test suite | 91 tests across 5 files (Vitest) |
| Build output | `dist/index.js` (CJS, 23 KB), `dist/index.mjs` (ESM, 20 KB), `dist/index.d.ts` / `.d.mts` (17 KB) |
| Engines | `node >= 16.0.0` |
| Lint/format | Biome |
| Bundler | tsup (esbuild under the hood) |

### Public API surface

**Functions:** `setupLogging(options?)`, `getLogger(name?)`, `moduleLogger(name?)`, `resetLogging()`, `removeLogger(name)`, `stripAnsi(text)`

**Classes:** `Logger`, `LogFormatter`, `ConsoleHandler`, `CleanFileHandler`

**Errors:** `CrisplogsError` (base), `InvalidLevelError`, `InvalidStyleError`, `InvalidColorError`, `InvalidExtraFormatError`, `InvalidWidthError`, `InvalidFilePathError`

**Constants:** `LEVEL_VALUES`, `DEFAULT_LOG_COLORS`, `VERSION`

**Types:** `Level`, `Style`, `ExtraFormat`, `LogRecord`, `Formatter`, `Handler`, `SetupLoggingOptions`, `FormatterOptions`

### Feature list

- 5 levels matching Python's numeric hierarchy: DEBUG=10, INFO=20, WARNING=30, ERROR=40, CRITICAL=50
- 4 output styles: default (no box), `short-fixed`, `short-dynamic`, `long-boxed`
- Per-level color customization with `colorlog`-style strings (`"bold_red,bg_white"`)
- Structured extras with 3 render modes: `inline`, `json`, `pretty`
- Automatic caller capture (`file:line`), toggleable for hot paths
- File logging with automatic ANSI stripping
- Separate console vs. file level thresholds
- Named logger registry + `moduleLogger()` for per-file tags
- Python-compatible `strftime` date formatting
- ANSI-aware word wrapping and padding

---

## 3. Architecture: how a log line is born

The library follows the classic **Logger → Record → Handler → Formatter → Sink** pipeline (borrowed straight from Python's `logging`).

```
user code
   │  logger.info("Server started", { port: 8000 })
   ▼
Logger._log()                        src/logger.ts
   │  1. compare level to logger threshold → maybe drop
   │  2. capture caller file:line via Error.captureStackTrace
   │  3. build an immutable LogRecord object
   ▼
LogRecord  { levelName, levelNo, message, timestamp, name, pathname, lineno, extra }
   │
   ├──────────────► ConsoleHandler      src/handlers.ts
   │                   │  level check → LogFormatter.format(record)
   │                   ▼  process.stdout.write(text + "\n")
   │
   └──────────────► CleanFileHandler    src/handlers.ts
                       │  level check → LogFormatter.format(record)
                       │  stripAnsi(text)
                       ▼  fs.WriteStream.write(clean + "\n")

LogFormatter.format()                 src/formatters.ts
   formatBase()  → "LEVEL    timestamp [name] path:line - message"
   serializeExtra() → " [port=8000]"  or JSON / pretty JSON
   box rendering → ┌─ │ └─  with ANSI-safe padding and word wrap
```

**Two-stage level filtering** is a deliberate part of this design (and a common interview probe):

1. `Logger._log` drops records below `logger.level`.
2. Each handler independently drops records below `handler.level`.

That's what makes `level: "DEBUG", fileLevel: "WARNING"` work — one record, two destinations, two thresholds.

**Key separations of concern:**

- `Logger` knows *when* to log, nothing about *how it looks*.
- `Formatter` turns a record into a string. Pure function, no I/O.
- `Handler` owns a destination and its resource lifecycle (`emit` / `close`).
- `setupLogging` is the composition root: it validates options, builds a formatter, wires handlers, registers the logger.

---

## 4. File-by-file walkthrough

### `src/types.ts` (81 lines) — the contracts

Pure type declarations plus one runtime constant. Defines `Level`, `Style`, `ExtraFormat` as string-literal unions, the `LogRecord` shape, the `SetupLoggingOptions` interface, and the `Formatter` / `Handler` interfaces that make the library extensible. `LEVEL_VALUES` is the only runtime value here — the numeric level map.

Why string-literal unions instead of a TS `enum`: unions erase completely at compile time (no runtime object emitted), they're assignable from plain strings so JS consumers aren't forced to import anything, and they give exhaustive checking in switch statements.

### `src/errors.ts` (75 lines) — typed error hierarchy

Seven error classes, all extending `CrisplogsError`, which extends `Error`. Each sets `this.name` explicitly so stack traces read `InvalidLevelError: ...` instead of `Error: ...`. Added in 0.3.0 — before that, everything threw plain `TypeError`.

Why it matters: consumers can write `catch (e) { if (e instanceof CrisplogsError) ... }` to scope a catch block to library misconfiguration without swallowing genuine bugs.

### `src/colors.ts` (125 lines) — ANSI color parsing

Three lookup tables (foreground 30–37, background 40–47, modifiers 1–4) and `parseColorString()`, which converts `colorlog`-style strings into ANSI escape sequences:

```
"red"                → "\x1b[31m"
"bold_red"           → "\x1b[1;31m"
"bold_red,bg_white"  → "\x1b[1;31;47m"
```

Parsing rules, in order: split on commas → trim/lowercase → `reset` short-circuits → `bg_` prefix → `modifier_color` compound → bare modifier → bare color → **throw `InvalidColorError`**.

That last step is a 0.3.0 behavior change. Previously unknown tokens were silently dropped, so a typo like `"brigt_red"` produced uncolored output with no error — a classic silent-failure trap.

### `src/utils.ts` (147 lines) — the interesting internals

Four functions, each solving a non-obvious problem:

- **`stripAnsi(text)`** — regex removing SGR, CSI, and OSC escape sequences. Used by the file handler and by every width calculation.
- **`strftime(format, date)`** — implements Python's date tokens (`%Y %m %d %H %M %S %I %p %f %j %a %A %b %B %%`) via a single regex replace with a switch. No dependency on `date-fns` or `dayjs`.
- **`wordWrap(text, width)`** — greedy word wrapping that measures *visible* width (ANSI-stripped) so colored text wraps at the correct column. Mirrors Python's `textwrap.wrap(..., break_long_words=False, break_on_hyphens=False)`.
- **`getCallerInfo(belowFn)`** — captures the caller's file and line using V8's `Error.captureStackTrace(obj, belowFn)`, which truncates the stack *above* the given function so the first frame is the user's call site. Falls back to `<anonymous>:0` when unavailable.

### `src/formatters.ts` (204 lines) — all four styles in one class

`LogFormatter` implements every output style through options rather than subclassing. Version 0.2.0 collapsed four separate formatter classes into this one:

| Old class | Equivalent options |
|---|---|
| `ColoredLogFormatter` | `{ box: false }` |
| `ShortFixedBoxFormatter` | `{ box: true, width: N }` |
| `ShortDynamicBoxFormatter` | `{ box: true, fullBorder: true, width: "auto" }` |
| `LongBoxedFormatter` | `{ box: true, wordWrap: true, width: N }` |

Helpers: `padVisual()` (pads ignoring ANSI), `safeStringify()` (catches circular-reference `TypeError`, returns `"[Circular]"`), `serializeExtra()` (three render modes), `formatBase()` (the common line layout).

### `src/handlers.ts` (74 lines) — destinations

- **`ConsoleHandler`** — formats and writes to `process.stdout`. `close()` is a no-op.
- **`CleanFileHandler`** — opens an `fs.WriteStream` in append mode (`flags: "a"`), strips ANSI before every write, attaches an `error` listener that reports to stderr rather than crashing the process (an unhandled stream `error` event would take down the app), and closes the stream in `close()`.

### `src/logger.ts` (269 lines) — the Logger class

Level methods (`debug`, `info`, `warning`, `warn`, `error`, `critical`, `log`) all delegate to the private `_log()`. Each passes itself as the `callerFn` argument so `Error.captureStackTrace` knows which frame to cut above.

Handler management is defensive: `addHandler` is idempotent (dedupes by instance identity), `clearHandlers` swallows errors from `close()` so cleanup never throws, and `_log` wraps each `handler.emit` in try/catch — one broken handler can't stop the others or crash the host app. Emit failures are reported to stderr, and even *that* write is wrapped.

### `src/index.ts` (270 lines) — the public entry point

Holds the module-scoped `Map<string, Logger>` registry and the five exported functions. `setupLogging` does runtime validation of every option (TypeScript catches these at compile time; plain-JS consumers get errors at runtime), merges user colors over defaults, builds one formatter shared by both handlers, clears any same-named logger's handlers to prevent duplicate output, and registers the result.

`VERSION` is injected at build time by tsup's `define` (`__VERSION__` is replaced with the literal from `package.json`), with a `typeof` guard so the un-bundled TypeScript source still works in tests.

### `tests/` (91 tests, 5 files)

One test file per source module plus `helpers.ts` with a `makeRecord()` factory. The pattern used throughout: spy on `process.stdout.write` with `vi.spyOn(...).mockImplementation(() => true)`, assert on captured output, restore in `afterEach`. Every test uses a unique logger `name` to avoid cross-test registry pollution.

### Docs and config

`README.md` (17 KB, full API reference), `AGENTS.md` (guidance for AI coding assistants consuming the library), `llms.txt` (machine-readable doc index), `CONTRIBUTING.md`, `CHANGELOG.md` (Keep a Changelog format), `examples/` (10 runnable scripts), `biome.json`, `tsconfig.json` (strict mode), `tsup.config.ts`.

---

## 5. Deep dives into the tricky parts

These are the five places where the code does something you can't guess from the API, and they're the richest interview material.

### 5.1 Capturing `file:line` without a stack-trace parser

```ts
const obj: { stack?: string } = {};
Error.captureStackTrace(obj, belowFn);   // V8-only API
```

`Error.captureStackTrace(target, constructorOpt)` writes a `.stack` string onto any object. The second argument is the magic: **every frame at or above that function is omitted**. By passing `this.info` from inside `logger.info`, the first frame in the resulting stack is the user's own call site — no need to count frames or skip a fixed offset.

The stack string is then parsed with two regexes to handle both frame formats V8 produces:

```
at Object.foo (/app/main.ts:12:5)   →  /\((.+):(\d+):\d+\)/
at /app/main.ts:12:5                →  /at (.+):(\d+):\d+/
```

**Costs and caveats worth knowing:**
- It's a V8 API. Works on Node and Chrome; not in the spec. Hence the `typeof Error.captureStackTrace === "function"` guard.
- Building a stack trace on every log call is the single most expensive operation in the library — hence the `captureCallerInfo: false` escape hatch.
- Under a bundler or after minification, paths and line numbers reflect the *bundled* file unless source maps are applied.

### 5.2 ANSI-aware width math

A colored string's `.length` is not its visible width. `"\x1b[32mOK\x1b[0m".length` is 11, but it occupies 2 columns. Every layout operation therefore measures `stripAnsi(text).length`:

- `padVisual()` — pads box content to the right column
- `width: "auto"` — reduces over `stripAnsi(line).length` to find the longest line
- `wordWrap()` — accumulates visible width, not raw length

Get this wrong and colored box borders drift out of alignment — which is exactly the bug fixed in commit `18c27b4` ("make wordWrap ANSI-safe by measuring visible width").

### 5.3 The registry and why `setupLogging` clears handlers

```ts
const loggers = new Map<string, Logger>();
```

Module-scoped, so it's a singleton *per module instance*. Two consequences:

1. Calling `setupLogging()` twice with the same name would attach a second `ConsoleHandler` to the same logger → every line printed twice. The code prevents this by calling `clearHandlers()` on the existing logger first.
2. If a process loads both the ESM and CJS build (e.g. some deps `require` and others `import`), you get **two independent registries**. That's the "don't mix `import` and `require`" pitfall in the README — the dual-package hazard.

`getLogger(name)` creates a child that shares the *same handler instances* as the root — not copies. So reconfiguring the root's handlers affects children created from it, but children created *before* a reconfiguration keep the old handler objects.

### 5.4 Circular references in extras

`JSON.stringify` throws `TypeError: Converting circular structure to JSON` on cyclic objects. A logging library must never crash the app it's observing, so:

```ts
function safeStringify(obj: unknown, indent?: number): string {
  try { return JSON.stringify(obj, null, indent); }
  catch { return "[Circular]"; }
}
```

The same defensive posture appears three more times: `handler.emit` in try/catch, `handler.close()` in try/catch, and the stream `error` listener. **A logger that throws is worse than no logger.**

### 5.5 Dual ESM + CJS from one TypeScript source

tsup (esbuild) emits both formats from `src/index.ts`, and `package.json` routes consumers via the `exports` map:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.mjs",
    "require": "./dist/index.js"
  }
}
```

`main` / `module` / `types` are kept as fallbacks for older tooling that predates `exports`. `dts: true` generates `.d.ts` and `.d.mts` declaration files so both module systems get types.

---

## 6. npm packaging — everything you need to know

This section is the "I've never made a package without help" gap-filler. Everything here is either used by this project or is standard knowledge an interviewer expects.

### 6.1 What an npm package actually is

A package is a **gzipped tarball** (`.tgz`) containing a `package.json` and whatever files you chose to include, uploaded to a registry (npmjs.com by default). `npm install` downloads the tarball, unpacks it into `node_modules/<name>/`, and records the resolved version + integrity hash in your lockfile. That's the whole model. There's no build step on the registry side — **you publish build output, not source**.

Inspect exactly what you're about to ship, without publishing:

```bash
npm pack --dry-run      # lists files and total size
npm pack                # writes crisplogs-0.3.0.tgz locally
tar -tzf crisplogs-0.3.0.tgz
```

### 6.2 `package.json` field by field (this project's, annotated)

```jsonc
{
  "name": "crisplogs",              // unique on the registry; lowercase, URL-safe
  "version": "0.3.0",               // semver; must be unique per publish
  "description": "...",             // shown in search results
  "main": "./dist/index.js",        // CJS entry (legacy resolvers)
  "module": "./dist/index.mjs",     // ESM entry (bundler convention, not spec)
  "types": "./dist/index.d.ts",     // TS declarations (legacy resolvers)
  "exports": { ... },               // modern entry map — takes priority over main
  "files": ["dist"],                // allowlist of what goes in the tarball
  "scripts": { ... },
  "keywords": [...],                // registry search
  "license": "MIT",                 // SPDX identifier
  "author": "Dev Bachani",
  "funding": "https://github.com/sponsors/Dev22603",
  "repository": { "type": "git", "url": "git+https://..." },  // adds repo link on npm
  "engines": { "node": ">=16.0.0" },  // advisory; warns (or errors with engine-strict)
  "devDependencies": { ... }        // NOT installed by consumers
}
```

**Fields this project doesn't use but you should know:**

| Field | What it does |
|---|---|
| `dependencies` | Installed transitively for every consumer. Keep minimal. |
| `peerDependencies` | "You must provide this" — for plugins (e.g. a React component needs React). npm 7+ auto-installs them. |
| `optionalDependencies` | Install failures don't fail the install. |
| `bin` | Maps command names to scripts → creates CLI entries in `node_modules/.bin`. |
| `sideEffects: false` | Tells bundlers the package is tree-shakeable. |
| `type: "module"` | Makes bare `.js` files ESM. This project instead uses explicit `.mjs`/`.js` extensions. |
| `private: true` | Hard block against accidental publish. |
| `publishConfig` | Per-package publish settings, e.g. `{"access": "public"}` for scoped packages. |
| `workspaces` | Monorepo support. |

### 6.3 Controlling what ships: `files` vs `.npmignore`

Three mechanisms, in precedence order:

1. **`files` array in package.json** (allowlist — what this project uses). Safest: nothing ships unless you list it.
2. **`.npmignore`** (denylist). If present, it fully replaces `.gitignore` for packing purposes.
3. **`.gitignore`** used as a fallback when no `.npmignore` exists.

Always included regardless: `package.json`, `README`, `LICENSE`, `CHANGELOG`, and the file named by `main`.
Never included regardless: `node_modules`, `.git`, `.npmrc`, lockfiles.

This project ships `["dist"]` — no source, no tests, no examples. That keeps the tarball small; the tradeoff is that source maps in `dist` point at files consumers don't have. (Shipping `src` too would fix that.)

### 6.4 Semantic versioning, for real

`MAJOR.MINOR.PATCH`:

- **PATCH** (0.0.x) — bug fixes, no API change
- **MINOR** (0.x.0) — new features, backward compatible
- **MAJOR** (x.0.0) — breaking changes

**The 0.x rule:** while major is 0, the API is considered unstable and *minor* bumps are allowed to break things. This project's README states this explicitly and recommends `~0.3.0` pinning. Going 1.0.0 is a promise of stability, which is why it hasn't happened yet.

Consumer range syntax:

| Range | Matches |
|---|---|
| `1.2.3` | exactly that version |
| `~1.2.3` | `>=1.2.3 <1.3.0` (patches only) |
| `^1.2.3` | `>=1.2.3 <2.0.0` (minor + patch) |
| `^0.3.0` | `>=0.3.0 <0.4.0` — **caret is special-cased for 0.x** |
| `*` / `latest` | anything |

Bumping the version:

```bash
npm version patch     # 0.3.0 → 0.3.1, commits, and creates a git tag
npm version minor     # 0.3.0 → 0.4.0
npm version major     # 0.3.0 → 1.0.0
npm version 0.4.0-beta.1
```

### 6.5 The publish flow, step by step

```bash
npm login                      # or `npm adduser`; stores a token in ~/.npmrc
npm whoami                     # verify identity
npm run build                  # produce dist/
npm pack --dry-run             # inspect the tarball contents
npm version minor              # bump + tag
npm publish                    # upload
git push --follow-tags         # push code + tag
```

**Lifecycle scripts npm runs for you during publish:**

| Script | When |
|---|---|
| `prepublishOnly` | before packing, **only on publish** — this project runs `lint && build` here |
| `prepack` | before the tarball is created (also on `npm pack`) |
| `prepare` | after `npm install` in the package dir, and before publish — common place to build |
| `postpack`, `postpublish` | cleanup / notifications |

This project's `prepublishOnly: "npm run lint && npm run build"` is the safety net: **you cannot publish code that doesn't lint or build.**

### 6.6 Dist-tags, prereleases, and scoped packages

Every publish gets a tag; the default is `latest`, which is what plain `npm install crisplogs` resolves to.

```bash
npm publish --tag beta                  # publishes without moving `latest`
npm install crisplogs@beta
npm dist-tag ls crisplogs               # list tags
npm dist-tag add crisplogs@0.4.0 latest # promote a version
```

Prerelease versions (`0.4.0-beta.1`) are excluded from `^`/`~` ranges unless explicitly requested.

**Scoped packages** (`@username/package`) are namespaced and default to **private**, which requires a paid plan. To publish a scoped package for free:

```bash
npm publish --access public
# or permanently:  "publishConfig": { "access": "public" }
```

### 6.7 Unpublishing, deprecating, and why you should care

npm's unpublish policy is deliberately restrictive (a legacy of the 2016 `left-pad` incident, where an unpublished 11-line package broke builds worldwide):

- You can unpublish within **72 hours** of publishing.
- After that, only if the package has no dependents and low download counts.
- **A version number, once published, can never be reused** — even after unpublishing.

The correct tool for "don't use this version" is deprecation, which leaves the tarball installable but prints a warning:

```bash
npm deprecate crisplogs@"<0.3.0" "Upgrade to 0.3.0: parseColorString now throws on invalid colors"
npm deprecate crisplogs@0.2.1 ""     # un-deprecate with an empty message
```

### 6.8 Security and trust

- **2FA**: enable it on your npm account, and consider `npm profile enable-2fa auth-and-writes` so every publish requires an OTP (`npm publish --otp=123456`).
- **Automation tokens**: for CI, create a granular access token rather than reusing your login. Never commit `.npmrc`.
- **Provenance**: `npm publish --provenance` from a supported CI (like GitHub Actions) attaches a signed attestation linking the tarball to the exact commit and workflow that built it. It shows as a verified badge on npm.
- **`npm audit`** checks your dependency tree against the advisory DB. Zero runtime dependencies means this project's attack surface is essentially its own code.
- **Install scripts** (`postinstall`) in dependencies are an established supply-chain vector; `npm ci --ignore-scripts` in CI is a reasonable hardening step.

### 6.9 Testing a package locally before publishing

Four techniques, roughly in order of fidelity:

```bash
# 1. symlink into a test project (fast, but hoisting/resolution differs from real installs)
cd crisplogs-js && npm link
cd ../my-test-app && npm link crisplogs

# 2. install the actual tarball (highest fidelity — this is exactly what consumers get)
npm pack
cd ../my-test-app && npm install ../crisplogs-js/crisplogs-0.3.0.tgz

# 3. install straight from a local path or git
npm install ../crisplogs-js
npm install github:dev22603/crisplogs-js#main

# 4. publish a prerelease under a non-latest tag
npm publish --tag next
```

Technique 2 is the one that catches missing `files` entries and broken `exports` maps — the two most common "works locally, broken for users" bugs.

### 6.10 `npm install` vs `npm ci`, and lockfiles

- `npm install` resolves ranges, may update `package-lock.json`, and writes to it.
- `npm ci` deletes `node_modules` and installs *exactly* what the lockfile says. Fails if lockfile and package.json disagree. **Use this in CI** — it's faster and reproducible.
- The lockfile records resolved versions plus integrity hashes (`sha512-...`) so a tampered tarball fails verification.
- **Libraries commit their lockfile** for reproducible development, but consumers never see it — it isn't published and doesn't constrain them.

### 6.11 The build toolchain, and why these choices

| Tool | Role | Why not the alternative |
|---|---|---|
| **tsup** | bundles TS → dual CJS/ESM + `.d.ts` | Raw `tsc` can't emit both formats from one config; Rollup needs plugin wiring. tsup is a thin, zero-config wrapper over esbuild. |
| **Vitest** | test runner | Native ESM + TypeScript with no transform config, Jest-compatible API, fast. |
| **Biome** | lint + format | One Rust binary replacing ESLint + Prettier; no plugin dependency tree. |
| **TypeScript strict** | type checking | `strict: true` catches null/undefined mistakes at compile time. |

Note that `dts: true` runs a real type-check pass, so a type error fails the build — which, via `prepublishOnly`, blocks the publish.

---

## 7. Using crisplogs in real projects

### 7.1 The standard integration pattern

**One setup call at the entry point, module loggers everywhere else.**

```ts
// src/logging.ts — the single place logging is configured
import { setupLogging } from "crisplogs";

const isProd = process.env.NODE_ENV === "production";

export const logger = setupLogging({
  level: (process.env.LOG_LEVEL as any) ?? (isProd ? "INFO" : "DEBUG"),
  colored: !isProd && process.stdout.isTTY,   // no ANSI in captured logs
  style: isProd ? null : "long-boxed",
  extraFormat: isProd ? "json" : "inline",
  captureCallerInfo: !isProd,                  // skip stack capture in prod
  file: isProd ? "logs/app.log" : null,
  fileLevel: "WARNING",
});
```

```ts
// src/services/users.ts
import { moduleLogger } from "crisplogs";
const log = moduleLogger();          // tag becomes [users]

export async function createUser(email: string) {
  log.info("creating user", { email });
  try {
    const user = await db.users.insert({ email });
    log.info("user created", { userId: user.id });
    return user;
  } catch (err) {
    log.error("user creation failed", {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;   // log AND rethrow — never swallow
  }
}
```

Import order matters: `setupLogging` must run before any `moduleLogger()` call executes, or the module logger will have no handlers. Import `./logging` first in your entry file.

### 7.2 Express / Fastify request logging

```ts
import express from "express";
import { getLogger } from "crisplogs";

const log = getLogger("http");
const app = express();

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ctx = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      requestId: req.header("x-request-id"),
    };
    if (res.statusCode >= 500) log.error("request failed", ctx);
    else if (res.statusCode >= 400) log.warning("request rejected", ctx);
    else log.info("request", ctx);
  });
  next();
});
```

### 7.3 CLI tools — the sweet spot

This is where crisplogs is strongest. Box styles and colors are genuinely valuable in a terminal, and CLIs don't have the throughput concerns of a server.

```ts
const logger = setupLogging({
  style: "short-dynamic",
  colored: process.stdout.isTTY && !process.env.NO_COLOR,
  datefmt: "%H:%M:%S",
  level: flags.verbose ? "DEBUG" : "INFO",
});
```

Respecting `NO_COLOR` and `isTTY` is standard CLI etiquette: piping output to a file or `grep` shouldn't produce escape-code soup.

### 7.4 Docker / Kubernetes

Containers expect logs on stdout, collected by the runtime — **don't** use the `file` option there.

```ts
setupLogging({
  level: "INFO",
  colored: false,          // log collectors don't render ANSI
  style: null,             // box characters break line-based parsers
  extraFormat: "json",
  captureCallerInfo: false,
});
```

Be aware that this still emits `LEVEL timestamp [name] file:line - message {json}`, which is *not* a single JSON object per line. If your aggregator (Loki, Datadog, ELK) needs full JSON lines, either write a custom handler (below) or use a JSON-native logger.

### 7.5 Extending it: custom handlers

The `Handler` interface is 4 members, so shipping logs anywhere is straightforward:

```ts
import type { Handler, LogRecord } from "crisplogs";
import { LEVEL_VALUES } from "crisplogs";

class BatchingHttpHandler implements Handler {
  readonly level = LEVEL_VALUES.WARNING;
  formatter = { format: (r: LogRecord) => r.message };
  private buffer: LogRecord[] = [];
  private timer = setInterval(() => this.flush(), 5000);

  emit(record: LogRecord) {
    this.buffer.push(record);
    if (this.buffer.length >= 100) this.flush();
  }

  private flush() {
    if (!this.buffer.length) return;
    const batch = this.buffer.splice(0);
    fetch("https://logs.example.com/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(batch),
    }).catch(() => { /* never let logging break the app */ });
  }

  close() { clearInterval(this.timer); this.flush(); }
}

logger.addHandler(new BatchingHttpHandler());
```

Batching matters: a handler that awaits a network call per log line will destroy throughput.

### 7.6 Testing code that logs

```ts
import { afterEach, vi } from "vitest";
import { resetLogging, setupLogging } from "crisplogs";

afterEach(() => {
  resetLogging();          // close handlers, clear the registry
  vi.restoreAllMocks();
});

it("logs a warning on retry", () => {
  const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const logger = setupLogging({ colored: false, name: "test" });
  doTheThing(logger);
  expect(write.mock.calls[0][0]).toContain("retrying");
});
```

`colored: false` in tests makes assertions readable — otherwise you're matching against escape codes.

### 7.7 When to use crisplogs — and when not to

**Good fit:**
- CLI tools and developer tooling
- Local development for services (readable, boxed, colored)
- Small services and side projects where an extra dependency tree isn't wanted
- Scripts, cron jobs, build tooling
- Anywhere zero dependencies is a hard requirement

**Reach for something else when you need:**
- **Maximum throughput** → **pino**. It's the benchmark leader, using async transports in worker threads and doing minimal work on the hot path. crisplogs writes synchronously to stdout and (by default) builds a stack trace per call.
- **True JSON-lines output** for log aggregation → **pino** or **winston** with a JSON format.
- **Automatic PII/secret redaction** → pino's `redact` option. crisplogs has none.
- **Log rotation** → `winston-daily-rotate-file` or an external tool like `logrotate`. `CleanFileHandler` appends forever.
- **A large transport ecosystem** (Elasticsearch, CloudWatch, Sentry, Kafka) → **winston**.
- **Distributed tracing context propagation** → OpenTelemetry logging + an instrumented logger.
- **Browser support** → this is Node-only (`node:fs`, `node:path`, `process.stdout`).

**Honest framing for an interview:** "For a production HTTP service under load I'd use pino. I built crisplogs for the developer-experience end — CLIs and local dev, where readable output matters more than nanoseconds per line — and to learn the full library-authoring and publishing lifecycle end to end."

### 7.8 A production checklist

- [ ] `setupLogging` called exactly once, in the entry module, before anything else logs
- [ ] Level driven by env var, defaulting to `INFO` in production
- [ ] `colored: false` when not a TTY (or when `NO_COLOR` is set)
- [ ] `captureCallerInfo: false` in production hot paths
- [ ] stdout in containers; files only on VMs with rotation configured externally
- [ ] Never log secrets, tokens, passwords, full card numbers, or raw PII in `extra`
- [ ] `resetLogging()` in test teardown
- [ ] Version pinned with `~0.3.0` while the package is 0.x
- [ ] Log *and* rethrow in catch blocks; don't let logging replace error handling

---

## 8. Known gaps, bugs, and honest limitations

Being able to critique your own project is one of the strongest signals in an interview. These are real, verified findings in the current tree.

### Verified issues

1. **`isEnabledFor()` returns the wrong answer after `setupLogging({ level })`.**
   `setupLogging` always constructs the `Logger` with `LEVEL_VALUES.DEBUG` and puts the real threshold on the *handler*. So with `level: "WARNING"`, `logger.isEnabledFor("DEBUG")` returns `true` even though DEBUG output is filtered out at the handler. Verified:
   ```
   logger.level = 10, isEnabledFor("DEBUG") = true, but debug() prints nothing
   ```
   This defeats the documented "guard expensive serialization" use case. **Fix:** have `isEnabledFor` also check `Math.min(...handlers.map(h => h.level))`, or set the logger level from the option.

2. **One test fails on non-Windows platforms.** `tests/utils.test.ts:117` expects `deriveModuleName("D:\\proj\\api\\routes.js") === "routes"`, but `node:path`'s `basename` on POSIX doesn't treat `\` as a separator, so it returns the whole string. The suite is 90/91 on Linux and macOS. **Fix:** use `path.win32.basename` when the path looks Windows-shaped, or make the test platform-conditional.

3. **`engines` disagrees with the docs.** `package.json` says `node >=16.0.0`; `CONTRIBUTING.md` says the package targets `>=18.0.0`. One of them is wrong.

4. **No CI.** There's no `.github/workflows`, so nothing runs the tests, lint, or build on push. `prepublishOnly` is the only gate, and it runs on the publisher's machine. **Fix:** a GitHub Actions workflow running `npm ci && npm run lint && npm test && npm run build` across a Node version matrix, plus a publish job using `--provenance`.

5. **Source maps point at files that aren't shipped.** `files: ["dist"]` excludes `src/`, but the built `.map` files reference it. Either ship `src` or drop the maps.

### Design limitations (by choice, but you should be able to name them)

- **Synchronous console writes.** `process.stdout.write` is synchronous to files and TTYs on POSIX. Under heavy logging this blocks the event loop. pino avoids this with worker-thread transports.
- **Stack capture on every call** is the dominant per-log cost. Mitigated but not solved by `captureCallerInfo: false`.
- **The formatter is shared between console and file handlers**, so you can't have colored boxes on the console and plain single lines in the file — the file just gets the same layout with ANSI stripped.
- **No log rotation, no sampling, no rate limiting, no redaction, no async flush guarantees on process exit.** A `process.on("exit")` flush hook would be a sensible addition.
- **No child-logger context binding.** There's no `logger.child({ requestId })` that automatically merges context into every subsequent call — you pass `extra` manually each time. This is the single most requested feature in real-world logging.
- **Extras are silently dropped in short box styles.** Documented, but silent data loss is a debatable default; a warning or a `long-boxed` fallback might be better.
- **No benchmarks.** Claims about performance are currently unmeasured.

### A credible roadmap to 1.0

1. Fix `isEnabledFor` and the Windows path test; add CI with a Node matrix.
2. Add `logger.child(context)` for bound context.
3. Add a JSON-lines formatter for aggregators.
4. Add optional per-handler formatters.
5. Add benchmarks against pino/winston so the tradeoffs are documented, not asserted.
6. Add redaction hooks for sensitive keys.
7. Freeze the API and cut 1.0.0.

---

## 9. Interview questions & answers

### A. Project overview and motivation

**Q: Walk me through this project.**
A: crisplogs is a zero-dependency Node.js logging library published on npm. The core idea is that `setupLogging()` — one call — gives you production-shaped logs: colored level tags, timestamps, the caller's file and line, an optional named tag, structured key-value context, and optional file output. It follows the Logger/Record/Handler/Formatter architecture from Python's `logging` module, which cleanly separates *when* to log from *how it's rendered* and *where it goes*. It's ~1,150 lines of strict TypeScript, 91 tests, and ships dual ESM and CommonJS builds with type declarations. It's at 0.3.0 with six published versions.

**Q: Why build another logger when pino and winston exist?**
A: Two reasons. First, a genuine gap at the developer-experience end: pino optimizes for machine-readable throughput and needs `pino-pretty` to be human-readable, and winston brings a dependency tree. For CLIs and local development I wanted readable, colored, boxed output with zero dependencies and one line of setup. Second, honestly, the packaging lifecycle itself was the point — dual-format builds, `exports` maps, semver policy, publishing — you only really learn that by shipping something.

**Q: Why model it on Python's logging module?**
A: The Logger/Handler/Formatter split is a proven design. One record can fan out to multiple destinations, each with its own threshold, and formatting is a pure function separate from I/O. That's what makes `level: "DEBUG", fileLevel: "WARNING"` fall out naturally. Matching the numeric level values (10/20/30/40/50) and `strftime` tokens also means anyone coming from Python is immediately at home.

**Q: What was the hardest part?**
A: ANSI-aware layout. A colored string's `.length` isn't its visible width — `"\x1b[32mOK\x1b[0m"` is 11 characters but 2 columns. Every padding, wrapping, and auto-width calculation has to measure `stripAnsi(text).length` instead. I had an actual bug where colored box borders drifted out of alignment, fixed in the commit that made `wordWrap` measure visible width.

### B. Technical deep dives on the code

**Q: How do you capture the caller's file and line number?**
A: V8's `Error.captureStackTrace(targetObject, constructorOpt)`. It writes a `.stack` string onto any object, and the second argument tells V8 to omit every frame at or above that function. Each level method passes itself — `this.info` from inside `info()` — so the first frame in the resulting stack is the user's call site. Then two regexes handle V8's two frame formats, one with parentheses and one without. It's a V8-specific API, so there's a `typeof` guard and an `<anonymous>:0` fallback.

**Q: What does that cost, and what did you do about it?**
A: It's the most expensive thing in the library — a stack trace on every single call. There's a `captureCallerInfo: false` option that skips it entirely; logs then show `<anonymous>:0`. The honest answer is that this is exactly why pino is faster: pino does essentially no work on the hot path, while crisplogs trades throughput for the file:line that makes logs actually useful during development. I'd recommend disabling it in production hot paths.

**Q: There are four output styles. Four formatter classes?**
A: There were, originally. Version 0.2.0 collapsed them into one configurable `LogFormatter` because the four classes shared 80% of their logic and differed in three booleans: draw a box, full border vs left border, and word wrap. Inheritance was encoding a small combination space as a type hierarchy. Composition through options made it one class, and it also unlocked combinations the class hierarchy couldn't express — like a full-border box *with* word wrap.

**Q: What happens if a handler throws?**
A: It's caught. `_log` wraps each `handler.emit` in try/catch and writes a message to stderr — and even that stderr write is wrapped, because if stderr itself is broken there's nothing left to do but swallow. Same posture in `clearHandlers`, which catches errors from `close()`. The principle is that a logger that crashes the application it's observing is worse than no logger at all.

**Q: What if someone logs an object with a circular reference?**
A: `JSON.stringify` throws a `TypeError` on cyclic structures, so all serialization goes through a `safeStringify` helper that catches it and returns `"[Circular]"`. Same defensive reasoning.

**Q: Explain the logger registry.**
A: A module-scoped `Map<string, Logger>`. `setupLogging` registers under a name (`""` for root), `getLogger(name)` returns an existing logger or creates a child that inherits the root's handlers, and `resetLogging()` / `removeLogger()` clean up. Two subtleties: calling `setupLogging` twice with the same name would attach a second console handler and print everything twice, so it calls `clearHandlers()` on the existing logger first. And because the map is module-scoped, loading both the ESM and CJS builds in one process creates two independent registries — the dual-package hazard.

**Q: What's the dual-package hazard?**
A: When a package ships both ESM and CJS, Node treats them as separate module instances. If part of your dependency tree does `require("crisplogs")` and another part does `import "crisplogs"`, you get two copies with two registries — configure one, and the other still has no handlers. It's an inherent cost of dual publishing. Mitigations are documenting it (what I did), shipping ESM-only, or moving shared state outside the module.

**Q: How does `moduleLogger()` know the file name?**
A: Same stack-capture trick. It calls `getCallerInfo(moduleLogger)` to get the caller's path, then `deriveModuleName` takes the basename without extension — `users.ts` becomes `"users"` — and delegates to `getLogger`. So you get a per-file tag without `import.meta.url` or a hardcoded string, and it works identically in ESM and CJS.

**Q: Why string-literal unions instead of TypeScript enums for `Level`?**
A: Unions erase completely at compile time, so no runtime object is emitted. They're structurally assignable from plain strings, so JavaScript consumers don't need to import anything to pass `"INFO"`. And they give exhaustiveness checking in switch statements. TS enums generate runtime code and have well-known quirks — numeric enums allow arbitrary numbers, and `const enum` breaks under isolated-modules transpilation.

**Q: You validate options at runtime even though TypeScript checks them. Why?**
A: TypeScript is compile-time only, and roughly half of npm consumers are on plain JavaScript. Types offer them nothing. `setupLogging({ level: "info" })` from JS would otherwise silently produce `LEVEL_VALUES["info"] === undefined` and break comparisons in a confusing way. The runtime check turns that into an `InvalidLevelError` naming the valid options. It's the "parse, don't validate" boundary — untrusted input gets checked once, at the edge.

**Q: Why a custom error hierarchy?**
A: So consumers can scope a catch block. Everything extends `CrisplogsError`, which extends `Error`, so `catch (e) { if (e instanceof CrisplogsError) }` catches library misconfiguration without swallowing genuine bugs, and `instanceof InvalidLevelError` distinguishes specific cases. Each class sets `this.name` so stack traces read `InvalidLevelError:` rather than `Error:`. It was a breaking change in 0.3.0 — code catching `TypeError` had to switch — which is documented in the changelog.

**Q: In 0.3.0 you made invalid color strings throw instead of being ignored. Isn't throwing worse?**
A: Silent failure was worse. Before 0.3.0, `"brigt_red"` produced an empty ANSI sequence, so your logs were just... uncolored, with no signal. Debugging that means suspecting your terminal, your CI, your config, before ever suspecting the typo. The failure surfaces at `setupLogging` — startup — not in the middle of request handling, so failing fast is safe. It's a breaking change and it's in the changelog with a migration note.

**Q: Why zero runtime dependencies?**
A: Three reasons. Supply-chain surface: every transitive dependency is code you're implicitly trusting, and logging sits in every file of an application. Install size and resolution time. And version conflicts — a logger that drags in a `chalk` version fighting with the app's is a bad neighbor. The cost was implementing `strftime`, ANSI parsing, and word wrapping myself, which is maybe 300 lines. For a library that specific, that's a good trade.

### C. Testing

**Q: How do you test something whose output is terminal escape codes?**
A: Three layers. Formatters are pure functions — feed a fixed `LogRecord` from a `makeRecord()` factory with a frozen timestamp, assert on the returned string. Handlers get tested by spying on `process.stdout.write` with `vi.spyOn(...).mockImplementation(() => true)` and asserting on captured calls. And utilities like `stripAnsi`, `strftime`, and `wordWrap` are tested directly with table-driven cases. The colored assertions check for `\x1b[` markers and specific codes; most behavioral tests run with `colored: false` so assertions are readable.

**Q: 91 tests but no coverage number. Is that a gap?**
A: Yes — I'd add `vitest --coverage` and a threshold. Coverage isn't a quality metric on its own, but it's a useful floor and it catches genuinely untested branches. Right now I know from writing them that the tests cover all four styles, all three extra formats, every validation error, level filtering on both logger and handler, file writing with ANSI stripping, and the registry lifecycle.

**Q: Are there any failing tests?**
A: One, and it's environment-dependent. A test asserts `deriveModuleName("D:\\proj\\api\\routes.js")` returns `"routes"`, but `node:path`'s `basename` on POSIX doesn't treat backslash as a separator, so on Linux and macOS it returns the whole string. The fix is either `path.win32.basename` for Windows-shaped paths or making the test platform-conditional. It's a good illustration of why CI with an OS matrix matters — running only on one machine hides this.

**Q: How would you test the file handler without leaving files around?**
A: Write to a temp directory from `os.tmpdir()`, and clean up in `afterEach`. The tricky part is that `fs.WriteStream` is asynchronous, so you have to await the `finish` event after `close()` before reading the file back — otherwise you're racing the flush. An alternative for pure unit testing is injecting the stream, which would make the handler testable with an in-memory writable.

### D. npm and packaging

**Q: What actually happens when you run `npm publish`?**
A: npm runs `prepublishOnly` (here: lint and build), then `prepack`, then it creates a gzipped tarball containing only what the `files` array allows plus the always-included files like README and LICENSE. It uploads that with your auth token, and the registry rejects it if the name+version already exists. Then `postpublish` runs. The registry does no building — you publish artifacts, not source.

**Q: How do you support both ESM and CommonJS?**
A: tsup emits both from one TypeScript entry: `dist/index.js` for CJS and `dist/index.mjs` for ESM, plus `.d.ts` and `.d.mts` declarations. The `exports` map routes consumers — `require` gets the CJS file, `import` gets the ESM file, and `types` is listed first because condition order matters for TypeScript resolution. `main`, `module`, and `types` are kept as fallbacks for tooling older than the `exports` field.

**Q: What's the difference between `main`, `module`, `exports`, and `types`?**
A: `main` is the original CJS entry. `module` is a bundler convention, never part of Node's resolution. `types` points at declarations for older TS resolvers. `exports` is the modern one and it supersedes all of them in Node 12+ — it's a conditional map (`import`/`require`/`types`/`node`/`default`), and critically it *encapsulates* the package: once you define `exports`, consumers can't deep-import internal files that you didn't list. That's how this package prevents people from reaching into `dist/formatters.js` and coupling to internals.

**Q: `files` vs `.npmignore`?**
A: `files` is an allowlist in package.json, `.npmignore` is a denylist file. If both exist, `files` wins. I use `files: ["dist"]` because an allowlist fails safe — new files don't accidentally ship. With a denylist, forgetting to ignore a new directory means it silently ships, which is how secrets and `.env` files end up on the registry. `npm pack --dry-run` verifies exactly what's included before you publish.

**Q: How do you decide patch vs minor vs major?**
A: Semver: patch for backward-compatible bug fixes, minor for backward-compatible features, major for breaking changes. But this package is 0.x, where the convention is that the API is unstable and minor bumps *may* break. 0.3.0 is a good example — it added `moduleLogger` (a feature) but also made invalid colors throw and swapped `TypeError` for typed errors (breaking). Under 1.x that would have been 1.0.0 → 2.0.0. The README states the 0.x policy and recommends `~0.3.0` pinning, and everything's in the changelog.

**Q: What does `^0.3.0` match?**
A: `>=0.3.0 <0.4.0` — caret is special-cased for 0.x versions because the leftmost non-zero digit is treated as the major. For `^1.3.0` it would be `>=1.3.0 <2.0.0`. This trips people up constantly.

**Q: You published a broken version. What now?**
A: Publish a fix as a new patch version immediately, then `npm deprecate crisplogs@0.3.1 "broken, use 0.3.2"` so anyone installing it sees a warning. Unpublishing is a last resort — it's only allowed within 72 hours and only when nothing depends on it, and the version number is burned forever. If it's a security issue, I'd also file an advisory so `npm audit` picks it up. The `left-pad` incident is why the policy is this strict.

**Q: How do you test a package before publishing?**
A: `npm pack` to build the real tarball, then `npm install ../crisplogs-js/crisplogs-0.3.0.tgz` in a scratch project. That's the highest-fidelity check because it exercises the exact `files` and `exports` config consumers get. `npm link` is faster but symlinks resolve differently and can hide problems. And I'd verify both `import` and `require` work, and that TypeScript resolves the types, since those are the three things that break independently.

**Q: What are peer dependencies and when would you use one?**
A: A peer dependency declares "the host application must provide this" — you use it when your package extends something that must be a single shared instance, like a React component library declaring React as a peer. If it were a regular dependency you could end up with two copies of React and broken hooks. crisplogs has none because it's standalone.

**Q: How would you set up CI/CD for this?**
A: A GitHub Actions workflow on push and PR running `npm ci`, `npm run lint`, `npm test`, `npm run build` across a Node matrix — 16, 18, 20, 22 — and an OS matrix including Windows, which would have caught that failing path test. Then a release workflow triggered on version tags that runs the same checks and publishes with `--provenance` using an npm automation token in secrets. Provenance attaches a signed attestation linking the tarball to the exact commit and workflow that built it. Right now there's no CI at all, which is the biggest gap in the project.

**Q: What's `npm ci` and why use it in CI?**
A: It deletes `node_modules` and installs exactly what `package-lock.json` specifies, failing if the lockfile and package.json disagree. `npm install` resolves ranges and may mutate the lockfile. `ci` is faster and reproducible — the same commit gives the same tree every time, which is the whole point of CI.

**Q: Should a library commit its lockfile?**
A: Yes, for reproducible development and CI, but it's important to understand it doesn't affect consumers — the lockfile isn't published and doesn't constrain their resolution. Only your `dependencies` ranges do. So the lockfile is about *your* team's reproducibility, not your users'.

**Q: How do you keep secrets out of a published package?**
A: The `files` allowlist is the primary defense — only `dist` ships. Beyond that: `npm pack --dry-run` before every publish, never committing `.npmrc` (npm excludes it from tarballs, but it can leak via git), automation tokens rather than login credentials in CI, and 2FA on the account with auth-and-writes so a stolen token alone can't publish.

### E. Design, tradeoffs, and system thinking

**Q: How does this compare to pino?**
A: Different targets. pino optimizes for throughput — minimal work on the hot path, JSON output, async transports in worker threads — and expects a separate process to make it human-readable. crisplogs does the opposite: it spends effort per line (stack capture, ANSI formatting, box drawing) to produce output a human reads directly in a terminal. For a high-traffic production service, pino is the right answer and I'd say so. For CLIs, local development, scripts, and small services, crisplogs gives you the readable output in one line with no dependencies.

**Q: What would you change if you started over?**
A: Four things. First, per-handler formatters — right now console and file share one formatter, so you can't have boxes on screen and plain lines in the file. Second, `logger.child({ requestId })` for bound context, which is the most useful feature in real-world logging and the biggest missing piece. Third, make `isEnabledFor` account for handler levels; right now it has a real bug. Fourth, CI from day one, with an OS matrix.

**Q: How would you add request-scoped context — a request ID on every log line?**
A: `AsyncLocalStorage` from `node:async_hooks`. You store a context object at the start of each request, and `Logger._log` reads from the store and merges it into `extra`. That's how pino and OpenTelemetry propagate context, and it survives across `await` boundaries where a plain variable wouldn't. The alternative is an explicit `logger.child({ requestId })` that returns a logger with bound context — more explicit, less magic, but you have to thread it through your call stack.

**Q: How would you make this faster?**
A: I'd measure first — there are no benchmarks, so any answer is a hypothesis. But the likely order is: stack capture is the biggest cost, then string concatenation in the formatter, then the synchronous stdout write. Fixes: default `captureCallerInfo` to false in production, do an early level check before building the record (it already does this), precompute the ANSI escape sequences per level once at setup instead of calling `parseColorString` on every format, and buffer writes with a periodic flush instead of one syscall per line. pino's approach — serialize on a worker thread — is the structural fix.

**Q: `parseColorString` runs on every formatted line. Is that a problem?**
A: Yes, and it's a legitimate criticism. The color strings are fixed at setup time, so parsing them per record is pure waste — it splits, trims, and lowercases the same strings millions of times. The fix is to resolve the whole color map to escape sequences once in the `LogFormatter` constructor and just look them up in `format`. That's probably the single highest-value performance change and it's not hard.

**Q: Someone reports that logs print twice. How do you debug it?**
A: Almost certainly duplicate handlers. Three likely causes: `setupLogging` called twice with different names on what's meant to be the same logger; a handler added manually on top of the ones `setupLogging` created; or the dual-package hazard, where ESM and CJS copies both have registries. I'd check `logger.handlers.length` first — that immediately distinguishes duplicate-handler from duplicate-logger. `addHandler` is idempotent by instance identity, so it only guards against the same *object* being added twice, not two equivalent handlers.

**Q: How do you handle a user reporting a bug in an old version?**
A: Reproduce on that version first, then on latest — half of these are already fixed. If it's fixed, point at the changelog entry and the upgrade path. If it's live, write a failing test, fix it, release a patch, and reply on the issue with the version. If it's a breaking-change surprise rather than a bug, that's a documentation failure on my side and the changelog and README need to be clearer.

### F. About having built this with AI assistance

Be straightforward here. Interviewers care far more about whether you understand what you shipped than about how the first draft got written.

**Q: Did you use AI to build this?**
A: Yes, heavily — I used AI coding assistants throughout. I treated it like working with a fast collaborator: I made the design decisions, reviewed every change, and I can defend any part of the codebase. The refactors are a good example — collapsing four formatter classes into one configurable class, and making invalid colors throw instead of failing silently, were both my calls based on problems I hit while using the library. I can also tell you where it's weak: `isEnabledFor` has a real bug, one test fails on non-Windows platforms, and there's no CI. I found those by going through the code and running the suite, not by assuming it was correct.

**Q: How do you make sure you understand code you didn't type character by character?**
A: I read it, I test it, and I break it. For this project that meant running every example, writing tests that assert on actual output, and deliberately reasoning about the parts that aren't obvious — the `Error.captureStackTrace` second argument, the ANSI-aware width math, why the registry has to clear handlers on reconfiguration. Anything I couldn't explain to someone else, I dug into until I could. That's also how I found the `isEnabledFor` inconsistency: I was tracing what `logger.level` was actually set to and noticed `setupLogging` always passes DEBUG.

**Q: What did you learn that you couldn't have learned by just reading docs?**
A: The packaging half. Dual ESM/CJS output and the `exports` conditional map, why `files` as an allowlist beats `.npmignore`, what `prepublishOnly` is for, that a published version number can never be reused, that `^0.3.0` doesn't mean what people assume. And the operational reality that once something is published, other people depend on it — which is what makes the 0.x versioning policy and the changelog matter rather than being ceremony.

---

## 10. Cheat sheet + 60-second walkthrough script

### Numbers to have ready

| Fact | Number |
|---|---|
| Runtime dependencies | 0 |
| Source lines / files | ~1,150 / 8 |
| Tests | 91 (90 passing on Linux/macOS) |
| Published versions | 6 |
| Bundle size (CJS / ESM) | 23 KB / 20 KB |
| Levels | DEBUG 10, INFO 20, WARNING 30, ERROR 40, CRITICAL 50 |
| Output styles | 4 |
| Min Node | 16 |

### The API in ten lines

```ts
import { setupLogging, getLogger, moduleLogger, resetLogging } from "crisplogs";

const logger = setupLogging({
  level: "INFO", style: "long-boxed", colored: true, width: 100,
  datefmt: "%Y-%m-%d %H:%M:%S", extraFormat: "inline",
  file: "app.log", fileLevel: "WARNING", captureCallerInfo: true, name: "",
});

logger.info("message", { key: "value" });
const log = moduleLogger();      // [filename] tag
resetLogging();                  // test teardown
```

### npm commands worth memorizing

```bash
npm pack --dry-run                 # what will ship
npm version minor                  # bump + git tag
npm publish                        # upload (runs prepublishOnly)
npm publish --tag beta             # publish without moving `latest`
npm publish --provenance           # signed build attestation from CI
npm deprecate pkg@"<0.3.0" "msg"   # warn without removing
npm dist-tag ls pkg                # list tags
npm view pkg versions              # all published versions
npm ci                             # reproducible install from lockfile
```

### 60-second verbal walkthrough

> crisplogs is a zero-dependency Node logging library I published to npm — currently at 0.3.0 with six releases. One call, `setupLogging()`, gives you colored levels, timestamps, the caller's file and line, structured context, and optional file output.
>
> Architecturally it's Python's logging model: a Logger decides *when*, a Formatter decides *how it looks*, a Handler owns *where it goes*. That separation is what makes one record fan out to a console at DEBUG and a file at WARNING simultaneously.
>
> The two interesting technical bits are capturing the caller's file and line with V8's `Error.captureStackTrace`, using its second argument to cut the stack right at the user's call site, and making all the box layout ANSI-aware — a colored string's `.length` isn't its visible width, so every padding and wrapping calculation strips escape codes first.
>
> On packaging, it ships dual ESM and CommonJS builds through an `exports` map with TypeScript declarations for both, uses a `files` allowlist so only `dist` ships, and gates publishing behind `prepublishOnly` running lint and build.
>
> Where it stands honestly: it's the right tool for CLIs and local development. For a high-throughput production service I'd use pino, because it does almost no work on the hot path while this trades throughput for readability. The biggest gaps I'd close next are CI with an OS matrix — one test currently fails on Linux because of Windows path handling — a bug where `isEnabledFor` doesn't account for handler levels, and `logger.child()` for request-scoped context.
