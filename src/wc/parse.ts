export function parseNumberList(raw: string | null | undefined): number[] {
  return (raw ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite);
}

export interface ToggleOptionToken {
  value: string;
  label: string;
}

export function parseToggleOptions(raw: string): ToggleOptionToken[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((tok) => {
      const i = tok.indexOf(":");
      return i === -1
        ? { value: tok, label: tok }
        : { value: tok.slice(0, i), label: tok.slice(i + 1) };
    });
}
