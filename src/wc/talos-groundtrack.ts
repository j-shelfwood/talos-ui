import { num } from "./bands";

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
export interface GroundSat {
  lon: number;
  lat: number;
  band: number; // 0 nominal | 1 warning | 2 critical
}
export interface Gateway {
  lon: number;
  lat: number;
  active?: boolean;
}

export class TalosGroundtrack extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["inclination", "tracks", "label"];
  }

  private root: ShadowRoot;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private _sats: GroundSat[] = [];
  private _gateways: Gateway[] = [];
  private ro?: ResizeObserver;
  private raf = 0;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = /* html */ `
      <style>
        :host {
          --_nominal: var(--talos-success, hsl(140 90% 60%));
          --_warning: var(--talos-warning, hsl(38 92% 60%));
          --_critical: var(--talos-danger, hsl(0 80% 62%));
          --_grid: var(--talos-edge-subtle, hsl(0 0% 100% / 0.08));
          --_track: var(--talos-edge-default, hsl(0 0% 100% / 0.14));
          --_gateway: var(--talos-muted-foreground, hsl(0 0% 60%));
          --_fg: var(--talos-foreground, #e7e9ec);
          display: block;
          width: 100%;
          line-height: 0;
        }
        canvas { display: block; width: 100%; height: 100%; }
      </style>
      <canvas part="canvas"></canvas>`;
    this.canvas = this.root.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d")!;
  }

  set sats(v: GroundSat[]) {
    this._sats = v;
    this.schedule();
  }
  get sats(): GroundSat[] {
    return this._sats;
  }
  set gateways(v: Gateway[]) {
    this._gateways = v;
    this.schedule();
  }
  get gateways(): Gateway[] {
    return this._gateways;
  }

  connectedCallback(): void {
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(this);
    this.draw();
  }
  disconnectedCallback(): void {
    this.ro?.disconnect();
    cancelAnimationFrame(this.raf);
  }
  attributeChangedCallback(): void {
    this.schedule();
  }

  private schedule(): void {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.draw());
  }

  private colour(varName: string): string {
    return getComputedStyle(this).getPropertyValue(varName).trim() || "#888";
  }

  /** Map lon/lat → canvas px (equirectangular). */
  private project(lon: number, lat: number, w: number, h: number): [number, number] {
    const x = ((lon + 180) / 360) * w;
    const y = ((90 - lat) / 180) * h;
    return [x, y];
  }

  private draw(): void {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const w = this.clientWidth || 1;
    // 2:1 equirectangular aspect.
    const h = w / 2;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.height = `${h}px`;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const grid = this.colour("--_grid");
    const track = this.colour("--_track");
    const gw = this.colour("--_gateway");
    const fg = this.colour("--_fg");
    const cols = [this.colour("--_nominal"), this.colour("--_warning"), this.colour("--_critical")];

    // Graticule: meridians every 30°, parallels every 30°.
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = this.project(lon, 0, w, h);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = this.project(0, lat, w, h);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    // Equator a touch stronger.
    ctx.strokeStyle = track;
    ctx.beginPath();
    const [, eqY] = this.project(0, 0, w, h);
    ctx.moveTo(0, eqY);
    ctx.lineTo(w, eqY);
    ctx.stroke();

    // Reference ground-track sinusoids: lat = incl·sin(lon-phase). This is the
    // genuine shape an inclined orbit traces on an equirectangular projection.
    const incl = num(this, "inclination", 53);
    const nTracks = Math.max(0, Math.round(num(this, "tracks", 6)));
    ctx.strokeStyle = track;
    ctx.lineWidth = 1;
    for (let t = 0; t < nTracks; t++) {
      const phase = (t / nTracks) * Math.PI * 2;
      ctx.beginPath();
      for (let px = 0; px <= w; px += 2) {
        const lon = (px / w) * 360 - 180;
        const lat = incl * Math.sin((lon * Math.PI) / 180 + phase);
        const [, y] = this.project(lon, lat, w, h);
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    }

    // Gateways — small squares; active (sat in view) brightens to fg.
    for (const g of this._gateways) {
      const [x, y] = this.project(g.lon, g.lat, w, h);
      ctx.fillStyle = g.active ? fg : gw;
      ctx.globalAlpha = g.active ? 1 : 0.5;
      ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      if (g.active) {
        ctx.strokeStyle = fg;
        ctx.globalAlpha = 0.4;
        ctx.strokeRect(x - 4.5, y - 4.5, 9, 9);
      }
    }
    ctx.globalAlpha = 1;

    // Satellites — sub-satellite dots coloured by band.
    for (const s of this._sats) {
      const [x, y] = this.project(s.lon, s.lat, w, h);
      ctx.fillStyle = cols[Math.max(0, Math.min(2, s.band | 0))];
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    this.setAttribute("role", "img");
    const lbl = this.getAttribute("label");
    const active = this._gateways.filter((g) => g.active).length;
    this.setAttribute(
      "aria-label",
      `${lbl ? lbl + ": " : ""}${this._sats.length} satellites, ${active} of ${this._gateways.length} gateways in view`,
    );
  }
}
