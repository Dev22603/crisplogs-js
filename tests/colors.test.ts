import { describe, it, expect } from "vitest";
import { parseColorString, RESET } from "../src/colors";

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
