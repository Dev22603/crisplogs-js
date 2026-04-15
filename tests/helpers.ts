import type { LogRecord } from "../src";

export function makeRecord(overrides: Partial<LogRecord> = {}): LogRecord {
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
