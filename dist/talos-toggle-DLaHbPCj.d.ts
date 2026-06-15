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
    private focusValue;
    private onKeydown;
    /** User selection: update value + announce. No-op if unchanged. */
    private select;
    private render;
}

export { TalosToggle as T, type ToggleOption as a };
