/**
 * <talos-toggle> — a segmented control where the SELECTION is state. A row of
 * mutually-exclusive options; the active segment is the current value of a live
 * setting (mode, range, channel), not a decorative tab. Changing it emits a
 * `talos:change` event and reflects `value`, so it both shows and drives state.
 *
 *   - POSITION   the lit segment IS the current value — read it to know the mode.
 *   - LIVE       set `value` (attribute or property) and the active segment
 *                follows; click a segment and `value` updates + `talos:change`
 *                fires. Two-way, like a real control.
 *   - HONEST     no motion carries meaning; the active segment is fully legible
 *                in a static frame (filled background + foreground text). Nothing
 *                to lose under reduced-motion.
 *
 * Options come from the `options` attribute (comma-separated) or, for label≠value
 * pairs, `value:Label` tokens — e.g. options="1h:1 Hour,1d:1 Day,1w:1 Week".
 *
 * Attributes:
 *   options      comma-separated list; each "value" or "value:Label"  (required)
 *   value        the selected option value            (default: first option)
 *   label        accessible group label               (optional)
 *
 * Property: el.value (string) — get/set; setting reflects to the attribute.
 * Event:    talos:change — detail = { value } — fired on user selection.
 */
interface ToggleOption {
    value: string;
    label: string;
}
declare class TalosToggle extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private group;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    get value(): string;
    set value(v: string);
    private parseOptions;
    /** User selection: update value + announce. No-op if unchanged. */
    private select;
    private render;
}

export { TalosToggle as T, type ToggleOption as a };
