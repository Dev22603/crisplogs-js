/**
 * ANSI color code mapping and parsing.
 *
 * Supports the same color strings as Python's `colorlog`:
 * basic colors, bold/dim modifiers, background colors, and
 * comma-separated combinations like `"bold_red,bg_white"`.
 */

const FG_COLORS: Record<string, number> = {
	black: 30,
	red: 31,
	green: 32,
	yellow: 33,
	blue: 34,
	purple: 35,
	magenta: 35,
	cyan: 36,
	white: 37,
};

const BG_COLORS: Record<string, number> = {
	black: 40,
	red: 41,
	green: 42,
	yellow: 43,
	blue: 44,
	purple: 45,
	magenta: 45,
	cyan: 46,
	white: 47,
};

const MODIFIERS: Record<string, number> = {
	bold: 1,
	thin: 2,
	dim: 2,
	italic: 3,
	underline: 4,
};

/** ANSI reset sequence. */
export const RESET = "\x1b[0m";

/**
 * Parse a colorlog-compatible color string into an ANSI escape sequence.
 *
 * @example
 * parseColorString("red")              // "\x1b[31m"
 * parseColorString("bold_red")         // "\x1b[1;31m"
 * parseColorString("bold_red,bg_white") // "\x1b[1;31;47m"
 */
export function parseColorString(colorStr: string): string {
	const parts = colorStr.split(",");
	const codes: number[] = [];

	for (const part of parts) {
		const trimmed = part.trim().toLowerCase();

		if (trimmed === "reset") {
			return RESET;
		}

		if (trimmed.startsWith("bg_")) {
			const color = trimmed.slice(3);
			if (color in BG_COLORS) codes.push(BG_COLORS[color]);
		} else if (trimmed.includes("_")) {
			const idx = trimmed.indexOf("_");
			const modifier = trimmed.slice(0, idx);
			const color = trimmed.slice(idx + 1);
			if (modifier in MODIFIERS) codes.push(MODIFIERS[modifier]);
			if (color in FG_COLORS) codes.push(FG_COLORS[color]);
		} else if (trimmed in MODIFIERS) {
			codes.push(MODIFIERS[trimmed]);
		} else if (trimmed in FG_COLORS) {
			codes.push(FG_COLORS[trimmed]);
		}
	}

	return codes.length > 0 ? `\x1b[${codes.join(";")}m` : "";
}

import type { Level } from "./types";

/** Default color scheme applied to each log level. */
export const DEFAULT_LOG_COLORS: Record<Level, string> = {
	DEBUG: "cyan",
	INFO: "green",
	WARNING: "yellow",
	ERROR: "red",
	CRITICAL: "bold_red",
};
