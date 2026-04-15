/**
 * Formatter for crisplogs.
 *
 * A single LogFormatter class covers all output styles via options.
 */

import { parseColorString, RESET } from "./colors";
import type { ExtraFormat, Formatter, LogRecord } from "./types";
import { strftime, stripAnsi, wordWrap } from "./utils";

/** Options accepted by {@link LogFormatter}. */
export interface FormatterOptions {
	datefmt: string;
	logColors: Record<string, string>; // string keys to allow custom level extensions
	colored: boolean;
	/** How extra fields are rendered. Only applies when `box` is false or `wordWrap` is true. */
	extraFormat?: ExtraFormat;
	/** Draw a box around each log entry. Default: `false`. */
	box?: boolean;
	/**
	 * Full border (`┌─┐ │ └─┘`) instead of left-border only (`┌─ │ └─`).
	 * Only applies when `box` is `true`. Default: `false`.
	 */
	fullBorder?: boolean;
	/**
	 * Box width in characters, or `"auto"` to size to the longest line.
	 * Only applies when `box` is `true`. Default: `100`.
	 */
	width?: number | "auto";
	/**
	 * Word-wrap long lines within the box.
	 * Only applies when `box` is `true`. Default: `false`.
	 */
	wordWrap?: boolean;
}

/**
 * Pad text to a visual width, ignoring ANSI escape codes.
 */
function padVisual(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - stripAnsi(text).length));
}

/**
 * Safely stringify an object, handling circular references.
 */
function safeStringify(obj: unknown, indent?: number): string {
	try {
		return JSON.stringify(obj, null, indent);
	} catch {
		return "[Circular]";
	}
}

/**
 * Serialize extra fields according to the chosen format.
 * Returns an empty string when there are no extra fields.
 */
function serializeExtra(
	extra: Record<string, unknown> | undefined,
	format: ExtraFormat = "inline",
): string {
	if (!extra || Object.keys(extra).length === 0) return "";

	if (format === "json") {
		return ` ${safeStringify(extra)}`;
	}

	if (format === "pretty") {
		return `\n${safeStringify(extra, 2)}`;
	}

	// inline: [key=value key2=value2]
	return (
		" [" +
		Object.entries(extra)
			.map(([k, v]) => {
				if (v === null || v === undefined) return `${k}=${v}`;
				if (typeof v === "object") return `${k}=${safeStringify(v)}`;
				return `${k}=${v}`;
			})
			.join(" ") +
		"]"
	);
}

/**
 * Build the base formatted line for a log record (no box, no extras).
 *
 * Colored:   `{levelColor}LEVEL   {reset} timestamp {blue}[name]{reset} {cyan}path:line{reset} - {msgColor}message{reset}`
 * Plain:     `LEVEL    timestamp [name] path:line - message`
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
 * Single configurable log formatter.
 *
 * Covers all output styles through constructor options:
 *
 * | Equivalent old class        | Options                                          |
 * |-----------------------------|--------------------------------------------------|
 * | `ColoredLogFormatter`       | `{ box: false }`                                 |
 * | `ShortFixedBoxFormatter`    | `{ box: true, width: N }`                        |
 * | `ShortDynamicBoxFormatter`  | `{ box: true, fullBorder: true, width: "auto" }` |
 * | `LongBoxedFormatter`        | `{ box: true, wordWrap: true, width: N }`        |
 *
 * @example
 * ```ts
 * // Colored, no box (default style)
 * new LogFormatter({ datefmt, logColors, colored: true });
 *
 * // Full border, auto width
 * new LogFormatter({ datefmt, logColors, colored: true, box: true, fullBorder: true, width: "auto" });
 *
 * // Word-wrapped box with JSON extras
 * new LogFormatter({ datefmt, logColors, colored: true, box: true, wordWrap: true, width: 100, extraFormat: "json" });
 * ```
 */
export class LogFormatter implements Formatter {
	private opts: FormatterOptions;

	constructor(opts: FormatterOptions) {
		this.opts = opts;
	}

	format(record: LogRecord): string {
		const {
			box = false,
			fullBorder = false,
			width = 100,
			wordWrap: doWordWrap = false,
			extraFormat,
		} = this.opts;

		// Extras are supported for plain output and word-wrapped boxes only.
		let message = formatBase(record, this.opts);
		if (!box || doWordWrap) {
			message += serializeExtra(record.extra, extraFormat);
		}

		if (!box) {
			return message;
		}

		const lines = message.split("\n");

		// Determine effective box width.
		const w: number =
			width === "auto"
				? lines.reduce((max, l) => Math.max(max, stripAnsi(l).length), 0)
				: (width as number);

		// Word-wrap if requested.
		const contentLines = doWordWrap
			? lines.flatMap((line) => wordWrap(line, w))
			: lines;

		if (fullBorder) {
			const top = `\u250c${"\u2500".repeat(w + 2)}\u2510`;
			const bottom = `\u2514${"\u2500".repeat(w + 2)}\u2518`;
			return [
				top,
				...contentLines.map((l) => `\u2502 ${padVisual(l, w)} \u2502`),
				bottom,
			].join("\n");
		}

		// Left-border only.
		const top = `\u250c${"\u2500".repeat(w + 2)}`;
		const bottom = `\u2514${"\u2500".repeat(w + 2)}`;
		const rows = doWordWrap
			? contentLines.map((l) => `\u2502 ${l}`)
			: contentLines.map((l) => `\u2502 ${padVisual(l, w)} `);

		return [top, ...rows, bottom].join("\n");
	}
}
