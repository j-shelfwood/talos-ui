/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-meter"` registers
 * ONLY <talos-meter> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosMeter } from "../talos-meter";
import { define } from "../register";

define("talos-meter", TalosMeter);
export { TalosMeter };
