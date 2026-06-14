/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-plane"` registers
 * ONLY <talos-plane> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosPlane } from "../talos-plane";
import { define } from "../register";

define("talos-plane", TalosPlane);
export { TalosPlane };
