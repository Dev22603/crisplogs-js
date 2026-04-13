/**
 * Internal utilities for crisplogs.
 */

/** Regex matching ANSI escape sequences (colors, cursor moves, etc.). */
const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;

/**
 * Remove all ANSI escape sequences from a string.
 *
 * @example
 * stripAnsi("\x1b[32mHello\x1b[0m") // "Hello"
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE, "");
}

/**
 * Format a Date using Python-compatible strftime tokens.
 *
 * Supported tokens: `%Y`, `%m`, `%d`, `%H`, `%M`, `%S`, `%I`, `%p`,
 * `%f`, `%j`, `%a`, `%A`, `%b`, `%B`, `%%`.
 */
export function strftime(format: string, date: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");

  const tokens: Record<string, string> = {
    "%Y": String(date.getFullYear()),
    "%m": pad(date.getMonth() + 1),
    "%d": pad(date.getDate()),
    "%H": pad(date.getHours()),
    "%M": pad(date.getMinutes()),
    "%S": pad(date.getSeconds()),
    "%I": pad(date.getHours() % 12 || 12),
    "%p": date.getHours() < 12 ? "AM" : "PM",
    "%f": pad(date.getMilliseconds() * 1000, 6),
    "%j": pad(getDayOfYear(date), 3),
    "%a": date.toLocaleDateString("en-US", { weekday: "short" }),
    "%A": date.toLocaleDateString("en-US", { weekday: "long" }),
    "%b": date.toLocaleDateString("en-US", { month: "short" }),
    "%B": date.toLocaleDateString("en-US", { month: "long" }),
    "%%": "%",
  };

  return format.replace(/%[YmdHMSIpfjaAbB%]/g, (m) => tokens[m] ?? m);
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Word-wrap text at word boundaries, matching Python's
 * `textwrap.wrap(text, width, break_long_words=False, break_on_hyphens=False)`.
 *
 * ANSI escape sequences are excluded from width calculations so colored text
 * wraps at the correct visible column.
 */
export function wordWrap(text: string, width: number): string[] {
  if (!text) return [""];

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const visCurrentLen = stripAnsi(currentLine).length;
    const visWordLen = stripAnsi(words[i]).length;
    if (visCurrentLen + 1 + visWordLen <= width) {
      currentLine += " " + words[i];
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }

  lines.push(currentLine);
  return lines;
}

/**
 * Capture the file path and line number of the caller.
 *
 * Uses V8's `Error.captureStackTrace` when available to skip internal
 * frames and return the user's call site directly.
 *
 * @param belowFn - The public method to skip past in the stack (e.g. `logger.info`).
 */
export function getCallerInfo(belowFn?: Function): {
  pathname: string;
  lineno: number;
} {
  const obj: { stack?: string } = {};

  if (typeof Error.captureStackTrace === "function" && belowFn) {
    Error.captureStackTrace(obj, belowFn);
  }

  if (!obj.stack) {
    return { pathname: "<anonymous>", lineno: 0 };
  }

  for (const line of obj.stack.split("\n").slice(1)) {
    const match =
      line.match(/\((.+):(\d+):\d+\)/) ||
      line.match(/at (.+):(\d+):\d+/);
    if (match) {
      return { pathname: match[1], lineno: parseInt(match[2], 10) };
    }
  }

  return { pathname: "<anonymous>", lineno: 0 };
}
