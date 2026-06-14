/**
 * Idempotent custom-element registration helper, shared by the barrel
 * (`index.ts`) and the per-component entry modules (`wc/<name>.ts`). Defining a
 * tag twice is a hard DOM error, so every registration goes through this guard —
 * importing both the barrel and a single-component entry is safe.
 */
export function define(name: string, ctor: CustomElementConstructor): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(name)) customElements.define(name, ctor);
}
