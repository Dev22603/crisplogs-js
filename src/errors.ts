/**
 * Typed error hierarchy for crisplogs.
 *
 * All errors thrown by the library extend {@link CrisplogsError}, which itself
 * extends the built-in `Error`. Catching `CrisplogsError` is a reliable way to
 * scope `catch` blocks to library failures without swallowing unrelated bugs.
 *
 * @example
 * ```ts
 * import { setupLogging, CrisplogsError, InvalidLevelError } from "crisplogs";
 *
 * try {
 *   setupLogging({ level: "info" as any });
 * } catch (e) {
 *   if (e instanceof InvalidLevelError) { ... }
 *   else if (e instanceof CrisplogsError) { ... }
 * }
 * ```
 */

/** Base class for every error thrown by crisplogs. */
export class CrisplogsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CrisplogsError";
	}
}

/** Thrown when a level string is not one of {@link Level}. */
export class InvalidLevelError extends CrisplogsError {
	constructor(message: string) {
		super(message);
		this.name = "InvalidLevelError";
	}
}

/** Thrown when a style string is not one of {@link Style}. */
export class InvalidStyleError extends CrisplogsError {
	constructor(message: string) {
		super(message);
		this.name = "InvalidStyleError";
	}
}

/** Thrown when a color string contains an unrecognized token. */
export class InvalidColorError extends CrisplogsError {
	constructor(message: string) {
		super(message);
		this.name = "InvalidColorError";
	}
}

/** Thrown when an `extraFormat` value is not one of {@link ExtraFormat}. */
export class InvalidExtraFormatError extends CrisplogsError {
	constructor(message: string) {
		super(message);
		this.name = "InvalidExtraFormatError";
	}
}

/** Thrown when `width` is not a positive finite number. */
export class InvalidWidthError extends CrisplogsError {
	constructor(message: string) {
		super(message);
		this.name = "InvalidWidthError";
	}
}

/** Thrown when a file path is not a non-empty string. */
export class InvalidFilePathError extends CrisplogsError {
	constructor(message: string) {
		super(message);
		this.name = "InvalidFilePathError";
	}
}
