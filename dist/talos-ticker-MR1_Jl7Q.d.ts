interface TickerEvent {
    msg: string;
    level?: string;
    time?: string;
}
declare class TalosTicker extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private caption;
    private list;
    private buf;
    /** Whether the next render() should animate the top row in (a fresh push). */
    private animateNext;
    constructor();
    private observer?;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Append one event and scroll the window. Preferred entry for streams. */
    push(event: TickerEvent): void;
    /** Seed or replace the whole window at once (declarative-ish convenience). */
    set events(list: TickerEvent[]);
    get events(): TickerEvent[];
    private render;
}

export { TalosTicker as T, type TickerEvent as a };
