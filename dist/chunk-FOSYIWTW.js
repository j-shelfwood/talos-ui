// src/wc/render.ts
var SVG_NS = "http://www.w3.org/2000/svg";
function replaceTextWithUnit(container, value, unit) {
  container.replaceChildren(document.createTextNode(value));
  if (!unit) return;
  const unitEl = document.createElement("span");
  unitEl.className = "unit";
  unitEl.textContent = unit;
  container.appendChild(unitEl);
}
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
  return el;
}

export {
  replaceTextWithUnit,
  svgEl
};
