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

describe("<talos-toggle> element", async () => {
  const { define } = await import("./register");
  const { TalosToggle } = await import("./talos-toggle");
  define("talos-toggle", TalosToggle);

  const mount = () => {
    document.body.innerHTML = `<talos-toggle options="a:A,b:B,c:C" value="a"></talos-toggle>`;
    const el = document.body.firstElementChild as InstanceType<typeof TalosToggle>;
    const buttons = () => [...el.shadowRoot!.querySelectorAll("button")];
    return { el, buttons };
  };

  test("a value change keeps the same button elements and moves aria-checked", () => {
    const { el, buttons } = mount();
    const before = buttons();
    el.value = "b";
    const after = buttons();
    expect(after).toHaveLength(3);
    after.forEach((b, i) => expect(b).toBe(before[i]));
    expect(after.map((b) => b.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(after.map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
  });

  test("arrow keys keep focus on the newly selected segment", () => {
    const { el, buttons } = mount();
    let changed = "";
    el.addEventListener("talos:change", (e) => (changed = (e as CustomEvent).detail.value));
    buttons()[0].focus();
    buttons()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(changed).toBe("b");
    expect(el.shadowRoot!.activeElement).toBe(buttons()[1]);
  });

  test("changing options rebuilds the buttons", () => {
    const { el, buttons } = mount();
    const before = buttons()[0];
    el.setAttribute("options", "a:A,z:Z");
    expect(buttons()).toHaveLength(2);
    expect(buttons()[0]).not.toBe(before);
  });

  test("disabled blocks click and keyboard selection", () => {
    const { el, buttons } = mount();
    el.disabled = true;
    expect(buttons().every((b) => b.disabled)).toBe(true);
    buttons()[2].click();
    buttons()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(el.value).toBe("a");
    el.disabled = false;
    buttons()[2].click();
    expect(el.value).toBe("c");
  });

  test("the selected segment has an inverted focus ring", () => {
    const { el } = mount();
    const css = el.shadowRoot!.querySelector("style")!.textContent!;
    expect(css).toMatch(/button\[aria-checked="true"\]:focus-visible\s*\{\s*outline-color:\s*var\(--_on-fg\)/);
  });
});
