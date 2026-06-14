/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-percentile"` registers
 * ONLY <talos-percentile> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosPercentile } from "../talos-percentile";
import { define } from "../register";

define("talos-percentile", TalosPercentile);
export { TalosPercentile };
