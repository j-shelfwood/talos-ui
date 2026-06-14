declare class TalosDelta extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private text;
    private prev;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, val: string | null): void;
    /** Imperative equivalent of setting `value`. */
    update(value: number): void;
    private render;
    private setArrow;
}

export { TalosDelta };
