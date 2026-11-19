/**
 * Minimal DOM for unit-testing web components under `bun test` (the repo ships
 * no DOM library). Covers only what the instruments touch: elements with
 * attributes, children, textContent and a style object; open shadow roots;
 * EventTarget dispatch (Bun's native); a manual requestAnimationFrame queue;
 * and attributeChangedCallback for `observedAttributes`. Test-only: not a
 * tsup entry, never shipped.
 */

type Listener = Parameters<EventTarget["addEventListener"]>[1];

class FakeStyle {
  [prop: string]: unknown;
  setProperty(name: string, value: string): void {
    this[name] = value;
  }
  getPropertyValue(name: string): string {
    return String(this[name] ?? "");
  }
}

export class FakeElement extends EventTarget {
  parentNode: FakeElement | null = null;
  childNodes: FakeElement[] = [];
  style = new FakeStyle();
  private attrs = new Map<string, string>();
  private text = "";

  constructor(
    public tagName = "div",
    public namespaceURI: string | null = null,
  ) {
    super();
  }

  get children(): FakeElement[] {
    return this.childNodes;
  }
  get textContent(): string {
    return this.text + this.childNodes.map((c) => c.textContent).join("");
  }
  set textContent(v: string) {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    this.text = String(v ?? "");
  }

  getAttribute(name: string): string | null {
    return this.attrs.has(name) ? this.attrs.get(name)! : null;
  }
  hasAttribute(name: string): boolean {
    return this.attrs.has(name);
  }
  setAttribute(name: string, value: string): void {
    const old = this.getAttribute(name);
    this.attrs.set(name, String(value));
    this.changed(name, old, String(value));
  }
  removeAttribute(name: string): void {
    const old = this.getAttribute(name);
    this.attrs.delete(name);
    if (old !== null) this.changed(name, old, null);
  }
  protected changed(_name: string, _old: string | null, _value: string | null): void {}

  appendChild<T extends FakeElement>(child: T): T {
    child.remove();
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  append(...nodes: FakeElement[]): void {
    for (const n of nodes) this.appendChild(n);
  }
  replaceChildren(...nodes: FakeElement[]): void {
    this.textContent = "";
    this.append(...nodes);
  }
  remove(): void {
    if (!this.parentNode) return;
    const siblings = this.parentNode.childNodes;
    siblings.splice(siblings.indexOf(this), 1);
    this.parentNode = null;
  }

  /** Depth-first search (test helper; not a DOM API). */
  find(pred: (el: FakeElement) => boolean): FakeElement | undefined {
    for (const c of this.childNodes) {
      if (pred(c)) return c;
      const hit = c.find(pred);
      if (hit) return hit;
    }
    return undefined;
  }
  findAll(pred: (el: FakeElement) => boolean, out: FakeElement[] = []): FakeElement[] {
    for (const c of this.childNodes) {
      if (pred(c)) out.push(c);
      c.findAll(pred, out);
    }
    return out;
  }
}

class FakeHTMLElement extends FakeElement {
  shadowRoot: FakeElement | null = null;
  isConnected = false;
  constructor() {
    super("custom");
  }
  attachShadow(_init: unknown): FakeElement {
    this.shadowRoot = new FakeElement("#shadow-root");
    return this.shadowRoot;
  }
  protected changed(name: string, old: string | null, value: string | null): void {
    const ctor = this.constructor as { observedAttributes?: string[] };
    const self = this as unknown as {
      attributeChangedCallback?: (n: string, o: string | null, v: string | null) => void;
    };
    if (ctor.observedAttributes?.includes(name)) self.attributeChangedCallback?.(name, old, value);
  }
}

export interface FakeDom {
  /** Pending requestAnimationFrame callbacks. */
  pendingFrames(): number;
  /** Run every pending frame callback at timestamp `t` (ms). */
  frame(t: number): void;
  /** Run frames every 16 ms from `from` to `to`; returns the last timestamp. */
  run(from: number, to: number): number;
  setVisibility(state: "visible" | "hidden"): void;
  setReducedMotion(on: boolean): void;
  mount<T>(el: T): T;
  unmount(el: unknown): void;
  restore(): void;
}

export function installFakeDom(): FakeDom {
  const g = globalThis as Record<string, unknown>;
  const saved = new Map<string, unknown>();
  const set = (k: string, v: unknown) => {
    saved.set(k, g[k]);
    g[k] = v;
  };

  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  let reduced = false;

  const doc = new EventTarget() as EventTarget & Record<string, unknown>;
  doc.visibilityState = "visible";
  doc.createElement = (tag: string) => new FakeElement(tag);
  doc.createElementNS = (ns: string, tag: string) => new FakeElement(tag, ns);

  set("HTMLElement", FakeHTMLElement);
  set("document", doc);
  set("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = nextId++;
    frames.set(id, cb);
    return id;
  });
  set("cancelAnimationFrame", (id: number) => frames.delete(id));
  set("matchMedia", (q: string) => ({
    matches: q.includes("reduced-motion") && reduced,
    media: q,
    addEventListener: (_t: string, _l: Listener) => {},
    removeEventListener: (_t: string, _l: Listener) => {},
  }));

  const api: FakeDom = {
    pendingFrames: () => frames.size,
    frame(t) {
      const due = [...frames.entries()];
      frames.clear();
      for (const [, cb] of due) cb(t);
    },
    run(from, to) {
      let t = from;
      for (; t <= to; t += 16) api.frame(t);
      return t;
    },
    setVisibility(state) {
      doc.visibilityState = state;
      doc.dispatchEvent(new Event("visibilitychange"));
    },
    setReducedMotion(on) {
      reduced = on;
    },
    mount(el) {
      const e = el as unknown as { isConnected: boolean; connectedCallback?: () => void };
      e.isConnected = true;
      e.connectedCallback?.();
      return el;
    },
    unmount(el) {
      const e = el as { isConnected: boolean; disconnectedCallback?: () => void };
      e.isConnected = false;
      e.disconnectedCallback?.();
    },
    restore() {
      for (const [k, v] of saved) {
        if (v === undefined) delete g[k];
        else g[k] = v;
      }
    },
  };
  return api;
}
