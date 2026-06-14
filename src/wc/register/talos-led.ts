/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-led"` registers
 * ONLY <talos-led> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosLed } from "../talos-led";
import { define } from "../register";

define("talos-led", TalosLed);
export { TalosLed };
