import { afterEach, describe, expect, test } from "bun:test";

type CustomElementsStub = {
  get(name: string): unknown;
  define(name: string, ctor: CustomElementConstructor): void;
};

const originalHTMLElement = globalThis.HTMLElement;
const originalCustomElements = globalThis.customElements;

function installRegistry() {
  const registry = new Map<string, CustomElementConstructor>();
  const calls: string[] = [];

  (globalThis as typeof globalThis & { HTMLElement: typeof HTMLElement }).HTMLElement =
    class {} as typeof HTMLElement;
  (globalThis as typeof globalThis & { customElements: CustomElementsStub }).customElements = {
    get(name: string) {
      return registry.get(name);
    },
    define(name: string, ctor: CustomElementConstructor) {
      calls.push(name);
      registry.set(name, ctor);
    },
  };

  return { registry, calls };
}

afterEach(() => {
  if (originalHTMLElement === undefined) delete (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement;
  else globalThis.HTMLElement = originalHTMLElement;

  if (originalCustomElements === undefined) delete (globalThis as { customElements?: CustomElementRegistry }).customElements;
  else globalThis.customElements = originalCustomElements;
});

describe("custom element registration", () => {
  test("define is idempotent for the same tag", async () => {
    const { calls } = installRegistry();
    const { define } = await import(`./register.ts?case=define-${Date.now()}`);
    const ctor = class extends HTMLElement {};

    define("talos-test", ctor);
    define("talos-test", ctor);

    expect(calls).toEqual(["talos-test"]);
  });

  test("single-component entry registers only its tag", async () => {
    const { calls, registry } = installRegistry();

    await import(`./register/talos-toggle.ts?case=single-${Date.now()}`);

    expect(calls).toEqual(["talos-toggle"]);
    expect(registry.has("talos-toggle")).toBe(true);
  });

  test("barrel import and per-component import stay idempotent together", async () => {
    const { calls } = installRegistry();

    await import(`./index.ts?case=barrel-${Date.now()}`);
    const toggleDefines = calls.filter((name) => name === "talos-toggle").length;
    await import(`./register/talos-toggle.ts?case=repeat-${Date.now()}`);

    expect(toggleDefines).toBe(1);
    expect(calls.filter((name) => name === "talos-toggle")).toHaveLength(1);
  });
});
