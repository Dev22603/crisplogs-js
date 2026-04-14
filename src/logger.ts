/**
 * Logger class for crisplogs.
 *
 * Mirrors Python's `logging.Logger` API with level-specific methods
 * and automatic caller-info capture.
 */

import { getCallerInfo } from "./utils";
import type { Handler, LogRecord } from "./types";
import type { Level } from "./types";
import { LEVEL_VALUES } from "./types";

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

  get level(): number {
    return this._level;
  }

  set level(val: number) {
    this._level = val;
  }

  get handlers(): readonly Handler[] {
    return this._handlers;
  }

  addHandler(handler: Handler): void {
    if (!this._handlers.includes(handler)) {
      this._handlers.push(handler);
    }
  }

  removeHandler(handler: Handler): boolean {
    const idx = this._handlers.indexOf(handler);
    if (idx !== -1) {
      this._handlers.splice(idx, 1);
      return true;
    }
    return false;
  }

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

  isEnabledFor(level: Level): boolean {
    return LEVEL_VALUES[level] >= this._level;
  }

  private _log(
    levelName: Level,
    message: string,
    extra: Record<string, unknown> | undefined,
    callerFn?: ((...args: any[]) => any),
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

  debug(message: string, extra?: Record<string, unknown>): void {
    this._log("DEBUG", message, extra, this.debug);
  }

  info(message: string, extra?: Record<string, unknown>): void {
    this._log("INFO", message, extra, this.info);
  }

  warning(message: string, extra?: Record<string, unknown>): void {
    this._log("WARNING", message, extra, this.warning);
  }

  /** Alias for {@link warning} to match Node.js conventions. */
  warn(message: string, extra?: Record<string, unknown>): void {
    this._log("WARNING", message, extra, this.warn);
  }

  error(message: string, extra?: Record<string, unknown>): void {
    this._log("ERROR", message, extra, this.error);
  }

  critical(message: string, extra?: Record<string, unknown>): void {
    this._log("CRITICAL", message, extra, this.critical);
  }

  /**
   * Log with an explicit level.
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
