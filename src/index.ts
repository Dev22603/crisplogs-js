/**
 * crisplogs - Beautiful, colored, and boxed logging for Node.js.
 *
 * @example
 * ```ts
 * import { setupLogging } from "crisplogs";
 *
 * const logger = setupLogging();
 * logger.info("Hello from crisplogs!");
 * ```
 *
 * @example
 * ```ts
 * const logger = setupLogging({ style: "long-boxed", file: "app.log" });
 * logger.warning("Disk usage high", { usage: "85%" });
 * ```
 */

import { Logger } from "./logger";
import { LogFormatter } from "./formatters";
import type { FormatterOptions } from "./formatters";
import { ConsoleHandler, CleanFileHandler } from "./handlers";
import { DEFAULT_LOG_COLORS } from "./colors";
import type { SetupLoggingOptions, Formatter } from "./types";
import { LEVEL_VALUES } from "./types";

export const VERSION = "0.1.0";

const DEFAULT_DATEFMT = "%Y-%m-%d %H:%M:%S";

/** Global logger registry, keyed by name. */
const loggers = new Map<string, Logger>();

/**
 * Configure logging with colors and optional box formatting in one call.
 *
 * This is the main entry point for crisplogs. Call it once at application
 * startup to configure the root (or named) logger.
 *
 * @returns The configured {@link Logger} instance.
 */
export function setupLogging(options?: SetupLoggingOptions): Logger {
  const {
    colored = true,
    style = null,
    level = "DEBUG",
    width = 100,
    datefmt = DEFAULT_DATEFMT,
    logColors: userColors,
    file = null,
    fileLevel = null,
    name = "",
    extraFormat,
  } = options ?? {};

  const colors = { ...DEFAULT_LOG_COLORS, ...(userColors ?? {}) };

  const fmtOpts: FormatterOptions = {
    datefmt,
    logColors: colors,
    colored,
    extraFormat,
    box: style !== null,
    fullBorder: style === "short-dynamic",
    width: style === "short-dynamic" ? "auto" : width,
    wordWrap: style === "long-boxed",
  };

  const formatter: Formatter = new LogFormatter(fmtOpts);

  // Console handler
  const consoleHandler = new ConsoleHandler(LEVEL_VALUES[level], formatter);

  // Clear previous logger with the same name to avoid duplicate handlers.
  if (loggers.has(name)) {
    loggers.get(name)!.clearHandlers();
  }

  const logger = new Logger(name, LEVEL_VALUES.DEBUG);
  logger.addHandler(consoleHandler);

  // File handler (optional)
  if (file) {
    const resolvedFileLevel = fileLevel ?? level;
    const fileHandler = new CleanFileHandler(
      file,
      LEVEL_VALUES[resolvedFileLevel],
      formatter,
    );
    logger.addHandler(fileHandler);
  }

  loggers.set(name, logger);
  return logger;
}

/**
 * Retrieve a previously configured logger by name, or create one
 * that inherits the root logger's handlers.
 *
 * @example
 * ```ts
 * setupLogging();                       // configure root
 * const logger = getLogger("myapp");    // inherits root handlers
 * logger.info("works");
 * ```
 */
export function getLogger(name: string = ""): Logger {
  if (loggers.has(name)) return loggers.get(name)!;

  // Inherit handlers from root logger if available.
  const root = loggers.get("");
  if (root) {
    const logger = new Logger(name, root.level);
    for (const handler of root.handlers) {
      logger.addHandler(handler);
    }
    loggers.set(name, logger);
    return logger;
  }

  // No root configured - return a bare logger (no output until configured).
  const logger = new Logger(name);
  loggers.set(name, logger);
  return logger;
}

// Re-exports
export { Logger } from "./logger";
export { LogFormatter } from "./formatters";
export type { FormatterOptions } from "./formatters";
export { ConsoleHandler, CleanFileHandler } from "./handlers";
export { stripAnsi } from "./utils";
export { DEFAULT_LOG_COLORS } from "./colors";
export type {
  Style,
  Level,
  ExtraFormat,
  SetupLoggingOptions,
  LogRecord,
  Formatter,
  Handler,
} from "./types";
export { LEVEL_VALUES } from "./types";
