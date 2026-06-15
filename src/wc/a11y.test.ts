import { describe, expect, test } from "bun:test";
import { setImageA11y, setMeterA11y, setStatusA11y } from "./a11y";

type Attrs = Record<string, string>;

function stubEl(initial: Attrs = {}) {
  const attrs = new Map(Object.entries(initial));
  return {
    attrs,
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    removeAttribute(name: string) {
      attrs.delete(name);
    },
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
    },
  } as unknown as Element & { attrs: Map<string, string> };
}

describe("a11y helpers", () => {
  test("setMeterA11y applies a full meter contract", () => {
    const el = stubEl({ "aria-live": "polite" });
    setMeterA11y(el, {
      label: "CPU",
      summary: "82% — warning",
      value: 82,
      min: 0,
      max: 100,
    });

    expect(el.getAttribute("role")).toBe("meter");
    expect(el.getAttribute("aria-live")).toBeNull();
    expect(el.getAttribute("aria-valuenow")).toBe("82");
    expect(el.getAttribute("aria-valuemin")).toBe("0");
    expect(el.getAttribute("aria-valuemax")).toBe("100");
    expect(el.getAttribute("aria-label")).toBe("CPU: 82% — warning");
    expect(el.getAttribute("aria-valuetext")).toBe("CPU: 82% — warning");
  });

  test("setStatusA11y clears value attrs and can mark live regions", () => {
    const el = stubEl({
      "aria-valuenow": "9",
      "aria-valuemin": "0",
      "aria-valuemax": "10",
      "aria-valuetext": "old",
    });
    setStatusA11y(el, { label: "Queue", summary: "9 items" }, "polite");

    expect(el.getAttribute("role")).toBe("status");
    expect(el.getAttribute("aria-live")).toBe("polite");
    expect(el.getAttribute("aria-valuenow")).toBeNull();
    expect(el.getAttribute("aria-valuetext")).toBeNull();
    expect(el.getAttribute("aria-label")).toBe("Queue: 9 items");
  });

  test("setImageA11y clears live and value attrs", () => {
    const el = stubEl({
      "aria-live": "polite",
      "aria-valuenow": "1",
    });
    setImageA11y(el, { label: "Mesh", summary: "4 nodes" });

    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-live")).toBeNull();
    expect(el.getAttribute("aria-valuenow")).toBeNull();
    expect(el.getAttribute("aria-label")).toBe("Mesh: 4 nodes");
  });
});
