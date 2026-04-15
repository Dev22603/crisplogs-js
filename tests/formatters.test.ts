import { describe, it, expect } from "vitest";
import { LogFormatter } from "../src/formatters";
import { makeRecord } from "./helpers";

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

  // --- Edge-case: circular references ---

  it("handles circular reference in extra (json format)", () => {
    const fmt = new LogFormatter({ ...base, extraFormat: "json" });
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    const output = fmt.format(makeRecord({ extra: circular }));
    expect(output).toContain("[Circular]");
  });

  it("handles circular reference in extra (pretty format)", () => {
    const fmt = new LogFormatter({ ...base, extraFormat: "pretty" });
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    const output = fmt.format(makeRecord({ extra: circular }));
    expect(output).toContain("[Circular]");
  });

  it("handles circular reference in extra (inline format)", () => {
    const fmt = new LogFormatter(base);
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    const output = fmt.format(makeRecord({ extra: circular }));
    expect(output).toContain("[Circular]");
  });

  it("serializes nested objects in inline extra", () => {
    const fmt = new LogFormatter(base);
    const output = fmt.format(makeRecord({ extra: { config: { port: 3000 } } }));
    expect(output).toContain('config={"port":3000}');
    expect(output).not.toContain("[object Object]");
  });
});
