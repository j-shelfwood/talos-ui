/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-odometer"` registers
 * ONLY <talos-odometer> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosOdometer } from "../talos-odometer";
import { define } from "../register";

define("talos-odometer", TalosOdometer);
export { TalosOdometer };
