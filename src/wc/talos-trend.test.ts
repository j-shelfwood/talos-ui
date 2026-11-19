import { describe, expect, spyOn, test } from "bun:test";
import { define } from "./register";
import { TalosTrend } from "./talos-trend";

define("talos-trend", TalosTrend);

function mount(html: string): TalosTrend {
  document.body.innerHTML = html;
  return document.body.firstElementChild as TalosTrend;
}
const samples = (el: TalosTrend) =>
  el.shadowRoot!.querySelector(".line")!.getAttribute("points")!.trim().split(/\s+/).length;

describe("talos-trend window size", () => {
  test("`cap` limits the window", () => {
    const el = mount(`<talos-trend cap="3" data="1 2 3 4 5"></talos-trend>`);
    expect(samples(el)).toBe(3);
    el.push(6);
    expect(samples(el)).toBe(3);
  });

  test("`points` still works as a deprecated alias and warns once", () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const el = mount(`<talos-trend points="4" data="1 2 3 4 5 6"></talos-trend>`);
    expect(samples(el)).toBe(4);
    mount(`<talos-trend points="4" data="1 2 3 4 5 6"></talos-trend>`);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  test("`cap` wins over `points`", () => {
    const el = mount(`<talos-trend cap="2" points="5" data="1 2 3 4 5 6"></talos-trend>`);
    expect(samples(el)).toBe(2);
  });
});
