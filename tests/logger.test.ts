import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setupLogging,
  getLogger,
  Logger,
  LEVEL_VALUES,
} from "../src";

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
