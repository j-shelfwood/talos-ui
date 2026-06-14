import { S as Segment } from '../PanelShapeBuilder-AmPisDtF.js';

/**
 * <talos-notch edge="top" width="60" depth="20">
 * Declarative edge cut-out. Pure data carrier — its parent <talos-panel>
 * reads toSegment() to build the outline.
 */
declare class TalosNotch extends HTMLElement {
    static get observedAttributes(): string[];
    attributeChangedCallback(): void;
    toSegment(): Segment | null;
}

export { TalosNotch };
