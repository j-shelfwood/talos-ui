/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-toggle"` registers
 * ONLY <talos-toggle> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosToggle } from "../talos-toggle";
import { define } from "../register";

define("talos-toggle", TalosToggle);
export { TalosToggle };
