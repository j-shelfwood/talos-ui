// src/wc/register.ts
function define(name, ctor) {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(name)) customElements.define(name, ctor);
}

export {
  define
};
