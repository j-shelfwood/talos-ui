import { describe, expect, spyOn, test } from "bun:test";
import { define } from "./register";
import { TalosLed } from "./talos-led";

define("talos-led", TalosLed);

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}
const colour = (el: HTMLElement) => el.style.getPropertyValue("--_c");

describe("talos-led", () => {
  test.each([
    ["ok", "--_nominal"], ["nominal", "--_nominal"],
    ["warn", "--_warning"], ["warning", "--_warning"],
    ["crit", "--_critical"], ["critical", "--_critical"], ["CRITICAL", "--_critical"],
    ["idle", "--_idle"],
  ])("state=%s maps to %s", (state, token) => {
    expect(colour(mount(`<talos-led state="${state}"></talos-led>`))).toBe(`var(${token})`);
  });

  test("unknown state reads idle, never green, and warns once", () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const a = mount(`<talos-led state="exploded"></talos-led>`);
    expect(colour(a)).toBe("var(--_idle)");
    mount(`<talos-led state="exploded"></talos-led>`);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  test("aria-label names label and state once", () => {
    expect(mount(`<talos-led state="ok" label="ok"></talos-led>`).getAttribute("aria-label")).toBe("ok");
    expect(mount(`<talos-led state="warn" label="Uplink" live></talos-led>`).getAttribute("aria-label"))
      .toBe("Uplink: warning, live");
    expect(mount(`<talos-led value="95" crit="90"></talos-led>`).getAttribute("aria-label")).toBe("critical");
  });
});
