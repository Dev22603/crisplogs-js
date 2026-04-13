/**
 * Formatter classes for crisplogs.
 *
 * Provides colored and boxed log formatters that mirror the Python
 * `colorlog.ColoredFormatter` subclasses from the original package.
 */

import { parseColorString, RESET } from "./colors";
import { strftime, wordWrap, stripAnsi } from "./utils";
import type { Formatter, LogRecord } from "./types";

/** Options shared by all formatters. */
export interface FormatterOptions {
  datefmt: string;
  logColors: Record<string, string>;
  colored: boolean;
}

/**
 * Pad text to a visual width, accounting for ANSI escape codes.
 * The visible length (excluding ANSI codes) will be padded to the target width.
 */
function padVisual(text: string, width: number): string {
  const visibleLength = stripAnsi(text).length;
  const padding = Math.max(0, width - visibleLength);
  return text + " ".repeat(padding);
}

/**
 * Build the base formatted line for a log record.
 *
 * Colored output:
 *   `{levelColor}LEVEL   {reset} timestamp {blue}[name]{reset} {cyan}path:line{reset} - {msgColor}message{reset}`
 *
 * Plain output:
 *   `LEVEL    timestamp [name] path:line - message`
 */
function formatBase(record: LogRecord, opts: FormatterOptions): string {
  const { datefmt, logColors, colored } = opts;
  const timestamp = strftime(datefmt, record.timestamp);
  const levelName = record.levelName.padEnd(8);
  const name = record.name || "root";

  if (colored) {
    const levelColor = parseColorString(logColors[record.levelName] || "white");
    const blue = parseColorString("blue");
    const cyan = parseColorString("cyan");
    const msgColor = parseColorString(logColors[record.levelName] || "white");

    return (
      `${levelColor}${levelName}${RESET} ` +
      `${timestamp} ` +
      `${blue}[${name}]${RESET} ` +
      `${cyan}${record.pathname}:${record.lineno}${RESET} - ` +
      `${msgColor}${record.message}${RESET}`
    );
  }

  return (
    `${levelName} ${timestamp} ` +
    `[${name}] ` +
    `${record.pathname}:${record.lineno} - ` +
    `${record.message}`
  );
}

/**
 * Colored log output with no box decoration.
 *
 * Each log level gets its own color for easy scanning.
 *
 * @example
 * ```
 * INFO     2025-09-08 12:30:45 [main] /app/main.js:25 - Server started
 * ERROR    2025-09-08 12:31:12 [db]   /app/db.js:45  - Connection failed
 * ```
 */
export class ColoredLogFormatter implements Formatter {
  private opts: FormatterOptions;

  constructor(opts: FormatterOptions) {
    this.opts = opts;
  }

  format(record: LogRecord): string {
    return formatBase(record, this.opts);
  }
}

/**
 * Fixed-width box with left border only.
 *
 * Best suited for short, single-line log messages where you want
 * visual separation between entries.
 *
 * @example
 * ```
 * ┌──────────────────────────────────────────────────
 * │ INFO     2025-09-08 12:30:45 [main] - Server started
 * └──────────────────────────────────────────────────
 * ```
 */
export class ShortFixedBoxFormatter implements Formatter {
  private opts: FormatterOptions;
  private boxWidth: number;

  constructor(opts: FormatterOptions, width: number) {
    this.opts = opts;
    this.boxWidth = width;
  }

  format(record: LogRecord): string {
    const message = formatBase(record, this.opts);
    const lines = message.split("\n");

    const w = this.boxWidth;
    const top = "\u250c" + "\u2500".repeat(w + 2);
    const bottom = "\u2514" + "\u2500".repeat(w + 2);
    const boxed = [
      top,
      ...lines.map((l) => `\u2502 ${padVisual(l, w)} `),
      bottom,
    ];

    return boxed.join("\n");
  }
}

/**
 * Dynamic-width full box (left + right borders).
 *
 * The box width adjusts automatically based on the longest line.
 *
 * @example
 * ```
 * ┌──────────────────────────────────────────────────┐
 * │ INFO     2025-09-08 12:30:45 - Server started     │
 * └──────────────────────────────────────────────────┘
 * ```
 */
export class ShortDynamicBoxFormatter implements Formatter {
  private opts: FormatterOptions;

  constructor(opts: FormatterOptions) {
    this.opts = opts;
  }

  format(record: LogRecord): string {
    const message = formatBase(record, this.opts);
    const lines = message.split("\n");

    const w = lines.reduce((max, l) => Math.max(max, stripAnsi(l).length), 0);
    const top = "\u250c" + "\u2500".repeat(w + 2) + "\u2510";
    const bottom = "\u2514" + "\u2500".repeat(w + 2) + "\u2518";
    const boxed = [
      top,
      ...lines.map((l) => `\u2502 ${padVisual(l, w)} \u2502`),
      bottom,
    ];

    return boxed.join("\n");
  }
}

/**
 * Word-wrapped box with left border, handles extra fields.
 *
 * Long lines are wrapped at word boundaries so words are never split.
 * Any `extra` fields are automatically appended as `[key=value ...]`.
 *
 * @example
 * ```
 * ┌──────────────────────────────────────────────────
 * │ INFO     2025-09-08 12:34:56 [main] - This is a long message that wraps
 * │ neatly across multiple lines. [user_id=42 action=login]
 * └──────────────────────────────────────────────────
 * ```
 */
export class LongBoxedFormatter implements Formatter {
  private opts: FormatterOptions;
  private boxWidth: number;

  constructor(opts: FormatterOptions, width: number) {
    this.opts = opts;
    this.boxWidth = width;
  }

  format(record: LogRecord): string {
    let message = formatBase(record, this.opts);

    // Append extra fields
    if (record.extra && Object.keys(record.extra).length > 0) {
      const extrasStr = Object.entries(record.extra)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ");
      message += ` [${extrasStr}]`;
    }

    // Word-wrap long lines
    const lines = message.split("\n");
    const w = this.boxWidth;
    const wrapped: string[] = [];
    for (const line of lines) {
      wrapped.push(...wordWrap(line, w));
    }

    const top = "\u250c" + "\u2500".repeat(w + 2);
    const bottom = "\u2514" + "\u2500".repeat(w + 2);
    const boxed = [top, ...wrapped.map((l) => `\u2502 ${l}`), bottom];

    return boxed.join("\n");
  }
}
