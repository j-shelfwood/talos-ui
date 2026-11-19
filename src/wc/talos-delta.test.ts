import { describe, expect, test } from "bun:test";
import { define } from "./register";
import { TalosDelta } from "./talos-delta";

define("talos-delta", TalosDelta);

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}
const shown = (el: HTMLElement) =>
  el.shadowRoot!.querySelector(".arrow")!.textContent! + el.shadowRoot!.querySelector(".mag")!.textContent!;

describe("talos-delta", () => {
  test("static use with `from` shows the change", () => {
    const el = mount(`<talos-delta value="12" from="9"></talos-delta>`);
    expect(shown(el)).toBe("▲3");
    expect(el.getAttribute("data-dir")).toBe("good");
  });

  test("without `from` the first reading is flat, the next is vs the last", () => {
    const el = mount(`<talos-delta value="10"></talos-delta>`);
    expect(shown(el)).toBe("▬0");
    el.setAttribute("value", "7");
    expect(shown(el)).toBe("▼3");
    (el as unknown as TalosDelta).update(7);
    expect(shown(el)).toBe("▬0");
  });

  test("good/precision/eps changes re-render without consuming a tick", () => {
    const el = mount(`<talos-delta value="12.25" from="10"></talos-delta>`);
    expect(el.getAttribute("data-dir")).toBe("good");
    el.setAttribute("good", "down");
    expect(el.getAttribute("data-dir")).toBe("bad");
    el.setAttribute("precision", "2");
    expect(shown(el)).toBe("▲2.25");
    el.setAttribute("eps", "5");
    expect(shown(el)).toBe("▬2.25");
    expect(el.hasAttribute("data-dir")).toBe(false);
  });

  test("exposes role=img with direction, magnitude and health", () => {
    const el = mount(`<talos-delta value="80" from="100" good="down" label="Latency"></talos-delta>`);
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe("Latency: down 20, improving");
  });
});
