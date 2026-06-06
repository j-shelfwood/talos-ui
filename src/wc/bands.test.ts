import { test, expect, describe } from "bun:test";
import { bandOf } from "./bands";

// bandOf only reads getAttribute(), so a minimal stub stands in for an Element —
// keeps the test DOM-free and runnable under `bun test` with no jsdom.
function el(attrs: Record<string, string | null>): Element {
  return { getAttribute: (k: string) => attrs[k] ?? null } as unknown as Element;
}

describe("bandOf — shared threshold model", () => {
  test("nominal below warn", () => {
    expect(bandOf(el({ warn: "70", crit: "90" }), 50)).toBe("nominal");
  });

  test("warning at and above warn, below crit", () => {
    expect(bandOf(el({ warn: "70", crit: "90" }), 70)).toBe("warning"); // inclusive boundary
    expect(bandOf(el({ warn: "70", crit: "90" }), 89)).toBe("warning");
  });

  test("critical at and above crit", () => {
    expect(bandOf(el({ warn: "70", crit: "90" }), 90)).toBe("critical"); // inclusive boundary
    expect(bandOf(el({ warn: "70", crit: "90" }), 100)).toBe("critical");
  });

  test("crit takes precedence over warn", () => {
    // 95 is >= both thresholds; the more severe band wins.
    expect(bandOf(el({ warn: "70", crit: "90" }), 95)).toBe("critical");
  });

  describe("absence is the contract — a missing threshold never triggers", () => {
    test("no crit attr → never critical, even at huge values", () => {
      expect(bandOf(el({ warn: "70" }), 9999)).toBe("warning");
    });
    test("no warn attr → only crit can trigger", () => {
      expect(bandOf(el({ crit: "90" }), 80)).toBe("nominal");
      expect(bandOf(el({ crit: "90" }), 90)).toBe("critical");
    });
    test("neither attr → always nominal (no implicit defaults)", () => {
      expect(bandOf(el({}), 1e6)).toBe("nominal");
      expect(bandOf(el({}), -1e6)).toBe("nominal");
    });
  });

  describe("edge cases", () => {
    test("negative values band correctly", () => {
      expect(bandOf(el({ warn: "-10", crit: "-5" }), -7)).toBe("warning");
      expect(bandOf(el({ warn: "-10", crit: "-5" }), -4)).toBe("critical");
      expect(bandOf(el({ warn: "-10", crit: "-5" }), -20)).toBe("nominal");
    });

    test("zero thresholds are honoured (not treated as absent)", () => {
      // 0 is a valid threshold; only `null` means absent.
      expect(bandOf(el({ warn: "0", crit: "10" }), 0)).toBe("warning");
    });

    test("non-numeric attr parses to NaN → comparison is false → that band off", () => {
      // value >= NaN is always false, so a garbage threshold can't trigger.
      expect(bandOf(el({ warn: "abc", crit: "90" }), 80)).toBe("nominal");
      expect(bandOf(el({ warn: "70", crit: "xyz" }), 95)).toBe("warning");
    });

    test("fractional thresholds", () => {
      expect(bandOf(el({ warn: "0.7", crit: "0.9" }), 0.75)).toBe("warning");
    });
  });
});
