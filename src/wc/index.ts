/**
 * @shelfwood/talos-ui — web components entry.
 * Importing this module registers <talos-panel>, <talos-corner>, <talos-notch>.
 * Idempotent: safe to import more than once.
 */
import { TalosPanel } from "./talos-panel";
import { TalosCorner } from "./talos-corner";
import { TalosNotch } from "./talos-notch";

export { TalosPanel, TalosCorner, TalosNotch };
export { PanelShapeBuilder } from "./PanelShapeBuilder";
export type { Segment, Edge, CornerEdge, PanelShapeOptions } from "./PanelShapeBuilder";

function define(name: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(name)) customElements.define(name, ctor);
}

if (typeof customElements !== "undefined") {
  define("talos-corner", TalosCorner);
  define("talos-notch", TalosNotch);
  define("talos-panel", TalosPanel);
}
