interface LabelledSummary {
  label?: string | null;
  summary: string;
}

interface MeterA11y extends LabelledSummary {
  value: number;
  min: number;
  max: number;
}

function withLabel(label: string | null | undefined, summary: string): string {
  return label ? `${label}: ${summary}` : summary;
}

function clearValueAttrs(el: Element): void {
  el.removeAttribute("aria-valuenow");
  el.removeAttribute("aria-valuemin");
  el.removeAttribute("aria-valuemax");
  el.removeAttribute("aria-valuetext");
}

export function setImageA11y(el: Element, { label, summary }: LabelledSummary): void {
  clearValueAttrs(el);
  el.removeAttribute("aria-live");
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", withLabel(label, summary));
}

export function setStatusA11y(
  el: Element,
  { label, summary }: LabelledSummary,
  live: "polite" | null = null,
): void {
  clearValueAttrs(el);
  el.setAttribute("role", "status");
  if (live) el.setAttribute("aria-live", live);
  else el.removeAttribute("aria-live");
  el.setAttribute("aria-label", withLabel(label, summary));
}

export function setMeterA11y(
  el: Element,
  { label, summary, value, min, max }: MeterA11y,
): void {
  el.removeAttribute("aria-live");
  el.setAttribute("role", "meter");
  el.setAttribute("aria-valuenow", String(value));
  el.setAttribute("aria-valuemin", String(min));
  el.setAttribute("aria-valuemax", String(max));
  const text = withLabel(label, summary);
  el.setAttribute("aria-label", text);
  el.setAttribute("aria-valuetext", text);
}
