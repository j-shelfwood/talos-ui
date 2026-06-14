interface OrbitalNode {
    id: string;
    ring: number;
    value: number;
    load: number;
    rate: number;
    label?: string;
}
declare class TalosOrbital extends HTMLElement {
    static get observedAttributes(): string[];
    private root;
    private svg;
    private gRings;
    private gArcs;
    private gNodes;
    private core;
    private state;
    private raf;
    private lastT;
    private observer?;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Set the live node set. Preserves orbit angle for nodes that persist. */
    set nodes(next: OrbitalNode[]);
    get nodes(): OrbitalNode[];
    private get sizePx();
    private get ringCount();
    private get cx();
    private get cy();
    private get coreR();
    /** Radius of ring r (1-based). */
    private ringRadius;
    private bandColor;
    /** Draw the static frame: rings, axes, core. */
    private layout;
    /** Position + style nodes and their flow arcs from current state. */
    private renderNodes;
    /** Persistent rAF: advance each node's orbit by its rate, then re-render.
     *  (The proven reactivity pattern — one loop, reads live state, no per-change
     *  scheduling to starve.) */
    private startLoop;
    /** Force a re-render (e.g. after mutating node fields in place). */
    update(): void;
}

export { type OrbitalNode as O, TalosOrbital as T };
