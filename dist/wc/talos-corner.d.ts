import { S as Segment } from '../PanelShapeBuilder-AmPisDtF.js';

/**
 * <talos-corner edge="top-left" radius="16">
 * Declarative chamfer decorator. Pure data carrier — renders nothing itself;
 * its parent <talos-panel> reads toSegment() to build the outline.
 */
declare class TalosCorner extends HTMLElement {
    static get observedAttributes(): string[];
    attributeChangedCallback(): void;
    toSegment(): Segment | null;
}

export { TalosCorner };
