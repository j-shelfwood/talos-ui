/**
 * @shelfwood/talos-ui — web components entry.
 * Importing this module registers the panel-chrome elements (<talos-panel>,
 * <talos-corner>, <talos-notch>) and the data-binding instruments
 * (<talos-gauge>, …). Idempotent: safe to import more than once.
 */
import { TalosPanel } from "./talos-panel";
import { TalosCorner } from "./talos-corner";
import { TalosNotch } from "./talos-notch";
import { TalosGauge } from "./talos-gauge";
import { TalosTrend } from "./talos-trend";
import { TalosMeter } from "./talos-meter";
import { TalosFlow } from "./talos-flow";
import { TalosOrbital } from "./talos-orbital";
import { TalosSheen } from "./talos-sheen";
import { TalosReadout } from "./talos-readout";

export { TalosPanel, TalosCorner, TalosNotch, TalosGauge, TalosTrend, TalosMeter, TalosFlow, TalosOrbital, TalosSheen, TalosReadout };
export type { OrbitalNode } from "./talos-orbital";
export { PanelShapeBuilder } from "./PanelShapeBuilder";
export type { Segment, Edge, CornerEdge, PanelShapeOptions } from "./PanelShapeBuilder";

function define(name: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(name)) customElements.define(name, ctor);
}

if (typeof customElements !== "undefined") {
  define("talos-corner", TalosCorner);
  define("talos-notch", TalosNotch);
  define("talos-panel", TalosPanel);
  define("talos-gauge", TalosGauge);
  define("talos-trend", TalosTrend);
  define("talos-meter", TalosMeter);
  define("talos-flow", TalosFlow);
  define("talos-orbital", TalosOrbital);
  define("talos-sheen", TalosSheen);
  define("talos-readout", TalosReadout);
}
