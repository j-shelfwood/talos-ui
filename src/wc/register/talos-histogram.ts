/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-histogram"` registers
 * ONLY <talos-histogram> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosHistogram } from "../talos-histogram";
import { define } from "../register";

define("talos-histogram", TalosHistogram);
export { TalosHistogram };
