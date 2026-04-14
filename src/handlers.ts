/**
 * Custom log handlers for crisplogs.
 *
 * Provides handlers that produce clean output for both console and file destinations.
 */

import * as fs from "fs";
import { stripAnsi } from "./utils";
import type { Handler, Formatter, LogRecord } from "./types";

/**
 * Console handler that writes formatted log records to stdout.
 */
export class ConsoleHandler implements Handler {
  readonly level: number;
  formatter: Formatter;

  constructor(level: number, formatter: Formatter) {
    this.level = level;
    this.formatter = formatter;
  }

  emit(record: LogRecord): void {
    const output = this.formatter.format(record);
    process.stdout.write(output + "\n");
  }

  close(): void {
    // No-op for console output.
  }
}

/**
 * File handler that strips ANSI color codes before writing.
 *
 * Logs written to files should be plain text for readability in editors,
 * log aggregators, and CI systems. This handler removes all ANSI escape
 * sequences before writing each record.
 *
 * @example
 * ```ts
 * const handler = new CleanFileHandler("app.log", LEVEL_VALUES.WARNING, formatter);
 * ```
 */
export class CleanFileHandler implements Handler {
  readonly level: number;
  formatter: Formatter;
  private stream: fs.WriteStream;

  constructor(filename: string, level: number, formatter: Formatter) {
    this.level = level;
    this.formatter = formatter;
    this.stream = fs.createWriteStream(filename, { flags: "a" });
    this.stream.on("error", (err) => {
      try {
        process.stderr.write(
          `crisplogs: file write failed (${filename}): ${err.message}\n`,
        );
      } catch {
        // stderr itself failed, silently swallow.
      }
    });
  }

  emit(record: LogRecord): void {
    const output = this.formatter.format(record);
    const clean = stripAnsi(output);
    this.stream.write(clean + "\n");
  }

  close(): void {
    this.stream.end();
  }
}
