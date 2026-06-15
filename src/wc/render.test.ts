import { describe, expect, test } from "bun:test";
import { parseNumberList } from "./parse";

describe("parseNumberList", () => {
  test("accepts comma and whitespace delimiters", () => {
    expect(parseNumberList("1, 2  3\n4")).toEqual([1, 2, 3, 4]);
  });

  test("drops empty and non-numeric tokens", () => {
    expect(parseNumberList("7,,foo 9 bar")).toEqual([7, 9]);
  });

  test("treats nullish input as an empty series", () => {
    expect(parseNumberList(null)).toEqual([]);
    expect(parseNumberList(undefined)).toEqual([]);
  });
});
