import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Handler } from "../src";
import {
	getLogger,
	LEVEL_VALUES,
	Logger,
	removeLogger,
	resetLogging,
	setupLogging,
} from "../src";

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

describe("Logger", () => {
	let writeSpy: any;

	beforeEach(() => {
		writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
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
		writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
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

// ---------------------------------------------------------------------------
// Logger edge-cases
// ---------------------------------------------------------------------------

describe("Logger edge-cases", () => {
	let writeSpy: any;

	beforeEach(() => {
		writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
	});

	afterEach(() => {
		writeSpy.mockRestore();
	});

	it("handler emit error doesn't crash", () => {
		const stderrSpy = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const logger = new Logger("emit-err");
		const badHandler: Handler = {
			level: 0,
			formatter: { format: () => "ok" },
			emit: () => {
				throw new Error("emit failed");
			},
			close: () => {},
		};
		logger.addHandler(badHandler);
		expect(() => logger.info("test")).not.toThrow();
		expect(stderrSpy).toHaveBeenCalled();
		const output = stderrSpy.mock.calls[0][0] as string;
		expect(output).toContain("emit failed");
		stderrSpy.mockRestore();
	});

	it("formatter error doesn't crash", () => {
		const stderrSpy = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const logger = new Logger("fmt-err");
		const badHandler: Handler = {
			level: 0,
			formatter: {
				format() {
					throw new Error("format failed");
				},
			},
			emit(record) {
				this.formatter.format(record);
			},
			close: () => {},
		};
		logger.addHandler(badHandler);
		expect(() => logger.info("test")).not.toThrow();
		expect(stderrSpy).toHaveBeenCalled();
		stderrSpy.mockRestore();
	});

	it("addHandler prevents duplicates", () => {
		const logger = new Logger("dup");
		const handler: Handler = {
			level: 0,
			formatter: { format: () => "" },
			emit: () => {},
			close: () => {},
		};
		logger.addHandler(handler);
		logger.addHandler(handler);
		expect(logger.handlers.length).toBe(1);
	});

	it("removeHandler returns true for existing handler", () => {
		const logger = new Logger("rm-yes");
		const handler: Handler = {
			level: 0,
			formatter: { format: () => "" },
			emit: () => {},
			close: () => {},
		};
		logger.addHandler(handler);
		expect(logger.removeHandler(handler)).toBe(true);
		expect(logger.handlers.length).toBe(0);
	});

	it("removeHandler returns false for missing handler", () => {
		const logger = new Logger("rm-no");
		const handler: Handler = {
			level: 0,
			formatter: { format: () => "" },
			emit: () => {},
			close: () => {},
		};
		expect(logger.removeHandler(handler)).toBe(false);
	});

	it("isEnabledFor respects level", () => {
		const logger = new Logger("lvl", LEVEL_VALUES.WARNING);
		expect(logger.isEnabledFor("DEBUG")).toBe(false);
		expect(logger.isEnabledFor("INFO")).toBe(false);
		expect(logger.isEnabledFor("WARNING")).toBe(true);
		expect(logger.isEnabledFor("ERROR")).toBe(true);
		expect(logger.isEnabledFor("CRITICAL")).toBe(true);
	});

	it("resetLogging clears all loggers", () => {
		setupLogging({ name: "reset-a" });
		setupLogging({ name: "reset-b" });
		resetLogging();
		const a = getLogger("reset-a");
		const b = getLogger("reset-b");
		expect(a.handlers.length).toBe(0);
		expect(b.handlers.length).toBe(0);
	});

	it("removeLogger removes one logger", () => {
		setupLogging({ name: "keep" });
		setupLogging({ name: "remove" });
		expect(removeLogger("remove")).toBe(true);
		const kept = getLogger("keep");
		expect(kept.handlers.length).toBeGreaterThan(0);
		const removed = getLogger("remove");
		expect(removed.handlers.length).toBe(0);
	});

	it("captureCallerInfo: false skips stack capture", () => {
		const logger = setupLogging({
			name: "no-caller",
			captureCallerInfo: false,
		});
		logger.info("test");
		const output = writeSpy.mock.calls[0][0] as string;
		expect(output).toContain("<anonymous>:0");
	});

	it("captureCallerInfo: true captures real info", () => {
		const logger = setupLogging({
			name: "with-caller",
			captureCallerInfo: true,
		});
		logger.info("test");
		const output = writeSpy.mock.calls[0][0] as string;
		expect(output).not.toContain("<anonymous>");
	});
});

// ---------------------------------------------------------------------------
// setupLogging validation
// ---------------------------------------------------------------------------

describe("setupLogging validation", () => {
	let writeSpy: any;

	beforeEach(() => {
		writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
	});

	afterEach(() => {
		writeSpy.mockRestore();
	});

	it("throws on invalid level", () => {
		expect(() => setupLogging({ level: "WARN" as any })).toThrow(
			/Invalid log level/,
		);
	});

	it("throws on invalid fileLevel", () => {
		expect(() => setupLogging({ fileLevel: "BAD" as any })).toThrow(
			/Invalid fileLevel/,
		);
	});

	it("throws on zero width", () => {
		expect(() => setupLogging({ width: 0 })).toThrow(/Invalid width/);
	});

	it("throws on negative width", () => {
		expect(() => setupLogging({ width: -10 })).toThrow(/Invalid width/);
	});

	it("throws on NaN width", () => {
		expect(() => setupLogging({ width: NaN })).toThrow(/Invalid width/);
	});

	it("throws on empty file string", () => {
		expect(() => setupLogging({ file: "" })).toThrow(/Invalid file path/);
	});

	it("accepts valid options without throwing", () => {
		expect(() =>
			setupLogging({
				level: "INFO",
				width: 80,
				file: null,
				name: "valid-test",
			}),
		).not.toThrow();
	});
});
