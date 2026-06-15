// src/wc/a11y.ts
function withLabel(label, summary) {
  return label ? `${label}: ${summary}` : summary;
}
function clearValueAttrs(el) {
  el.removeAttribute("aria-valuenow");
  el.removeAttribute("aria-valuemin");
  el.removeAttribute("aria-valuemax");
  el.removeAttribute("aria-valuetext");
}
function setImageA11y(el, { label, summary }) {
  clearValueAttrs(el);
  el.removeAttribute("aria-live");
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", withLabel(label, summary));
}
function setStatusA11y(el, { label, summary }, live = null) {
  clearValueAttrs(el);
  el.setAttribute("role", "status");
  if (live) el.setAttribute("aria-live", live);
  else el.removeAttribute("aria-live");
  el.setAttribute("aria-label", withLabel(label, summary));
}
function setMeterA11y(el, { label, summary, value, min, max }) {
  el.removeAttribute("aria-live");
  el.setAttribute("role", "meter");
  el.setAttribute("aria-valuenow", String(value));
  el.setAttribute("aria-valuemin", String(min));
  el.setAttribute("aria-valuemax", String(max));
  const text = withLabel(label, summary);
  el.setAttribute("aria-label", text);
  el.setAttribute("aria-valuetext", text);
}

export {
  setImageA11y,
  setStatusA11y,
  setMeterA11y
};
