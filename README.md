<p align="center">
  <h1 align="center">crisplogs</h1>
  <p align="center">Beautiful, structured terminal logging for Node.js</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/crisplogs"><img src="https://img.shields.io/npm/v/crisplogs.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/crisplogs"><img src="https://img.shields.io/npm/dm/crisplogs.svg" alt="npm downloads"></a>
  <a href="https://github.com/dev22603/crisplogs-js/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/crisplogs.svg" alt="license"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D16-brightgreen.svg" alt="node version">
  <img src="https://img.shields.io/badge/types-included-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-green.svg" alt="zero dependencies">
</p>

---

One function call to get production-ready logs with colors, box decorations, structured data, and file output. Zero runtime dependencies. Full TypeScript support.

```ts
import { setupLogging } from "crisplogs";

const logger = setupLogging();

logger.info("Server started on port 8000");
logger.warning("Disk usage at 85%", { mount: "/dev/sda1" });
logger.error("Connection failed", { host: "db.internal", retries: 3 });
```

```
INFO     2025-09-08 12:30:45 [root] app.ts:5 - Server started on port 8000
WARNING  2025-09-08 12:30:45 [root] app.ts:6 - Disk usage at 85% [mount=/dev/sda1]
ERROR    2025-09-08 12:30:45 [root] app.ts:7 - Connection failed [host=db.internal retries=3]
```

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Output Styles](#output-styles)
- [Options](#options)
- [Structured Data (Extras)](#structured-data-extras)
- [File Logging](#file-logging)
- [Named Loggers](#named-loggers)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [TypeScript](#typescript)
- [CommonJS](#commonjs)
- [Examples](#examples)
- [License](#license)

## Installation

```bash
npm install crisplogs
```

```bash
yarn add crisplogs
```

```bash
pnpm add crisplogs
```

## Quick Start

```ts
import { setupLogging } from "crisplogs";

const logger = setupLogging();

logger.debug("Loading configuration...");
logger.info("Server started on port 8000");
logger.warning("Disk usage at 85%");
logger.error("Failed to connect to database");
logger.critical("System is shutting down");
```

All five log levels are supported: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`.

## Output Styles

crisplogs ships with four output styles. Set the `style` option to switch between them.

### Default (no box)

Colored single-line output. Each level gets its own color.

```ts
const logger = setupLogging(); // or { style: null }
```

```
INFO     2025-09-08 12:30:45 [root] app.ts:5 - Server started
WARNING  2025-09-08 12:30:46 [root] app.ts:6 - Disk usage high
ERROR    2025-09-08 12:31:12 [root] db.ts:45 - Connection failed
```

### `short-fixed`

Fixed-width box with left border. Clean and consistent.

```ts
const logger = setupLogging({ style: "short-fixed" });
```

```
┌──────────────────────────────────────────────────────────────────────────────────
│ INFO     12:30:45 [root] app.ts:5 - Server started
└──────────────────────────────────────────────────────────────────────────────────
```

### `short-dynamic`

Full border that adjusts to fit the message width.

```ts
const logger = setupLogging({ style: "short-dynamic" });
```

```
┌──────────────────────────────────────────────────────────┐
│ INFO     12:30:45 [root] app.ts:5 - Server started       │
└──────────────────────────────────────────────────────────┘
```

### `long-boxed`

Word-wrapped box with left border. Best for long messages and structured data.

```ts
const logger = setupLogging({ style: "long-boxed", width: 80 });
```

```
┌──────────────────────────────────────────────────────────────────────────────────
│ INFO     12:34:56 [root] app.ts:10 - This is a long message that wraps neatly
│ across multiple lines without breaking words [userId=42 action=login]
└──────────────────────────────────────────────────────────────────────────────────
```

### Combining styles with color

All styles work with or without color:

```ts
setupLogging({ colored: true,  style: "long-boxed" });  // colored + boxed
setupLogging({ colored: false, style: "short-fixed" }); // plain + boxed
setupLogging({ colored: true,  style: null });           // colored, no box
setupLogging({ colored: false });                        // plain text
```

## Options

### `setupLogging(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `colored` | `boolean` | `true` | Enable ANSI colors in console output |
| `style` | `"short-fixed"` \| `"short-dynamic"` \| `"long-boxed"` \| `null` | `null` | Box decoration style |
| `level` | `Level` | `"DEBUG"` | Minimum log level for console |
| `width` | `number` | `100` | Box width in characters |
| `datefmt` | `string` | `"%Y-%m-%d %H:%M:%S"` | Timestamp format ([strftime tokens](#date-format-tokens)) |
| `logColors` | `Partial<Record<Level, string>>` | built-in scheme | Custom colors per level |
| `extraFormat` | `"inline"` \| `"json"` \| `"pretty"` | `"inline"` | How structured data is rendered |
| `file` | `string` \| `null` | `null` | Path to log file (ANSI auto-stripped) |
| `fileLevel` | `Level` \| `null` | same as `level` | Minimum level for file output |
| `name` | `string` | `""` | Logger name (`""` = root logger) |
| `captureCallerInfo` | `boolean` | `true` | Capture file path and line number |

### Log Levels

Levels follow Python's `logging` module hierarchy:

| Level | Value | Use for |
|-------|-------|---------|
| `DEBUG` | 10 | Detailed diagnostic information |
| `INFO` | 20 | Routine operational messages |
| `WARNING` | 30 | Something unexpected but recoverable |
| `ERROR` | 40 | A failure that needs attention |
| `CRITICAL` | 50 | System-level failure |

```ts
// Only show WARNING and above on console
const logger = setupLogging({ level: "WARNING" });

logger.debug("hidden");   // filtered out
logger.info("hidden");    // filtered out
logger.warning("shown");  // displayed
logger.error("shown");    // displayed
```

### Date Format Tokens

Uses Python-compatible `strftime` tokens:

| Token | Output | Example |
|-------|--------|---------|
| `%Y` | 4-digit year | `2025` |
| `%m` | Month (01-12) | `09` |
| `%d` | Day (01-31) | `08` |
| `%H` | Hour 24h (00-23) | `14` |
| `%M` | Minute (00-59) | `30` |
| `%S` | Second (00-59) | `45` |
| `%I` | Hour 12h (01-12) | `02` |
| `%p` | AM/PM | `PM` |
| `%a` / `%A` | Weekday short/full | `Mon` / `Monday` |
| `%b` / `%B` | Month short/full | `Sep` / `September` |
| `%%` | Literal `%` | `%` |

```ts
setupLogging({ datefmt: "%H:%M:%S" });         // 14:30:45
setupLogging({ datefmt: "%d/%m/%Y %H:%M" });   // 08/09/2025 14:30
setupLogging({ datefmt: "%I:%M %p" });          // 02:30 PM
```

### Custom Colors

Override colors for any log level. Supports basic colors, modifiers, backgrounds, and combinations:

```ts
setupLogging({
  logColors: {
    DEBUG: "thin_white",
    INFO: "bold_green",
    WARNING: "bold_yellow",
    ERROR: "bold_red,bg_white",
    CRITICAL: "bold_white,bg_red",
  },
});
```

**Available colors:** `black`, `red`, `green`, `yellow`, `blue`, `purple`/`magenta`, `cyan`, `white`

**Modifiers:** `bold_`, `thin_`/`dim_`, `italic_`, `underline_`

**Backgrounds:** `bg_red`, `bg_blue`, `bg_white`, etc.

**Combine with commas:** `"bold_red,bg_white"`

<details>
<summary>Default color scheme</summary>

| Level | Color |
|-------|-------|
| `DEBUG` | `cyan` |
| `INFO` | `green` |
| `WARNING` | `yellow` |
| `ERROR` | `red` |
| `CRITICAL` | `bold_red` |

</details>

## Structured Data (Extras)

Attach key-value context to any log message via the second argument:

```ts
logger.info("User signed up", { userId: 101, plan: "pro" });
logger.error("Payment failed", { orderId: 5524, gateway: "stripe" });
```

Control how extras are rendered with the `extraFormat` option:

### `"inline"` (default)

```
INFO  ... - User signed up [userId=101 plan=pro]
```

### `"json"`

```
INFO  ... - User signed up {"userId":101,"plan":"pro"}
```

### `"pretty"`

```
INFO  ... - User signed up
{
  "userId": 101,
  "plan": "pro"
}
```

```ts
setupLogging({ extraFormat: "json" });
setupLogging({ extraFormat: "pretty", style: "long-boxed" }); // great combo
```

> **Note:** Extras are rendered in the default (no box) and `long-boxed` styles. Short box styles (`short-fixed`, `short-dynamic`) do not display extras to preserve layout alignment.

## File Logging

Write logs to a file alongside console output. ANSI codes are automatically stripped so log files stay clean.

```ts
const logger = setupLogging({
  file: "logs/app.log",
});
```

Set a separate level threshold for the file — useful for verbose console output with a quieter file:

```ts
const logger = setupLogging({
  level: "DEBUG",          // console: show everything
  file: "logs/app.log",
  fileLevel: "WARNING",   // file: only WARNING and above
});
```

File writing is asynchronous (uses `WriteStream`) and won't block your event loop.

## Named Loggers

Use named loggers to identify which part of your application produced each message:

```ts
import { setupLogging, getLogger } from "crisplogs";

// Configure root logger once at startup
setupLogging({ level: "INFO" });

// Get named loggers anywhere in your app
const dbLogger  = getLogger("db");
const apiLogger = getLogger("api");

dbLogger.info("Connected to PostgreSQL");   // [db]  in output
apiLogger.info("Listening on :8080");        // [api] in output
```

Named loggers inherit the root logger's configuration (handlers, formatters). Use `setupLogging({ name: "..." })` to configure a specific logger independently.

## Advanced Usage

### Performance Tuning

Stack trace capture (`Error.captureStackTrace`) runs on every log call. Disable it in high-throughput scenarios:

```ts
const logger = setupLogging({ captureCallerInfo: false });
// Logs will show <anonymous>:0 instead of real file:line
```

### Check Level Before Logging

Skip expensive serialization when the message would be filtered:

```ts
if (logger.isEnabledFor("DEBUG")) {
  logger.debug("Full state dump", { state: expensiveSerialize(appState) });
}
```

### Cleanup

```ts
import { resetLogging, removeLogger } from "crisplogs";

removeLogger("db");   // remove and close one logger
resetLogging();       // close all loggers (useful in tests)
```

### Custom Handlers

Build on the `Handler` interface for custom destinations (HTTP, database, external service):

```ts
import type { Handler, LogRecord, Formatter } from "crisplogs";

const myHandler: Handler = {
  level: 20, // INFO
  formatter: { format: (record: LogRecord) => record.message },
  emit(record: LogRecord) {
    // send to your destination
    fetch("/logs", { method: "POST", body: this.formatter.format(record) });
  },
  close() {
    // cleanup resources
  },
};

logger.addHandler(myHandler);
```

### Custom Formatter

Use `LogFormatter` directly for full control:

```ts
import { LogFormatter } from "crisplogs";

const formatter = new LogFormatter({
  datefmt: "%H:%M:%S",
  logColors: { INFO: "bold_cyan" },
  colored: true,
  box: true,
  fullBorder: true,
  width: "auto",        // or a fixed number
  wordWrap: false,
  extraFormat: "json",
});
```

## API Reference

### Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `setupLogging(options?)` | `Logger` | Configure and register a logger |
| `getLogger(name?)` | `Logger` | Get a logger by name (inherits root config) |
| `resetLogging()` | `void` | Close all handlers, clear the registry |
| `removeLogger(name)` | `boolean` | Remove and close a single logger |
| `stripAnsi(text)` | `string` | Remove ANSI escape sequences from a string |

### Logger Methods

```ts
logger.debug(message, extra?)     // DEBUG level
logger.info(message, extra?)      // INFO level
logger.warning(message, extra?)   // WARNING level
logger.warn(message, extra?)      // alias for warning
logger.error(message, extra?)     // ERROR level
logger.critical(message, extra?)  // CRITICAL level
logger.log(level, message, extra?) // explicit level

logger.isEnabledFor(level)        // check if level would be logged
logger.addHandler(handler)        // add a handler
logger.removeHandler(handler)     // remove a handler (returns boolean)
logger.clearHandlers()            // remove and close all handlers
```

### Classes

| Class | Description |
|-------|-------------|
| `Logger` | Core logger with level filtering and handler dispatch |
| `LogFormatter` | Configurable formatter covering all output styles |
| `ConsoleHandler` | Writes formatted output to stdout |
| `CleanFileHandler` | Writes to file with ANSI stripping |

### Constants

| Constant | Description |
|----------|-------------|
| `LEVEL_VALUES` | `{ DEBUG: 10, INFO: 20, WARNING: 30, ERROR: 40, CRITICAL: 50 }` |
| `DEFAULT_LOG_COLORS` | Default color scheme for each level |
| `VERSION` | Package version string |

## TypeScript

All types are exported:

```ts
import type {
  Level,              // "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL"
  Style,              // "short-fixed" | "short-dynamic" | "long-boxed"
  ExtraFormat,        // "inline" | "json" | "pretty"
  SetupLoggingOptions,
  LogRecord,
  Formatter,
  Handler,
  FormatterOptions,
} from "crisplogs";
```

## CommonJS

```js
const { setupLogging } = require("crisplogs");

const logger = setupLogging();
logger.info("Hello from CommonJS!");
```

## Examples

See the [`examples/`](./examples) directory for runnable scripts:

```bash
node examples/basic.js            # default colored output
node examples/box-styles.js       # all box styles
node examples/custom-colors.js    # custom color scheme
node examples/extra-fields.js     # structured data
node examples/file-logging.js     # console + file output
node examples/level-filtering.js  # level thresholds
node examples/named-loggers.js    # named logger hierarchy
node examples/plain-output.js     # no colors
node examples/custom-date-format.js
```

## License

[MIT](./LICENSE)
