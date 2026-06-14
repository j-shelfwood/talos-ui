/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-gauge"` registers
 * ONLY <talos-gauge> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosGauge } from "../talos-gauge";
import { define } from "../register";

define("talos-gauge", TalosGauge);
export { TalosGauge };
