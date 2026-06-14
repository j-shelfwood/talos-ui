declare class TalosFlow extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private base;
    private dash;
    private chevrons;
    private raf;
    private offset;
    private last;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private band;
    private pathD;
    private render;
    private renderChevrons;
    private tick;
}

export { TalosFlow };
