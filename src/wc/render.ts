const SVG_NS = "http://www.w3.org/2000/svg";

export function replaceTextWithUnit(
  container: HTMLElement,
  value: string,
  unit: string,
): void {
  container.replaceChildren(document.createTextNode(value));
  if (!unit) return;
  const unitEl = document.createElement("span");
  unitEl.className = "unit";
  unitEl.textContent = unit;
  container.appendChild(unitEl);
}

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
  return el;
}
