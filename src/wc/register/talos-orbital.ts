/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-orbital"` registers
 * ONLY <talos-orbital> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosOrbital } from "../talos-orbital";
import { define } from "../register";

define("talos-orbital", TalosOrbital);
export { TalosOrbital };
