/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-panel"` registers
 * ONLY <talos-panel> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosPanel } from "../talos-panel";
import { define } from "../register";

define("talos-panel", TalosPanel);
export { TalosPanel };
