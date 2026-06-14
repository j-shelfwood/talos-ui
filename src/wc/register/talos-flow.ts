/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-flow"` registers
 * ONLY <talos-flow> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosFlow } from "../talos-flow";
import { define } from "../register";

define("talos-flow", TalosFlow);
export { TalosFlow };
