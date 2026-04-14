import { describe, it, expect } from "vitest";
import { stripAnsi } from "../src";
import { strftime, wordWrap } from "../src/utils";

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
    expect(
      stripAnsi("\x1b[1;31mError\x1b[0m: \x1b[33mwarning\x1b[0m"),
    ).toBe("Error: warning");
  });

  it("handles empty string", () => {
    expect(stripAnsi("")).toBe("");
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
