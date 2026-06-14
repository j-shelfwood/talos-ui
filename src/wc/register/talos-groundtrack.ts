/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-groundtrack"` registers
 * ONLY <talos-groundtrack> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosGroundtrack } from "../talos-groundtrack";
import { define } from "../register";

define("talos-groundtrack", TalosGroundtrack);
export { TalosGroundtrack };
