declare class TalosSheen extends HTMLElement {
    static get observedAttributes(): string[];
    private onMove;
    private onLeave;
    private bound;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private get sel();
    private bind;
    private unbind;
    /** Resolve the panel under the pointer and write the sheen custom props on it. */
    private track;
    private lit;
    private dim;
    private clear;
}

export { TalosSheen };
