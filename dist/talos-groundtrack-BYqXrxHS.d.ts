/**
 * <talos-groundtrack> — an equirectangular world strip showing where a
 * constellation IS: sub-satellite points (the spot directly beneath each sat),
 * the sinusoidal ground tracks an inclined orbit traces, and ground-station
 * gateways that brighten when a satellite is in view. Position is bound to each
 * satellite's orbital state, so the map is a live instrument, not a backdrop —
 * watch the dots march west-to-east and the gateways light as the fleet passes
 * over (PHILOSOPHY.md — motion is telemetry; a frozen frame loses the pass).
 *
 * The projection is honest: on an equirectangular map an orbit of inclination i
 * traces lat = i·sin(longitude phase), a true sinusoid — so the tracks are the
 * real shape, drawn from the inclination, not decoration.
 *
 *   - SATS      `.sats` (imperative) — [{ lon, lat, band }], band 0|1|2
 *               (nominal|warning|critical) sets the dot colour.
 *   - GATEWAYS  `.gateways` (imperative) — [{ lon, lat, active }]; a gateway with
 *               `active` (a sat in view) brightens. Position is fixed (ground).
 *   - TRACKS    `inclination` draws faint reference ground-track sinusoids.
 *
 * Attributes (reactive):
 *   inclination   orbit inclination in degrees for the track lines (default 53)
 *   tracks        number of reference track sinusoids to draw       (default 6)
 *   label         accessible label                                  (optional)
 *
 * Coordinates: lon in [-180, 180], lat in [-90, 90].
 */
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
