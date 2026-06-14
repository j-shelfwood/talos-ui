/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-range"` registers
 * ONLY <talos-range> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosRange } from "../talos-range";
import { define } from "../register";

define("talos-range", TalosRange);
export { TalosRange };
