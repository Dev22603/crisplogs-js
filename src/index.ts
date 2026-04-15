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

import { DEFAULT_LOG_COLORS } from "./colors";
import type { FormatterOptions } from "./formatters";
import { LogFormatter } from "./formatters";
import { CleanFileHandler, ConsoleHandler } from "./handlers";
import { Logger } from "./logger";
import type { Formatter, SetupLoggingOptions } from "./types";
import { LEVEL_VALUES } from "./types";

declare const __VERSION__: string;
export const VERSION: string =
	typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0-dev";

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
		captureCallerInfo = true,
	} = options ?? {};

	// Runtime validation for JS consumers (TypeScript catches these at compile time).
	if (!(level in LEVEL_VALUES)) {
		throw new TypeError(
			`Invalid log level: "${level}". Expected one of: ${Object.keys(LEVEL_VALUES).join(", ")}`,
		);
	}
	if (fileLevel !== null && !(fileLevel in LEVEL_VALUES)) {
		throw new TypeError(
			`Invalid fileLevel: "${fileLevel}". Expected one of: ${Object.keys(LEVEL_VALUES).join(", ")}`,
		);
	}
	if (typeof width !== "number" || width <= 0 || !Number.isFinite(width)) {
		throw new TypeError(
			`Invalid width: ${width}. Must be a positive finite number.`,
		);
	}
	if (file !== null && (typeof file !== "string" || file.length === 0)) {
		throw new TypeError(`Invalid file path: must be a non-empty string.`);
	}

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

	const logger = new Logger(name, LEVEL_VALUES.DEBUG, captureCallerInfo);
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
 * Tear down all loggers, closing their handlers and clearing the registry.
 * Useful in tests or when reconfiguring logging at runtime.
 */
export function resetLogging(): void {
	for (const logger of loggers.values()) {
		logger.clearHandlers();
	}
	loggers.clear();
}

/**
 * Remove a single logger from the registry by name.
 * Returns `true` if the logger existed and was removed.
 */
export function removeLogger(name: string): boolean {
	const logger = loggers.get(name);
	if (logger) {
		logger.clearHandlers();
		loggers.delete(name);
		return true;
	}
	return false;
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

export { DEFAULT_LOG_COLORS } from "./colors";
export type { FormatterOptions } from "./formatters";
export { LogFormatter } from "./formatters";
export { CleanFileHandler, ConsoleHandler } from "./handlers";
// Re-exports
export { Logger } from "./logger";
export type {
	ExtraFormat,
	Formatter,
	Handler,
	Level,
	LogRecord,
	SetupLoggingOptions,
	Style,
} from "./types";
export { LEVEL_VALUES } from "./types";
export { stripAnsi } from "./utils";
