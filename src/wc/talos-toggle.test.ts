import { describe, expect, test } from "bun:test";
import { parseToggleOptions } from "./parse";

describe("parseToggleOptions", () => {
  test("parses value-only tokens as matching labels", () => {
    expect(parseToggleOptions("day,week")).toEqual([
      { value: "day", label: "day" },
      { value: "week", label: "week" },
    ]);
  });

  test("splits value:label pairs on the first colon only", () => {
    expect(parseToggleOptions("1h:1 Hour,ops:OPS:PRIMARY")).toEqual([
      { value: "1h", label: "1 Hour" },
      { value: "ops", label: "OPS:PRIMARY" },
    ]);
  });

  test("ignores blank tokens", () => {
    expect(parseToggleOptions("alpha, , beta")).toEqual([
      { value: "alpha", label: "alpha" },
      { value: "beta", label: "beta" },
    ]);
  });
});
