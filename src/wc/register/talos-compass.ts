/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-compass"` registers
 * ONLY <talos-compass> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosCompass } from "../talos-compass";
import { define } from "../register";

define("talos-compass", TalosCompass);
export { TalosCompass };
