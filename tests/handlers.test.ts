import { describe, it, expect, vi } from "vitest";
import { setupLogging, Logger } from "../src";
import type { Handler } from "../src";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Wait for stream buffers to flush. WriteStream.end() triggers
 * a "finish" event once all data is written to the underlying fd.
 */
function flushLogger(logger: ReturnType<typeof setupLogging>): Promise<void> {
  return new Promise((resolve) => {
    const fileHandler = logger.handlers.find(
      (h) => h.constructor.name === "CleanFileHandler",
    );
    if (!fileHandler) {
      resolve();
      return;
    }
    // clearHandlers calls close() -> stream.end(); listen for finish
    // We need to reach the stream, but it's private. Instead, close
    // and give the event loop a tick to flush.
    logger.clearHandlers();
    setTimeout(resolve, 50);
  });
}

describe("CleanFileHandler", () => {
  it("writes to file without ANSI codes", async () => {
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
    await flushLogger(logger);

    const content = fs.readFileSync(logFile, "utf-8");
    expect(content).toContain("File test message");
    expect(content).not.toContain("\x1b[");

    writeSpy.mockRestore();
    fs.unlinkSync(logFile);
  });

  it("respects fileLevel independently from console level", async () => {
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
    await flushLogger(logger);

    const content = fs.readFileSync(logFile, "utf-8");
    expect(content).not.toContain("console only");
    expect(content).toContain("both");

    writeSpy.mockRestore();
    fs.unlinkSync(logFile);
  });
});

// ---------------------------------------------------------------------------
// Handler edge-cases
// ---------------------------------------------------------------------------

describe("Handler edge-cases", () => {
  it("file handler write error doesn't crash", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    // Non-existent deep path triggers a stream 'error' event
    const logger = setupLogging({
      file: path.join(os.tmpdir(), "nonexistent-deep", "nested", "file.log"),
      name: "bad-file",
    });
    logger.info("this should not crash");

    // Wait for the async stream error event to fire
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(stderrSpy).toHaveBeenCalled();
    const output = stderrSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("file write failed");

    stderrSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  it("close() is called on clearHandlers()", () => {
    const logger = new Logger("close-test");
    const closeSpy = vi.fn();
    const handler: Handler = {
      level: 0,
      formatter: { format: () => "" },
      emit: () => {},
      close: closeSpy,
    };
    logger.addHandler(handler);
    logger.clearHandlers();
    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("close() error is swallowed by clearHandlers()", () => {
    const logger = new Logger("close-err");
    const handler: Handler = {
      level: 0,
      formatter: { format: () => "" },
      emit: () => {},
      close: () => { throw new Error("close failed"); },
    };
    logger.addHandler(handler);
    expect(() => logger.clearHandlers()).not.toThrow();
    expect(logger.handlers.length).toBe(0);
  });
});
