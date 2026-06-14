/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-spacecraft"` registers
 * ONLY <talos-spacecraft> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosSpacecraft } from "../talos-spacecraft";
import { define } from "../register";

define("talos-spacecraft", TalosSpacecraft);
export { TalosSpacecraft };
