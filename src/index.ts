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
import {
	InvalidExtraFormatError,
	InvalidFilePathError,
	InvalidLevelError,
	InvalidStyleError,
	InvalidWidthError,
} from "./errors";
import type { FormatterOptions } from "./formatters";
import { LogFormatter } from "./formatters";
import { CleanFileHandler, ConsoleHandler } from "./handlers";
import { Logger } from "./logger";
import type {
	ExtraFormat,
	Formatter,
	SetupLoggingOptions,
	Style,
} from "./types";
import { LEVEL_VALUES } from "./types";
import { deriveModuleName, getCallerInfo } from "./utils";

declare const __VERSION__: string;
export const VERSION: string =
	typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0-dev";

const DEFAULT_DATEFMT = "%Y-%m-%d %H:%M:%S";

const VALID_STYLES = new Set<Style>([
	"short-fixed",
	"short-dynamic",
	"long-boxed",
]);
const VALID_EXTRA_FORMATS = new Set<ExtraFormat>(["inline", "json", "pretty"]);

/** Global logger registry, keyed by name. */
const loggers = new Map<string, Logger>();

/**
 * Configure logging with colors and optional box formatting in one call.
 *
 * This is the main entry point for crisplogs. Call it once at application
 * startup to configure the root (or named) logger.
 *
 * @returns The configured {@link Logger} instance.
 *
 * @throws {InvalidLevelError} if `level` or `fileLevel` is not one of the
 *   supported levels (`"DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL"`).
 * @throws {InvalidStyleError} if `style` is not one of `"short-fixed"`,
 *   `"short-dynamic"`, `"long-boxed"`, or `null`.
 * @throws {InvalidWidthError} if `width` is not a positive finite number.
 * @throws {InvalidExtraFormatError} if `extraFormat` is not one of
 *   `"inline" | "json" | "pretty"`.
 * @throws {InvalidFilePathError} if `file` is provided but is not a non-empty string.
 * @throws {InvalidColorError} if any value in `logColors` contains an
 *   unrecognized color token.
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
		throw new InvalidLevelError(
			`level must be one of ${Object.keys(LEVEL_VALUES).join(", ")}; got ${JSON.stringify(level)}`,
		);
	}
	if (fileLevel !== null && !(fileLevel in LEVEL_VALUES)) {
		throw new InvalidLevelError(
			`fileLevel must be one of ${Object.keys(LEVEL_VALUES).join(", ")} or null; got ${JSON.stringify(fileLevel)}`,
		);
	}
	if (style !== null && !VALID_STYLES.has(style as Style)) {
		throw new InvalidStyleError(
			`style must be one of "short-fixed", "short-dynamic", "long-boxed", or null; got ${JSON.stringify(style)}`,
		);
	}
	if (
		extraFormat !== undefined &&
		!VALID_EXTRA_FORMATS.has(extraFormat as ExtraFormat)
	) {
		throw new InvalidExtraFormatError(
			`extraFormat must be one of "inline", "json", "pretty"; got ${JSON.stringify(extraFormat)}`,
		);
	}
	if (typeof width !== "number" || width <= 0 || !Number.isFinite(width)) {
		throw new InvalidWidthError(
			`width must be a positive finite number; got ${width}`,
		);
	}
	if (file !== null && (typeof file !== "string" || file.length === 0)) {
		throw new InvalidFilePathError(`file must be a non-empty string or null`);
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
		const logger = new Logger(name, root.level, root.captureCallerInfo);
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

/**
 * Return a logger named after the calling module's file, or an explicit override.
 *
 * Call once per file at module scope (e.g. `export const logger = moduleLogger()`).
 * The name is derived from the caller's path via stack inspection — no
 * `import.meta` or manual strings required. Delegates to {@link getLogger}.
 *
 * @param name - Optional fixed name; when omitted, uses the basename of the
 *   caller file without extension (e.g. `users.ts` → `"users"`).
 *
 * @example
 * ```ts
 * import { setupLogging, moduleLogger } from "crisplogs";
 *
 * setupLogging({ level: "INFO" });
 * export const logger = moduleLogger();
 * logger.info("ready"); // [users] .../users.ts:line - ready
 * ```
 */
export function moduleLogger(name?: string): Logger {
	const resolved =
		name ?? deriveModuleName(getCallerInfo(moduleLogger).pathname);
	return getLogger(resolved);
}

export { DEFAULT_LOG_COLORS } from "./colors";
export {
	CrisplogsError,
	InvalidColorError,
	InvalidExtraFormatError,
	InvalidFilePathError,
	InvalidLevelError,
	InvalidStyleError,
	InvalidWidthError,
} from "./errors";
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
