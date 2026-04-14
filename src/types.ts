/** Box decoration style for console output. */
export type Style = "short-fixed" | "short-dynamic" | "long-boxed";

/**
 * How extra fields are serialized in the log output.
 * - `"inline"` (default): `[key=value key2=value2]`
 * - `"json"`: compact single-line JSON — `{"key":"value","key2":"value2"}`
 * - `"pretty"`: formatted multi-line JSON (best paired with `"long-boxed"` style)
 */
export type ExtraFormat = "inline" | "json" | "pretty";

/** Supported log levels, matching Python's logging module hierarchy. */
export type Level = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

/** Numeric values for each log level (matches Python logging). */
export const LEVEL_VALUES: Record<Level, number> = {
  DEBUG: 10,
  INFO: 20,
  WARNING: 30,
  ERROR: 40,
  CRITICAL: 50,
};

/** A single log record containing all metadata for one log event. */
export interface LogRecord {
  levelName: Level;
  levelNo: number;
  message: string;
  timestamp: Date;
  name: string;
  pathname: string;
  lineno: number;
  extra?: Record<string, unknown>;
}

/** Options accepted by {@link setupLogging}. */
export interface SetupLoggingOptions {
  /** Enable colored output on the console. Default: `true`. */
  colored?: boolean;
  /** Box style for console output. Default: `null` (no box). */
  style?: Style | null;
  /** Minimum log level for the console handler. Default: `"DEBUG"`. */
  level?: Level;
  /** Box width in characters (for `"short-fixed"` and `"long-boxed"`). Default: `100`. */
  width?: number;
  /** Date/time format string using `strftime` tokens. Default: `"%Y-%m-%d %H:%M:%S"`. */
  datefmt?: string;
  /** Override the default color for each log level. */
  logColors?: Partial<Record<Level, string>>;
  /** Path to a log file. ANSI codes are stripped automatically. Default: `null`. */
  file?: string | null;
  /** Minimum log level for the file handler. Defaults to the console `level`. */
  fileLevel?: Level | null;
  /** Logger name. `""` for root logger. Default: `""`. */
  name?: string;
  /**
   * Capture file path and line number of the caller on each log call.
   * Disable for higher throughput in production. Default: `true`.
   */
  captureCallerInfo?: boolean;
  /**
   * How `extra` fields are rendered in the log output.
   * Only applies to no-style (plain/colored) and `"long-boxed"` outputs.
   * Default: `"inline"`.
   */
  extraFormat?: ExtraFormat;
}

/** Interface that all formatters implement. */
export interface Formatter {
  format(record: LogRecord): string;
}

/** Interface that all handlers implement. */
export interface Handler {
  readonly level: number;
  formatter: Formatter;
  emit(record: LogRecord): void;
  /** Release any resources held by this handler (e.g. file streams). */
  close(): void;
}
