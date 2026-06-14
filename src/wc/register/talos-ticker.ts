/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-ticker"` registers
 * ONLY <talos-ticker> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosTicker } from "../talos-ticker";
import { define } from "../register";

define("talos-ticker", TalosTicker);
export { TalosTicker };
