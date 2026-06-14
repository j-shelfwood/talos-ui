/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-corner"` registers
 * ONLY <talos-corner> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosCorner } from "../talos-corner";
import { define } from "../register";

define("talos-corner", TalosCorner);
export { TalosCorner };
