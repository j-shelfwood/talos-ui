/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-matrix"` registers
 * ONLY <talos-matrix> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosMatrix } from "../talos-matrix";
import { define } from "../register";

define("talos-matrix", TalosMatrix);
export { TalosMatrix };
