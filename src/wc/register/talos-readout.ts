/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-readout"` registers
 * ONLY <talos-readout> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosReadout } from "../talos-readout";
import { define } from "../register";

define("talos-readout", TalosReadout);
export { TalosReadout };
