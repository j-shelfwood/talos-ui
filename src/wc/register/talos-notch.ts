/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-notch"` registers
 * ONLY <talos-notch> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosNotch } from "../talos-notch";
import { define } from "../register";

define("talos-notch", TalosNotch);
export { TalosNotch };
