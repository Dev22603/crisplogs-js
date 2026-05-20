# AGENTS.md

Guidance for AI coding assistants using `crisplogs` in user code.

## Canonical imports

For 95% of cases, import only from the package root:

```ts
import { setupLogging, getLogger, moduleLogger } from "crisplogs";
```

For typed user code, the type aliases are also exported:

```ts
import type { Level, Style, ExtraFormat, SetupLoggingOptions } from "crisplogs";
```

For custom handlers or formatters:

```ts
import { LogFormatter, ConsoleHandler, CleanFileHandler } from "crisplogs";
import type { Handler, Formatter, LogRecord, FormatterOptions } from "crisplogs";
```

For error handling:

```ts
import { CrisplogsError, InvalidLevelError } from "crisplogs";
```

## The one-call pattern (do this first)

```ts
import { setupLogging } from "crisplogs";

const logger = setupLogging({ level: "INFO" });
logger.info("server started");
```

`setupLogging` returns a configured `Logger` and registers it. Call it once at application startup.

## Named loggers (use after `setupLogging`)

**Per-file tag (preferred):** `moduleLogger()` once at module scope — no manual name string.

```ts
import { setupLogging, moduleLogger } from "crisplogs";

setupLogging({ level: "INFO" });
export const logger = moduleLogger();   // [users] from users.ts
logger.info("connected");
```

**Manual subsystem tag:** `getLogger("db")` when the prefix should not match the filename.

```ts
import { setupLogging, getLogger } from "crisplogs";

setupLogging({ level: "INFO" });
const db = getLogger("db");
db.info("connected");                   // [db] in output
```

**Call site (`path:line`)** is automatic on every log when `captureCallerInfo` is true (default), independent of the `[name]` tag.

## Non-obvious behaviors

- **Extras and short box styles**: structured data passed as the second argument is rendered only in the default style and `long-boxed`. The `short-fixed` and `short-dynamic` styles intentionally drop extras to preserve layout alignment. To log structured data inside a box, use `style: "long-boxed"`.
- **File output strips ANSI**: writing to a file via `file: "path.log"` automatically strips color codes through `CleanFileHandler`. The same logger emits colored output to the console and clean text to the file simultaneously.
- **`captureCallerInfo: false` for hot paths**: caller-info capture inspects stack frames on every log call via `Error.captureStackTrace`. Disable in high-throughput code; logs will then show `<anonymous>:0` instead of real `file:line`.
- **`resetLogging()` in tests**: vitest test files that call `setupLogging` should call `resetLogging()` in `afterEach` to avoid handler accumulation across tests. See `tests/logger.test.ts` for the pattern.
- **`addHandler` is idempotent**: passing the same handler instance twice is a no-op. To replace a handler, call `removeHandler` first or `clearHandlers` to reset.
- **Logger level vs handler level**: `logger.level` is the floor; `handler.level` is per-destination. A record below either is dropped. The console handler inherits its level from `setupLogging({ level })`; a file handler inherits from `fileLevel ?? level`. Mutating `logger.level` after setup does NOT update the level of already-attached handlers.

## Antipatterns

- Do not call `setupLogging()` multiple times in the same process unless you intend to reconfigure. The library detects same-name reconfiguration and clears prior handlers, but mixing names accumulates loggers. Use `resetLogging()` first if reconfiguring globally.
- Do not pass lowercase levels (`"info"`, `"debug"`). Levels are uppercase: `"INFO"`, `"DEBUG"`. The `Level` type enforces this at compile time and `setupLogging` throws `InvalidLevelError` at runtime.
- Do not import from internal subpaths (anything other than `"crisplogs"` itself). The package only exposes the root entry; subpaths are not part of the public API.
- Do not subclass `LogFormatter` to change behavior; pass options instead. Build a custom `Formatter` from scratch (it is a one-method interface) if you need radically different output.
- Do not mix `import` and `require` of crisplogs in the same process. The logger registry is module-scoped; mixing module systems can produce two registries (the dual-package hazard).

## Color string format

Format: `[modifier_]color[,bg_color]`

- Colors: `black`, `red`, `green`, `yellow`, `blue`, `purple` (alias of `magenta`), `magenta`, `cyan`, `white`
- Modifiers: `bold_`, `thin_` (alias of `dim_`), `dim_`, `italic_`, `underline_`
- Backgrounds: `bg_black`, `bg_red`, `bg_green`, `bg_yellow`, `bg_blue`, `bg_purple`, `bg_magenta`, `bg_cyan`, `bg_white`

Valid: `"green"`, `"bold_red"`, `"bold_white,bg_red"`
Invalid: `"bright_red"` (unknown modifier), `"red,red"` (no `bg_` prefix on second color)

Color tokens are case-insensitive (`"GREEN"` and `"green"` both work).

Invalid color strings throw `InvalidColorError` from version 0.3.0 onward. Earlier versions silently produced uncolored output.

## Custom handlers

The `Handler` interface is one method:

```ts
import type { Handler, LogRecord, Formatter } from "crisplogs";
import { LEVEL_VALUES } from "crisplogs";

const httpHandler: Handler = {
  level: LEVEL_VALUES.WARNING,
  formatter: { format: (r) => JSON.stringify({ level: r.levelName, msg: r.message }) },
  emit(record) {
    fetch("https://logs.example.com", {
      method: "POST",
      body: this.formatter.format(record),
    }).catch(() => { /* drop on the floor; do not throw */ });
  },
  close() { /* flush queues here if buffering */ },
};

logger.addHandler(httpHandler);
```

`emit` should not throw. The `Logger` does catch handler errors, but writing to stderr on every failed log is its own kind of noise. Prefer fire-and-forget or buffered writes.

## Exception handling

All errors crisplogs throws inherit from `CrisplogsError`:

```ts
import { setupLogging, CrisplogsError, InvalidLevelError } from "crisplogs";

try {
  const logger = setupLogging({ level: "info" as any });  // wrong case
} catch (e) {
  if (e instanceof InvalidLevelError) { /* ... */ }
  else if (e instanceof CrisplogsError) { /* ... */ }
}
```

Available error classes (all inherit from `CrisplogsError` which inherits from `Error`):

- `InvalidLevelError` — bad `level` or `fileLevel`
- `InvalidStyleError` — bad `style` value
- `InvalidColorError` — unknown token in a color string
- `InvalidExtraFormatError` — bad `extraFormat` value
- `InvalidWidthError` — non-positive or non-finite `width`
- `InvalidFilePathError` — empty file path

Runtime validation runs even when TypeScript would catch the error at compile time, because not every consumer is a TypeScript user.

## Versioning

Currently 0.x: breaking changes possible between minor versions. Pin to a minor version (`"crisplogs": "~0.3.0"`) until 1.0.0 is released.

## Module system

The package ships both ESM and CJS:

```ts
import { setupLogging } from "crisplogs";        // ESM, preferred
const { setupLogging } = require("crisplogs");   // CJS, supported
```

Pick one per process. Mixing `import` and `require` of crisplogs in the same Node process can produce two separate logger registries (the dual-package hazard).
