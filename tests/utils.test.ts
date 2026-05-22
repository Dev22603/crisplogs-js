import { describe, expect, it } from "vitest";
import { stripAnsi } from "../src";
import {
	deriveModuleName,
	getCallerInfo,
	strftime,
	wordWrap,
} from "../src/utils";

// ---------------------------------------------------------------------------
// stripAnsi
// ---------------------------------------------------------------------------

describe("stripAnsi", () => {
	it("removes ANSI color codes", () => {
		expect(stripAnsi("\x1b[32mHello\x1b[0m")).toBe("Hello");
	});

	it("returns plain text unchanged", () => {
		expect(stripAnsi("Hello World")).toBe("Hello World");
	});

	it("removes multiple codes", () => {
		expect(stripAnsi("\x1b[1;31mError\x1b[0m: \x1b[33mwarning\x1b[0m")).toBe(
			"Error: warning",
		);
	});

	it("handles empty string", () => {
		expect(stripAnsi("")).toBe("");
	});

	it("handles CSI cursor sequences", () => {
		expect(stripAnsi("\x1b[2J")).toBe("");
		expect(stripAnsi("\x1b[H")).toBe("");
		expect(stripAnsi("before\x1b[2Jafter")).toBe("beforeafter");
	});

	it("handles OSC sequences", () => {
		expect(stripAnsi("\x1b]8;;http://example.com\x07text\x1b]8;;\x07")).toBe(
			"text",
		);
	});
});

// ---------------------------------------------------------------------------
// strftime
// ---------------------------------------------------------------------------

describe("strftime", () => {
	const date = new Date(2025, 8, 8, 12, 30, 45); // Sep 8, 2025 12:30:45

	it("formats full date and time", () => {
		expect(strftime("%Y-%m-%d %H:%M:%S", date)).toBe("2025-09-08 12:30:45");
	});

	it("formats time only", () => {
		const d = new Date(2025, 0, 1, 9, 5, 3);
		expect(strftime("%H:%M:%S", d)).toBe("09:05:03");
	});

	it("formats 12-hour time", () => {
		const d = new Date(2025, 0, 1, 14, 30, 0);
		expect(strftime("%I:%M %p", d)).toBe("02:30 PM");
	});

	it("handles midnight in 12-hour format", () => {
		const d = new Date(2025, 0, 1, 0, 0, 0);
		expect(strftime("%I %p", d)).toBe("12 AM");
	});

	it("escapes %%", () => {
		expect(strftime("100%%", date)).toBe("100%");
	});

	it("formats AM/PM correctly", () => {
		const am = new Date(2025, 0, 1, 11, 59, 59);
		const pm = new Date(2025, 0, 1, 12, 0, 0);
		expect(strftime("%p", am)).toBe("AM");
		expect(strftime("%p", pm)).toBe("PM");
	});

	it("formats milliseconds", () => {
		const d = new Date(2025, 0, 1, 0, 0, 0, 456);
		expect(strftime("%f", d)).toBe("456000");
	});

	it("formats day of the year", () => {
		const d1 = new Date(2025, 0, 1); // Jan 1st
		expect(strftime("%j", d1)).toBe("001");
		const d2 = new Date(2025, 11, 31); // Dec 31st (non-leap year)
		expect(strftime("%j", d2)).toBe("365");
		const d3 = new Date(2024, 11, 31); // Dec 31st (leap year)
		expect(strftime("%j", d3)).toBe("366");
	});

	it("formats weekday names", () => {
		const d = new Date(2025, 0, 1); // Wednesday
		expect(strftime("%a", d)).toBe("Wed");
		expect(strftime("%A", d)).toBe("Wednesday");
	});

	it("formats month names", () => {
		const d = new Date(2025, 0, 1); // January
		expect(strftime("%b", d)).toBe("Jan");
		expect(strftime("%B", d)).toBe("January");

		const d2 = new Date(2025, 7, 1); // August
		expect(strftime("%b", d2)).toBe("Aug");
		expect(strftime("%B", d2)).toBe("August");
	});
});

// ---------------------------------------------------------------------------
// wordWrap
// ---------------------------------------------------------------------------

describe("wordWrap", () => {
	it("wraps long text", () => {
		const text =
			"This is a long message that should be wrapped at the specified width limit";
		const result = wordWrap(text, 30);
		expect(result.length).toBeGreaterThan(1);
		for (const line of result) {
			expect(line.length).toBeLessThanOrEqual(30);
		}
	});

	it("does not break short text", () => {
		expect(wordWrap("Short", 100)).toEqual(["Short"]);
	});

	it("preserves empty strings", () => {
		expect(wordWrap("", 100)).toEqual([""]);
	});

	it("keeps long words intact", () => {
		const longWord = "superlongwordthatexceedswidth";
		const result = wordWrap(longWord, 10);
		expect(result).toEqual([longWord]);
	});
});

// ---------------------------------------------------------------------------
// deriveModuleName
// ---------------------------------------------------------------------------

describe("deriveModuleName", () => {
	it("strips extension from basename", () => {
		expect(deriveModuleName("/app/src/users.ts")).toBe("users");
	});

	it("handles windows-style paths", () => {
		expect(deriveModuleName("D:\\proj\\api\\routes.js")).toBe("routes");
	});

	it("returns anonymous for missing path", () => {
		expect(deriveModuleName("<anonymous>")).toBe("<anonymous>");
		expect(deriveModuleName("")).toBe("<anonymous>");
	});

	it("preserves dotted basenames without a second extension", () => {
		expect(deriveModuleName("/x/logger.test.ts")).toBe("logger.test");
	});
});

// ---------------------------------------------------------------------------
// getCallerInfo
// ---------------------------------------------------------------------------

describe("getCallerInfo", () => {
	it("returns anonymous when Error.captureStackTrace is unavailable", () => {
		const original = Error.captureStackTrace;
		try {
			// @ts-expect-error — temporarily removing captureStackTrace to simulate non-V8
			Error.captureStackTrace = undefined;
			const result = getCallerInfo(() => {});
			expect(result).toEqual({ pathname: "<anonymous>", lineno: 0 });
		} finally {
			Error.captureStackTrace = original;
		}
	});

	it("returns anonymous when called without belowFn", () => {
		const result = getCallerInfo();
		expect(result).toEqual({ pathname: "<anonymous>", lineno: 0 });
	});
});
