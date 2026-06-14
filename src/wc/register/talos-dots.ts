/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-dots"` registers
 * ONLY <talos-dots> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosDots } from "../talos-dots";
import { define } from "../register";

define("talos-dots", TalosDots);
export { TalosDots };
