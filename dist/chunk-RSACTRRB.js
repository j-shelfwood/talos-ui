// src/wc/parse.ts
function parseNumberList(raw) {
  return (raw ?? "").split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite);
}
function parseToggleOptions(raw) {
  return raw.split(",").map((s) => s.trim()).filter(Boolean).map((tok) => {
    const i = tok.indexOf(":");
    return i === -1 ? { value: tok, label: tok } : { value: tok.slice(0, i), label: tok.slice(i + 1) };
  });
}

export {
  parseNumberList,
  parseToggleOptions
};
