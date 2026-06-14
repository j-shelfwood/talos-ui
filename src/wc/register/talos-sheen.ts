/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-sheen"` registers
 * ONLY <talos-sheen> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosSheen } from "../talos-sheen";
import { define } from "../register";

define("talos-sheen", TalosSheen);
export { TalosSheen };
