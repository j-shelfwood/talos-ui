declare class TalosStatus extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private wordEl;
    private countsEl;
    private labelEl;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private render;
}

export { TalosStatus };
