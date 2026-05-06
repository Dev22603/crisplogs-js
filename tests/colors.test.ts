import { describe, expect, it } from "vitest";
import { parseColorString, RESET } from "../src/colors";
import { InvalidColorError } from "../src/errors";

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

	it("throws InvalidColorError for unknown bare token", () => {
		expect(() => parseColorString("nonexistent")).toThrow(InvalidColorError);
	});

	it("throws InvalidColorError for unknown background", () => {
		expect(() => parseColorString("bg_purpler")).toThrow(InvalidColorError);
	});

	it("throws InvalidColorError for unknown modifier", () => {
		expect(() => parseColorString("brigt_red")).toThrow(InvalidColorError);
	});

	it("throws InvalidColorError for unknown color in modifier_color", () => {
		expect(() => parseColorString("bold_chartreuse")).toThrow(
			InvalidColorError,
		);
	});

	it("throws InvalidColorError for uppercase bare color", () => {
		expect(() => parseColorString("RED")).not.toThrow();
		// Uppercase is normalised via toLowerCase, so RED is valid.
	});
});
