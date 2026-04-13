import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setupLogging,
  getLogger,
  stripAnsi,
  Logger,
  LEVEL_VALUES,
} from "../src";
import { strftime, wordWrap } from "../src/utils";
import { parseColorString, RESET } from "../src/colors";
import { LogFormatter } from "../src/formatters";
import type { LogRecord } from "../src";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<LogRecord> = {}): LogRecord {
  return {
    levelName: "INFO",
    levelNo: 20,
    message: "Test message",
    timestamp: new Date(2025, 8, 8, 12, 30, 45),
    name: "test",
    pathname: "/app/main.ts",
    lineno: 25,
    ...overrides,
  };
}

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

// ---------------------------------------------------------------------------
// parseColorString
// ---------------------------------------------------------------------------

describe("parseColorString", () => {
  it("parses basic colors", () => {
    expect(parseColorString("red")).toBe("\x1b[31m");
    expect(parseColorString("green")).toBe("\x1b[32m");
    expect(parseColorString("cyan")).toBe("\x1b[36m");
    expect(parseColorString("blue")).toBe("\x1b[34m");
  });

  it("parses bold modifier", () => {
    expect(parseColorString("bold_red")).toBe("\x1b[1;31m");
    expect(parseColorString("bold_green")).toBe("\x1b[1;32m");
  });

  it("parses dim/thin modifier", () => {
    expect(parseColorString("thin_white")).toBe("\x1b[2;37m");
    expect(parseColorString("dim_white")).toBe("\x1b[2;37m");
  });

  it("parses background colors", () => {
    expect(parseColorString("bg_red")).toBe("\x1b[41m");
    expect(parseColorString("bg_white")).toBe("\x1b[47m");
  });

  it("parses combined colors", () => {
    expect(parseColorString("bold_red,bg_white")).toBe("\x1b[1;31;47m");
  });

  it("handles reset", () => {
    expect(parseColorString("reset")).toBe(RESET);
  });

  it("returns empty for unknown", () => {
    expect(parseColorString("nonexistent")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("LogFormatter", () => {
  const base = { datefmt: "%Y-%m-%d %H:%M:%S", logColors: { INFO: "green" }, colored: false };
  const baseTime = { datefmt: "%H:%M:%S", logColors: { INFO: "green" }, colored: false };

  it("produces colored output", () => {
    const fmt = new LogFormatter({ ...base, colored: true });
    const output = fmt.format(makeRecord());
    expect(output).toContain("INFO");
    expect(output).toContain("Test message");
    expect(output).toContain("\x1b[");
    expect(output).toContain("2025-09-08 12:30:45");
    expect(output).toContain("[test]");
    expect(output).toContain("/app/main.ts:25");
  });

  it("produces plain output when colored=false", () => {
    const fmt = new LogFormatter(base);
    const output = fmt.format(makeRecord());
    expect(output).not.toContain("\x1b[");
    expect(output).toContain("INFO");
    expect(output).toContain("Test message");
  });

  it("no-box: appends extra fields inline", () => {
    const fmt = new LogFormatter(base);
    const output = fmt.format(makeRecord({ extra: { userId: 42 } }));
    expect(output).toContain("[userId=42]");
  });

  it("no-box: appends extra fields as compact JSON", () => {
    const fmt = new LogFormatter({ ...base, extraFormat: "json" });
    const output = fmt.format(makeRecord({ extra: { userId: 42 } }));
    expect(output).toContain('{"userId":42}');
  });

  it("no-box: appends extra fields as pretty JSON", () => {
    const fmt = new LogFormatter({ ...base, extraFormat: "pretty" });
    const output = fmt.format(makeRecord({ extra: { userId: 42 } }));
    expect(output).toContain('"userId": 42');
  });

  it("short-fixed: left-border box at fixed width", () => {
    const fmt = new LogFormatter({ ...baseTime, box: true, width: 80 });
    const output = fmt.format(makeRecord());
    const lines = output.split("\n");
    expect(lines[0]).toMatch(/^┌─+$/);
    expect(lines[1]).toMatch(/^│ /);
    expect(lines[lines.length - 1]).toMatch(/^└─+$/);
  });

  it("short-dynamic: full-border box with auto width", () => {
    const fmt = new LogFormatter({ ...baseTime, box: true, fullBorder: true, width: "auto" });
    const output = fmt.format(makeRecord());
    const lines = output.split("\n");
    expect(lines[0]).toMatch(/^┌─+┐$/);
    expect(lines[1]).toMatch(/^│ .+ │$/);
    expect(lines[lines.length - 1]).toMatch(/^└─+┘$/);
  });

  it("long-boxed: left-border box with word-wrap", () => {
    const fmt = new LogFormatter({ ...baseTime, box: true, wordWrap: true, width: 80 });
    const output = fmt.format(makeRecord());
    const lines = output.split("\n");
    expect(lines[0]).toMatch(/^┌─+$/);
    expect(lines[1]).toMatch(/^│ /);
    expect(lines[lines.length - 1]).toMatch(/^└─+$/);
  });

  it("long-boxed: appends extra fields", () => {
    const fmt = new LogFormatter({ ...baseTime, box: true, wordWrap: true, width: 200 });
    const record = makeRecord({ extra: { userId: 42, action: "login" } });
    const output = fmt.format(record);
    expect(output).toContain("userId=42");
    expect(output).toContain("action=login");
  });

  it("long-boxed: word-wraps long messages", () => {
    const fmt = new LogFormatter({ ...baseTime, box: true, wordWrap: true, width: 40 });
    const record = makeRecord({
      message: "This is a very long message that should definitely be wrapped across multiple lines",
    });
    const output = fmt.format(record);
    const contentLines = output.split("\n").filter((l) => l.startsWith("│"));
    expect(contentLines.length).toBeGreaterThan(1);
  });

  it("short-fixed: ignores extra fields", () => {
    const fmt = new LogFormatter({ ...baseTime, box: true, width: 80 });
    const output = fmt.format(makeRecord({ extra: { userId: 42 } }));
    expect(output).not.toContain("userId=42");
  });
});

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

describe("Logger", () => {
  let writeSpy: any;

  beforeEach(() => {
    writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("setupLogging returns a Logger instance", () => {
    const logger = setupLogging({ name: "t1" });
    expect(logger).toBeInstanceOf(Logger);
  });

  it("logs colored output by default", () => {
    const logger = setupLogging({ name: "t2" });
    logger.info("Hello");
    expect(writeSpy).toHaveBeenCalled();
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("Hello");
    expect(output).toContain("\x1b[");
  });

  it("filters messages below level", () => {
    const logger = setupLogging({ level: "WARNING", name: "t3" });
    logger.debug("nope");
    logger.info("nope");
    expect(writeSpy).not.toHaveBeenCalled();
    logger.warning("yes");
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it("produces plain output when colored=false", () => {
    const logger = setupLogging({ colored: false, name: "t4" });
    logger.info("Plain message");
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).not.toContain("\x1b[");
    expect(output).toContain("Plain message");
  });

  it("creates short-fixed box output", () => {
    const logger = setupLogging({ style: "short-fixed", name: "t5" });
    logger.info("Box message");
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("┌");
    expect(output).toContain("│");
    expect(output).toContain("└");
  });

  it("creates short-dynamic box output", () => {
    const logger = setupLogging({ style: "short-dynamic", name: "t6" });
    logger.info("Dynamic box");
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("┌");
    expect(output).toContain("┐");
    expect(output).toContain("└");
    expect(output).toContain("┘");
  });

  it("creates long-boxed output with extra fields", () => {
    const logger = setupLogging({ style: "long-boxed", name: "t7" });
    logger.info("User action", { userId: 42 });
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("┌");
    expect(output).toContain("│");
    expect(output).toContain("└");
    expect(output).toContain("userId=42");
  });

  it("warn is an alias for warning", () => {
    const logger = setupLogging({ name: "t8" });
    logger.warn("heads up");
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("WARNING");
    expect(output).toContain("heads up");
  });

  it("log() accepts explicit level", () => {
    const logger = setupLogging({ name: "t9" });
    logger.log("ERROR", "explicit");
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("ERROR");
    expect(output).toContain("explicit");
  });

  it("supports all five levels", () => {
    const logger = setupLogging({ name: "t10" });
    logger.debug("d");
    logger.info("i");
    logger.warning("w");
    logger.error("e");
    logger.critical("c");
    expect(writeSpy).toHaveBeenCalledTimes(5);
  });

  it("uses custom log colors", () => {
    const logger = setupLogging({
      name: "t11",
      logColors: { INFO: "bold_green" },
    });
    logger.info("colorful");
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("\x1b[1;32m"); // bold green
  });

  it("creates box without colors", () => {
    const logger = setupLogging({
      colored: false,
      style: "short-dynamic",
      name: "t12",
    });
    logger.info("plain box");
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("┌");
    expect(output).toContain("┐");
    expect(output).not.toContain("\x1b[");
  });
});

// ---------------------------------------------------------------------------
// getLogger
// ---------------------------------------------------------------------------

describe("getLogger", () => {
  let writeSpy: any;

  beforeEach(() => {
    writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("returns the same logger for the same name after setup", () => {
    const original = setupLogging({ name: "shared" });
    const retrieved = getLogger("shared");
    expect(retrieved).toBe(original);
  });

  it("inherits root handlers when root is configured", () => {
    setupLogging({ name: "" });
    const child = getLogger("child");
    child.info("from child");
    expect(writeSpy).toHaveBeenCalled();
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("from child");
    expect(output).toContain("[child]");
  });
});

// ---------------------------------------------------------------------------
// File handler
// ---------------------------------------------------------------------------

describe("CleanFileHandler", () => {
  it("writes to file without ANSI codes", () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const logFile = path.join(
      os.tmpdir(),
      `crisplogs-test-${Date.now()}.log`,
    );

    const logger = setupLogging({
      file: logFile,
      level: "INFO",
      name: "file-test",
    });

    logger.info("File test message");

    const content = fs.readFileSync(logFile, "utf-8");
    expect(content).toContain("File test message");
    expect(content).not.toContain("\x1b[");

    writeSpy.mockRestore();

    // Cleanup
    fs.unlinkSync(logFile);
  });

  it("respects fileLevel independently from console level", () => {
    const logFile = path.join(
      os.tmpdir(),
      `crisplogs-test-flevel-${Date.now()}.log`,
    );

    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const logger = setupLogging({
      level: "DEBUG",
      file: logFile,
      fileLevel: "ERROR",
      name: "file-level-test",
    });

    logger.info("console only");
    logger.error("both");

    const content = fs.readFileSync(logFile, "utf-8");
    expect(content).not.toContain("console only");
    expect(content).toContain("both");

    writeSpy.mockRestore();
    fs.unlinkSync(logFile);
  });
});

// ---------------------------------------------------------------------------
// LEVEL_VALUES
// ---------------------------------------------------------------------------

describe("LEVEL_VALUES", () => {
  it("matches Python logging numeric values", () => {
    expect(LEVEL_VALUES.DEBUG).toBe(10);
    expect(LEVEL_VALUES.INFO).toBe(20);
    expect(LEVEL_VALUES.WARNING).toBe(30);
    expect(LEVEL_VALUES.ERROR).toBe(40);
    expect(LEVEL_VALUES.CRITICAL).toBe(50);
  });
});
