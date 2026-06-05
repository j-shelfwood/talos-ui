# Talos UI — Design Philosophy

> This is the constitution. [`DESIGN.md`](./DESIGN.md) is the style guide — *how*
> Talos looks. This document is *why it exists and what it is for*. When the two
> ever seem to disagree, this one wins, and `DESIGN.md` gets corrected.

---

## The thesis

**The interface is an instrument, not a document.**

A document presents information that was true when it was authored. You *read*
it, top to bottom, and then you are done. The web inherited this from print —
the scrolling page, the A4/Letter column, the margins, the reading line — and
most "UI kits" are still, underneath the styling, decorated documents.

An instrument is different. It depicts a **live system** and lets you
**operate** it. A speedometer, an oscilloscope, a mixing console, a flight HUD,
a synth, a reactor panel — these earn their density because every glowing thing
is bound to something real and present. You don't read an instrument. You
*monitor* it and you *act* on it.

**Talos UI is the toolkit for building instruments.** Consoles, monitors,
control panels, dashboards that are actually dashes-of-board — not prettier
versions of document-shaped pages.

---

## The law (inviolable)

**Form encodes function.**

Every color, every motion, every glow, every shape is **bound to domain
state**. There is no purely decorative visual property. If a panel pulses,
something is happening at that rate. If an edge is green, that channel is
healthy. If a value is visually loud, it is large. If a line moves, something is
flowing.

Decoration that carries no information is **forbidden** — not because it is
ugly, but because it *lies*. It implies meaning where there is none, and that
trains the user to ignore your signals. The day a user learns that "the green
glow doesn't actually mean anything" is the day every green glow in the
interface stops working.

### The test every component must pass

> **Does this render meaning, or does it just look cool?**

If it renders meaning — ship it. If it just looks cool — bind it to something,
or cut it. There is no third answer. This test is applied to every prop, every
animation, every accent, in code review and in design.

---

## The five principles

### 1. Reject the page, embrace the panel
The document metaphor — a tall scrolling rectangle you consume linearly —
assumes content is finite, authored, and read once. Instruments are spatial,
not linear; monitored, not read. Prefer viewport-native **zones** over scrolling
columns. Persistent ambient context over page-by-page navigation. Update in
place over reflow. A cockpit does not scroll.

### 2. Form encodes function
The law, restated as a principle so it sits in the list where it belongs. It is
first among equals; the other four serve it.

### 3. Motion is telemetry, not transition
Most systems animate *between* states — fade in, slide over. Talos animates
*the state itself*. A scanline is not a loading flourish; it is a sweep showing
a process advancing. A flow line's speed *is* its throughput. Animation depicts
the live behavior of the system, which means **a frozen screenshot loses
information** that the moving interface carries. That is the correct test for
whether motion is doing its job.

### 4. Density is a feature, legibility is the discipline
Instruments are information-dense, and that is correct. But density without
hierarchy is noise. We earn density through ruthless typographic and chromatic
hierarchy (the HUD type voice, the surface ladder, the single accent — see
`DESIGN.md`). The goal: pack 10× the information of a "clean" SaaS dashboard
while being *more* legible, because every element is doing semantic work.

### 5. The system has a state, and it shows
An instrument is never neutral — it is always depicting *something*: idle,
scanning, nominal, degraded, alarmed. The ambient layer (the cursor-tracked
grid) hints at this already. Pushed further, the whole interface has a **mood**
driven by aggregate system health. The "doodads" — generative backgrounds,
lock/focus brackets, scanlines — are welcome **only** when bound to the law:
they must encode state, not merely dress the frame.

---

## The honesty clause

All of the above degrades honestly under `prefers-reduced-motion` and on
low-capability devices. When motion is removed, the **information the motion
carried must survive** in a static form — a number, a color band, a position.
We never let the meaning live *only* in the animation. Telemetry that vanishes
when motion is off was decoration wearing a function's coat.

---

## Positioning (the one-paragraph pitch)

> Talos UI is a component system for building **functional instruments** —
> dashboards, control panels, monitors, consoles — where color, motion, and
> form are bound to live domain state. It is the toolkit for interfaces that
> *visualize a running system*, not interfaces that *present a document*.

---

## What this means for the library

The center of gravity is the **data-binding primitive layer**: components that
take a *value* and render its *meaning* (gauges, trend lines, threshold meters,
flow lines, status fields where the color **is** the status), plus the
**non-document layouts** (the console shell) that show the alternative to the
A4 column. The chamfered-panel chrome and the gallery of cards are the *frame*
and the *reference* — necessary, but not the point. The point is the
instruments.

Every addition is measured against the thesis, the law, and the test above.
