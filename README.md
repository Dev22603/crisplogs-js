# crisplogs

Beautiful, colored, and boxed logging for Node.js. One function call to set up production-ready logs with colors, box decorations, and file output.

**Zero runtime dependencies.** Works with Node.js 16+. Ships with full TypeScript types.

## Installation

```bash
npm install crisplogs
```

## Quickstart

```ts
import { setupLogging } from "crisplogs";

const logger = setupLogging();

logger.debug("This is a debug message");
logger.info("Server started successfully");
logger.warning("Disk usage at 85%");
logger.error("Failed to connect to database");
logger.critical("System is shutting down");
```

## Styles

### Colored (default)

Plain colored output. Each log level gets its own color for easy scanning.

```ts
const logger = setupLogging({ colored: true });
```

```
INFO     2025-09-08 12:30:45 [root] /app/main.ts:25 - Server started
ERROR    2025-09-08 12:31:12 [root] /app/db.ts:45 - Connection failed
```

### Short Fixed Box

Fixed-width box with left border only. Good for short messages.

```ts
const logger = setupLogging({ style: "short-fixed" });
```

```
┌──────────────────────────────────────────────────────────────────────────────────
│ INFO     2025-09-08 12:30:45 [root] /app/main.ts:25 - Server started
└──────────────────────────────────────────────────────────────────────────────────
```

### Short Dynamic Box

Dynamic-width box with full border. Width adjusts to fit the message.

```ts
const logger = setupLogging({ style: "short-dynamic" });
```

```
┌──────────────────────────────────────────────────────────────┐
│ INFO     2025-09-08 12:30:45 [root] - Server started         │
└──────────────────────────────────────────────────────────────┘
```

### Long Boxed

Word-wrapped box with left border. Best for long messages and extra fields.

```ts
const logger = setupLogging({ style: "long-boxed" });
```

```
┌──────────────────────────────────────────────────────────────────────────────────
│ INFO     2025-09-08 12:34:56 [root] - This is a long message that wraps neatly
│ across multiple lines without breaking words in half. [user_id=42 action=login]
└──────────────────────────────────────────────────────────────────────────────────
```

To pass extra fields:

```ts
logger.info("User logged in", { userId: 42, action: "login" });
```

## API Reference

### `setupLogging(options?)`

Configure logging with colors and optional box formatting in one call. Returns a `Logger` instance.

```ts
const logger = setupLogging({
  colored: true,
  style: "long-boxed",
  level: "DEBUG",
  width: 100,
  datefmt: "%Y-%m-%d %H:%M:%S",
  logColors: { INFO: "bold_green" },
  file: "app.log",
  fileLevel: "WARNING",
  name: "myapp",
});
```

### `getLogger(name?)`

Retrieve a previously configured logger by name. If no logger exists for that name, one is created inheriting the root logger's handlers.

```ts
setupLogging(); // configure root logger
const logger = getLogger("myapp"); // inherits root config
logger.info("works");
```

### Logger Methods

```ts
logger.debug(message, extra?)
logger.info(message, extra?)
logger.warning(message, extra?)
logger.warn(message, extra?)      // alias for warning
logger.error(message, extra?)
logger.critical(message, extra?)
logger.log(level, message, extra?) // explicit level
```

The `extra` parameter is an optional `Record<string, unknown>` that appears in the log output when using the `"long-boxed"` style as `[key=value ...]`.

## Options

### `colored` (boolean, default: `true`)

Enable or disable colored console output. Set to `false` for CI, piped output, or plain terminals.

```ts
setupLogging({ colored: false });
```

### `style` (string or null, default: `null`)

Box style. One of `"short-fixed"`, `"short-dynamic"`, `"long-boxed"`, or `null` for no box.

You can combine `colored` and `style` independently:

```ts
setupLogging({ colored: true, style: "long-boxed" });  // colored + boxed
setupLogging({ colored: false, style: "short-fixed" }); // plain + boxed
setupLogging({ colored: true, style: null });            // colored, no box
setupLogging({ colored: false, style: null });           // plain, no box
```

### `level` (string, default: `"DEBUG"`)

Minimum log level for console output. One of `"DEBUG"`, `"INFO"`, `"WARNING"`, `"ERROR"`, `"CRITICAL"`.

```ts
setupLogging({ level: "INFO" }); // hides DEBUG messages on console
```

### `width` (number, default: `100`)

Box width in characters. Only applies to `"short-fixed"` and `"long-boxed"` styles.

```ts
setupLogging({ style: "long-boxed", width: 120 });
```

### `datefmt` (string, default: `"%Y-%m-%d %H:%M:%S"`)

Date/time format using Python-compatible `strftime` tokens.

Supported tokens: `%Y`, `%m`, `%d`, `%H`, `%M`, `%S`, `%I`, `%p`, `%f`, `%j`, `%a`, `%A`, `%b`, `%B`, `%%`.

```ts
setupLogging({ datefmt: "%H:%M:%S" });       // short: 12:30:45
setupLogging({ datefmt: "%d/%m/%Y %H:%M" }); // European: 08/09/2025 12:30
```

### `logColors` (object, default: built-in scheme)

Override colors for specific log levels. Uses color strings compatible with Python's `colorlog`:

| Color | Example |
|-------|---------|
| Basic | `"red"`, `"green"`, `"cyan"`, `"yellow"`, `"blue"`, `"white"`, `"black"` |
| Bold | `"bold_red"`, `"bold_green"` |
| Dim | `"thin_white"`, `"dim_white"` |
| Background | `"bg_red"`, `"bg_white"` |
| Combined | `"bold_red,bg_white"` |

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

Default color scheme:

| Level | Color |
|-------|-------|
| DEBUG | `cyan` |
| INFO | `green` |
| WARNING | `yellow` |
| ERROR | `red` |
| CRITICAL | `bold_red` |

### `file` (string or null, default: `null`)

Path to a log file. ANSI color codes are automatically stripped so the file stays clean and readable.

```ts
setupLogging({ file: "logs/app.log" });
```

### `fileLevel` (string or null, default: same as `level`)

Separate minimum level for the file handler. Useful when you want verbose console output but only important messages in the file.

```ts
setupLogging({ level: "DEBUG", file: "app.log", fileLevel: "WARNING" });
// Console shows everything, file only gets WARNING and above.
```

### `name` (string, default: `""`)

Logger name. Empty string configures the root logger (affects all loggers retrieved via `getLogger`). Pass a name for a specific logger.

```ts
const logger = setupLogging({ name: "myapp" });
logger.info("from myapp"); // shows [myapp] in output
```

## Full Example

```ts
import { setupLogging } from "crisplogs";

// Colored + boxed console, warnings+ to file
const logger = setupLogging({
  colored: true,
  style: "long-boxed",
  level: "DEBUG",
  width: 110,
  datefmt: "%H:%M:%S",
  file: "app.log",
  fileLevel: "WARNING",
});

logger.debug("Loading configuration...");
logger.info("Server started on port 8000");
logger.warning("Cache miss rate is high", { rate: "45%" });
logger.error("Payment processing failed", { orderId: 9912 });
```

## CommonJS Usage

```js
const { setupLogging } = require("crisplogs");

const logger = setupLogging();
logger.info("Hello from CommonJS!");
```

## Exported Types

All types are available for TypeScript users:

```ts
import type {
  Style,           // "short-fixed" | "short-dynamic" | "long-boxed"
  Level,           // "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL"
  SetupLoggingOptions,
  LogRecord,
  Formatter,
  Handler,
} from "crisplogs";
```

## Exports

| Export | Description |
|--------|-------------|
| `setupLogging` | Main entry point - configure logging in one call |
| `getLogger` | Retrieve a logger by name |
| `Logger` | Logger class |
| `ColoredLogFormatter` | Colored text formatter (no box) |
| `ShortFixedBoxFormatter` | Fixed-width left-border box formatter |
| `ShortDynamicBoxFormatter` | Dynamic-width full-border box formatter |
| `LongBoxedFormatter` | Word-wrapped left-border box formatter |
| `ConsoleHandler` | Stdout handler |
| `CleanFileHandler` | File handler with ANSI stripping |
| `stripAnsi` | Remove ANSI escape sequences from a string |
| `DEFAULT_LOG_COLORS` | Default color scheme |
| `LEVEL_VALUES` | Numeric values for each log level |
| `VERSION` | Package version string |

## License

MIT
