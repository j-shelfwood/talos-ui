/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-stat"` registers
 * ONLY <talos-stat> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosStat } from "../talos-stat";
import { define } from "../register";

define("talos-stat", TalosStat);
export { TalosStat };
