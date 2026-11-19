import { describe, expect, test } from "bun:test";
import "./index";
import { BAND_TOKENS_CSS } from "./bands";

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

// Every banded instrument opens :host with the shared token block, so one
// retheme reaches all of them and no instrument forks the meaning of --_nominal.
const banded = [
  "talos-compass", "talos-dots", "talos-flow", "talos-gauge", "talos-histogram",
  "talos-led", "talos-meter", "talos-percentile", "talos-plane", "talos-range",
  "talos-readout", "talos-spacecraft", "talos-spark", "talos-stat", "talos-status", "talos-ticker",
  "talos-trend",
];

describe("band tokens", () => {
  test.each(banded)("%s uses BAND_TOKENS_CSS", (tag) => {
    const css = [...mount(`<${tag}></${tag}>`).shadowRoot!.querySelectorAll("style")]
      .map((s) => s.textContent)
      .join("\n");
    expect(css).toContain(BAND_TOKENS_CSS.trim());
    expect(css.match(/--_nominal:/g)).toHaveLength(1);
  });

  // Canvas instruments cannot mount without a 2D context (none in happy-dom):
  // check their source instead.
  test.each(["talos-groundtrack", "talos-matrix"])("%s source uses BAND_TOKENS_CSS", async (tag) => {
    const src = await Bun.file(new URL(`./${tag}.ts`, import.meta.url)).text();
    expect(src).toContain("${BAND_TOKENS_CSS}");
    expect(src).not.toMatch(/--_nominal:\s*var/);
  });
});

describe("text instrument a11y", () => {
  test("readout aria-label carries the current value, unit and band", async () => {
    const el = mount(`<talos-readout value="42" unit="ms" warn="40" label="Latency"></talos-readout>`);
    expect(el.getAttribute("aria-label")).toBe("Latency: 42 ms, warning");
    el.setAttribute("value", "12");
    await new Promise((r) => setTimeout(r, 0));
    expect(el.getAttribute("aria-label")).toBe("Latency: 12 ms, nominal");
  });

  test("readout without thresholds names no band", () => {
    expect(mount(`<talos-readout value="OK"></talos-readout>`).getAttribute("aria-label")).toBe("OK");
  });

  test("readout and stat keep nominal text in the foreground colour", () => {
    expect(mount(`<talos-readout value="5" warn="40"></talos-readout>`).style.getPropertyValue("--_c"))
      .toBe("var(--talos-foreground, #e7e9ec)");
    expect(mount(`<talos-readout value="50" warn="40"></talos-readout>`).style.getPropertyValue("--_c"))
      .toBe("var(--_warning)");
  });

  test("stat exposes role=img with value, unit and band", () => {
    const el = mount(`<talos-stat value="91.5" precision="1" unit="%" crit="90" label="Disk"></talos-stat>`);
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe("Disk: 91.5 %, critical");
    expect(el.getAttribute("data-band")).toBe("critical");
  });

  test("stat without thresholds names no band", () => {
    expect(mount(`<talos-stat value="7" label="Nodes"></talos-stat>`).getAttribute("aria-label")).toBe("Nodes: 7");
  });
});
