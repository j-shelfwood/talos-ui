/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-delta"` registers
 * ONLY <talos-delta> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosDelta } from "../talos-delta";
import { define } from "../register";

define("talos-delta", TalosDelta);
export { TalosDelta };
