/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-status"` registers
 * ONLY <talos-status> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosStatus } from "../talos-status";
import { define } from "../register";

define("talos-status", TalosStatus);
export { TalosStatus };
