/**
 * Single-component entry: `import "@j_shelfwood/talos-ui/wc/talos-trend"` registers
 * ONLY <talos-trend> (and re-exports its class), so a consumer using one instrument
 * doesn't pull the whole barrel. Idempotent with the barrel.
 */
import { TalosTrend } from "../talos-trend";
import { define } from "../register";

define("talos-trend", TalosTrend);
export { TalosTrend };
