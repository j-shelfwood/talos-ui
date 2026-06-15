interface GroundSat {
    lon: number;
    lat: number;
    band: number;
}
interface Gateway {
    lon: number;
    lat: number;
    active?: boolean;
}
declare class TalosGroundtrack extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private canvas;
    private ctx;
    private _sats;
    private _gateways;
    private ro?;
    private raf;
    constructor();
    set sats(v: GroundSat[]);
    get sats(): GroundSat[];
    set gateways(v: Gateway[]);
    get gateways(): Gateway[];
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private schedule;
    private colour;
    /** Map lon/lat → canvas px (equirectangular). */
    private project;
    private draw;
}

export { type Gateway as G, TalosGroundtrack as T, type GroundSat as a };
