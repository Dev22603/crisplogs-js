/**
 * Logger class for crisplogs.
 *
 * Mirrors Python's `logging.Logger` API with level-specific methods
 * and automatic caller-info capture.
 */

import type { Handler, Level, LogRecord } from "./types";
import { LEVEL_VALUES } from "./types";
import { getCallerInfo } from "./utils";

export class Logger {
	readonly name: string;
	private _level: number;
	private _handlers: Handler[];
	private _captureCallerInfo: boolean;

	constructor(
		name: string,
		level: number = LEVEL_VALUES.DEBUG,
		captureCallerInfo: boolean = true,
	) {
		this.name = name;
		this._level = level;
		this._handlers = [];
		this._captureCallerInfo = captureCallerInfo;
	}

	/**
	 * The numeric threshold for this logger. Records below this level are dropped
	 * before any handler sees them.
	 *
	 * Note: handlers also have their own `level` and apply it independently.
	 * Changing `logger.level` does NOT update already-attached handlers; a record
	 * must clear both the logger's threshold and each handler's threshold.
	 */
	get level(): number {
		return this._level;
	}

	set level(val: number) {
		this._level = val;
	}

	/** Read-only view of currently attached handlers. */
	get handlers(): readonly Handler[] {
		return this._handlers;
	}

	/**
	 * Attach a handler to this logger.
	 *
	 * Idempotent: passing the same handler instance twice is a no-op. To replace
	 * a handler, call {@link removeHandler} first or {@link clearHandlers} to
	 * reset all handlers.
	 */
	addHandler(handler: Handler): void {
		if (!this._handlers.includes(handler)) {
			this._handlers.push(handler);
		}
	}

	/**
	 * Detach a handler from this logger.
	 *
	 * @returns `true` if the handler was found and removed, `false` otherwise.
	 *   Note: this does NOT call `handler.close()`; the caller is responsible
	 *   for releasing handler resources if needed.
	 */
	removeHandler(handler: Handler): boolean {
		const idx = this._handlers.indexOf(handler);
		if (idx !== -1) {
			this._handlers.splice(idx, 1);
			return true;
		}
		return false;
	}

	/**
	 * Detach and close every attached handler. Errors thrown by `handler.close()`
	 * are swallowed so that cleanup never throws.
	 */
	clearHandlers(): void {
		for (const handler of this._handlers) {
			try {
				handler.close();
			} catch {
				// Swallow close errors — cleanup must not throw.
			}
		}
		this._handlers = [];
	}

	/**
	 * Check whether a given level would currently produce output.
	 *
	 * Useful as a guard around expensive serialization that would be wasted
	 * when the message would be filtered out:
	 *
	 * @example
	 * ```ts
	 * if (logger.isEnabledFor("DEBUG")) {
	 *   logger.debug("state", { state: expensiveSerialize(app) });
	 * }
	 * ```
	 */
	isEnabledFor(level: Level): boolean {
		return LEVEL_VALUES[level] >= this._level;
	}

	private _log(
		levelName: Level,
		message: string,
		extra: Record<string, unknown> | undefined,
		callerFn?: (...args: any[]) => any,
	): void {
		const levelNo = LEVEL_VALUES[levelName];
		if (levelNo < this._level) return;

		const { pathname, lineno } = this._captureCallerInfo
			? getCallerInfo(callerFn)
			: { pathname: "<anonymous>", lineno: 0 };

		const record: LogRecord = {
			levelName,
			levelNo,
			message,
			timestamp: new Date(),
			name: this.name,
			pathname,
			lineno,
			extra,
		};

		for (const handler of this._handlers) {
			if (levelNo >= handler.level) {
				try {
					handler.emit(record);
				} catch (err) {
					try {
						process.stderr.write(
							`crisplogs: handler emit failed: ${err instanceof Error ? err.message : err}\n`,
						);
					} catch {
						// Last resort: stderr itself failed, silently swallow.
					}
				}
			}
		}
	}

	/**
	 * Emit a log record at the DEBUG level (numeric 10).
	 *
	 * @param message - The human-readable log message.
	 * @param extra - Optional structured data attached to the record. Rendered
	 *   according to the formatter's `extraFormat` option. Only displayed in
	 *   the default (no-box) and `long-boxed` styles; short box styles drop
	 *   extras to preserve layout alignment.
	 *
	 * @example
	 * ```ts
	 * logger.debug("cache miss", { key: "user:42" });
	 * ```
	 */
	debug(message: string, extra?: Record<string, unknown>): void {
		this._log("DEBUG", message, extra, this.debug);
	}

	/**
	 * Emit a log record at the INFO level (numeric 20).
	 *
	 * @param message - The human-readable log message.
	 * @param extra - Optional structured data attached to the record. Rendered
	 *   according to the formatter's `extraFormat` option. Only displayed in
	 *   the default (no-box) and `long-boxed` styles.
	 *
	 * @example
	 * ```ts
	 * logger.info("user signed up", { userId: 42, plan: "pro" });
	 * ```
	 */
	info(message: string, extra?: Record<string, unknown>): void {
		this._log("INFO", message, extra, this.info);
	}

	/**
	 * Emit a log record at the WARNING level (numeric 30).
	 *
	 * @param message - The human-readable log message.
	 * @param extra - Optional structured data attached to the record. Rendered
	 *   according to the formatter's `extraFormat` option. Only displayed in
	 *   the default (no-box) and `long-boxed` styles.
	 *
	 * @example
	 * ```ts
	 * logger.warning("disk usage high", { mount: "/dev/sda1", pct: 85 });
	 * ```
	 */
	warning(message: string, extra?: Record<string, unknown>): void {
		this._log("WARNING", message, extra, this.warning);
	}

	/**
	 * Alias for {@link warning} to match Node.js / `console.warn` conventions.
	 *
	 * @param message - The human-readable log message.
	 * @param extra - Optional structured data attached to the record.
	 */
	warn(message: string, extra?: Record<string, unknown>): void {
		this._log("WARNING", message, extra, this.warn);
	}

	/**
	 * Emit a log record at the ERROR level (numeric 40).
	 *
	 * @param message - The human-readable log message.
	 * @param extra - Optional structured data attached to the record. Rendered
	 *   according to the formatter's `extraFormat` option. Only displayed in
	 *   the default (no-box) and `long-boxed` styles.
	 *
	 * @example
	 * ```ts
	 * logger.error("payment failed", { orderId: 5524, gateway: "stripe" });
	 * ```
	 */
	error(message: string, extra?: Record<string, unknown>): void {
		this._log("ERROR", message, extra, this.error);
	}

	/**
	 * Emit a log record at the CRITICAL level (numeric 50).
	 *
	 * @param message - The human-readable log message.
	 * @param extra - Optional structured data attached to the record. Rendered
	 *   according to the formatter's `extraFormat` option. Only displayed in
	 *   the default (no-box) and `long-boxed` styles.
	 *
	 * @example
	 * ```ts
	 * logger.critical("system shutdown initiated", { signal: "SIGTERM" });
	 * ```
	 */
	critical(message: string, extra?: Record<string, unknown>): void {
		this._log("CRITICAL", message, extra, this.critical);
	}

	/**
	 * Emit a log record at an explicit level. Equivalent to calling the
	 * matching `debug` / `info` / `warning` / `error` / `critical` method.
	 *
	 * @param level - One of `"DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL"`.
	 * @param message - The human-readable log message.
	 * @param extra - Optional structured data attached to the record.
	 *
	 * @example
	 * ```ts
	 * logger.log("INFO", "Server started");
	 * ```
	 */
	log(level: Level, message: string, extra?: Record<string, unknown>): void {
		this._log(level, message, extra, this.log);
	}
}
