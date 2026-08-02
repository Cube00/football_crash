# UI systems

The three things that cut across components: modals, stacking order, and
responsive behaviour.

---

## Modals

Every dialog in the app is the same `Modal` shell with different content. One
provider owns which one is open; components ask for it by id.

### Opening one

```tsx
import { useModal, ModalId } from "@/context/ModalProvider";

const { open, close } = useModal();
open(ModalId.Limits);
```

`ModalRoot` maps the active id to its content component and reads the rest of
its configuration from `context/ModalProvider/modals.constants.ts`:

| Table                 | What it controls                                                       |
| --------------------- | ---------------------------------------------------------------------- |
| `MODAL_TITLE_KEYS`    | the heading, as a translation key                                       |
| `MODAL_WIDTHS`        | max width — `Sm 370`, `Md 542`, `Lg 580`, `Xl 768`, `Xxl 1006`          |
| `MOBILE_SHEET_MODALS` | which ones dock to the bottom edge as a full-width sheet under 768 px   |
| `MODAL_PARENTS`       | which ones show a back arrow, and where back goes                       |

### What the shell gives you

`Modal` portals to `document.body`, so it never inherits a stacking context from
whatever opened it. It also traps focus, closes on Escape and on backdrop click,
locks body scroll while open, and labels itself from the heading. Content
components render plain markup and assume none of that.

### Adding one

1. Add an id to `ModalId`.
2. Add its title key to `MODAL_TITLE_KEYS` (and the string to both locales).
3. Add a width to `MODAL_WIDTHS`; add to `MOBILE_SHEET_MODALS` if it should dock
   on phones.
4. Build `components/ui/YourContent/` like any other component.
5. Add the `case` in `ModalRoot`.

Without step 5 the modal still opens — it just shows the "coming soon"
placeholder, which is what the unimplemented ids do today.

---

## Stacking order

Everything that overlaps is on one deliberate scale. The numbers are few on
purpose; adding a new one is usually a mistake.

| Layer                          | z-index | Where                          |
| ------------------------------ | ------: | ------------------------------ |
| Modals (portal, `position: fixed`) |   10000 | `Modal.module.css`             |
| Header + its dropdown menu     |      30 | `HeaderSection.module.css`     |
| Multiplier strip (open or not) |      20 | `Multiplier.module.css`        |
| Game stage internals           |     1–3 | `GameStage.module.css`         |
| Everything else                |    auto | —                              |

Two rules keep it working:

- **The stage owns a private scale.** `.game-stage` sets `isolation: isolate`,
  so its children (HUD `1`, free-bet button `2`, win notice `3`) order against
  each other and never compete with the header or the strip. Layers inside a
  component should stay inside a stacking context like this.
- **The strip stays under the header.** The menu hangs down across the strip, so
  the strip's `20` must stay below the header's `30` — including in the touch
  media query, where an earlier `9999` put the pills over the open menu.

---

## Responsive behaviour

### Page breakpoints

| Width      | What changes                                                                    |
| ---------- | ------------------------------------------------------------------------------- |
| ≤ 1439 px  | the page gains 8 px side padding                                                |
| ≤ 1279 px  | bet-area internals tighten (`BetArea.module.css`)                               |
| ≤ 1023 px  | one column: game first, bets list under it at `min(560px, 70vh)`; page scrolls   |
| ≤ 767 px   | modals in `MOBILE_SHEET_MODALS` dock to the bottom, full width, 12 px padding    |

Above 1024 px the info panel is a left sidebar sized
`clamp(360px, 29vw, 410px)` — 410 px at 1440 wide, easing to a 360 px floor.

> **Known drift:** the doc comment on `Layout.tsx` says the panel is *hidden*
> between 1024 and 1279. The CSS doesn't do that today — it stays visible at its
> 360 px floor. Fix one or the other before trusting either.

### Container queries

Two regions size themselves against their own width rather than the viewport's,
which is what lets the same bet area work in a sidebar and full-bleed:

- `game` (`GameScreen`) — under 860 px the two bet areas stack vertically.
- `bet-area` (`BetArea`) — under 360 px the toggle row tightens and the
  multiplier stepper goes full width.

Prefer a container query when a component can appear at more than one width.
Reach for a media query only for genuinely page-level decisions.

### The canvas

The stage is not laid out in CSS pixels — see
[ARCHITECTURE.md](ARCHITECTURE.md#the-canvas). A `ResizeObserver` drives the
canvas size in device pixels; the scene lays itself out as fractions of
`scale.width/height`, so it needs no breakpoints of its own.
