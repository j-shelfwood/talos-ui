/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-spark"` registers
 * ONLY <talos-spark> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosSpark } from "../talos-spark";
import { define } from "../register";

define("talos-spark", TalosSpark);
export { TalosSpark };
