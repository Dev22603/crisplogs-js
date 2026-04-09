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
  level: number;
  formatter: Formatter;

  constructor(level: number, formatter: Formatter) {
    this.level = level;
    this.formatter = formatter;
  }

  emit(record: LogRecord): void {
    const output = this.formatter.format(record);
    process.stdout.write(output + "\n");
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
  level: number;
  formatter: Formatter;
  private filename: string;

  constructor(filename: string, level: number, formatter: Formatter) {
    this.level = level;
    this.formatter = formatter;
    this.filename = filename;
  }

  emit(record: LogRecord): void {
    const output = this.formatter.format(record);
    const clean = stripAnsi(output);
    fs.appendFileSync(this.filename, clean + "\n", "utf-8");
  }
}
