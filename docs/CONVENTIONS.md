# Conventions

How to write code that looks like the code already here.

---

## Component anatomy

Every component is a folder, and the folder is always shaped the same way:

```
components/ui/BetButton/
├── BetButton.tsx            # the component
├── BetButton.module.css     # its styles, co-located
├── BetButton.types.ts       # props interface (+ any shapes it owns)
├── BetButton.constants.ts   # variants, defaults, static data (optional)
└── index.ts                 # re-export; nothing else imports the files directly
```

Where things go:

| Folder                | Holds                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| `components/ui/`      | presentational building blocks — no game imports beyond sounds/tokens  |
| `components/layout/`  | the page shell: header, footer, the layout grid                        |
| `containers/`         | composed regions that know about state (`GameStage`, `InfoSection`, …)  |
| `context/`            | providers — modals, the game boot                                      |
| `hooks/`              | reusable hooks and store selectors                                     |
| `game/`               | everything non-React: engine, stores, events, Phaser, sounds           |

Imports use the `@/` alias for anything outside the current folder
(`@/utils`, `@/game/enums`), and relative paths for siblings (`../Icon`).

---

## Styling

CSS Modules with BEM class names, always accessed by bracket lookup:

```tsx
import { cx } from "@/utils";
import styles from "./BetArea.module.css";

<div className={cx(styles["bet-area"], freeBet && styles["bet-area--freebet"], className)}>
  <div className={styles["bet-area__top"]}>…</div>
</div>
```

- `block`, `block__element`, `block--modifier` — no other shapes.
- `cx()` from `@/utils` joins conditionals; a falsy entry drops out.
- Every component accepts `className` and merges it last, so a parent can
  position it without reaching inside.

### Tokens over literals

Sizes, radii, colours and fonts come from `src/styles/design-tokens.css`:

```css
padding: var(--size-16);
border-radius: var(--radius-24);
background: var(--color-btn-green);
font-family: var(--font-family-base);
```

A literal in a component stylesheet is a signal the token is missing — add it to
the token file rather than hardcoding. Gradients live as
`--linear-gradient-*-primary` / `-reverse` pairs, because a gradient can't be
transitioned: the hover state is a second element faded in over the first
(see `BetButton.module.css`).

---

## TypeScript

`erasableSyntaxOnly` is on, so **no runtime `enum`**. The project pairs an
`as const` object with a union type of the same name:

```ts
export const BetState = {
  Idle: "idle",
  Placed: "placed",
} as const;

export type BetState = (typeof BetState)[keyof typeof BetState];
```

Also on: `noUnusedLocals`, `noUnusedParameters`,
`noFallthroughCasesInSwitch`, `verbatimModuleSyntax` (type-only imports must say
`import type`).

---

## State

Game state is the SDK's, read through its hooks and imported from one place:

```ts
import { usePhase, useMultiplier, useBetting, BetSlot } from "@/sdk";

const phase = usePhase();                          // re-renders on phase changes
const multiplier = useMultiplier();                // ~10×/sec in FLYING
const { slotState, placeBet } = useBetting(BetSlot.Slot1);
```

Two rules follow from how those hooks subscribe:

- **Take the narrowest hook that answers the question.** `useMultiplier()` in a
  layout component re-renders the subtree ten times a second; put it in the leaf
  that draws the number.
- **Writes go through the same hooks** (`placeBet`, `cashout`, `cancelBet`,
  `setBetAmount`) — a component never derives game state and never keeps its own
  copy of it. For the canvas and the sound layer, use `client.on(...)` instead,
  so Phaser never takes part in a React render.

Skin state — modals, the open menu, a tab — stays local or in `context/`.

**The React Compiler is enabled**, so components are auto-memoised. Two habits
matter because of it:

- Never write a ref during render. Sync refs in an effect — see the
  `amountRef` / `autoCashoutRef` block in `BetArea.tsx`.
- Don't hand-roll `useMemo`/`useCallback` for cheap values; do keep them where a
  stable identity is part of the contract (effect deps, store subscriptions).

---

## Persistence

The skin persists nothing. Bet amounts, the single/double layout, the auto-play
config and the three menu settings are all stored by the SDK, keyed by user and
game (or by session token, for the settings). `.claude/sdk-docs/02-configuration.md`
lists every key it writes and, just as usefully, what it writes but never reads
back: pending bets and active bets are not restored after a reload.

Runtime state is deliberately never persisted anywhere — no active bets, no
"auto-play is running" flag, no bound free bet. A reload returns you to a clean
table with your preferences intact, and the server re-states the rest.

---

## Copy and i18n

All user-facing strings go through i18next, in one `translation` namespace
grouped by area (`bet.*`, `modals.*`, `freeBets.*`, `a11y.*`):

```tsx
const { t } = useTranslation();
<span>{t("bet.cashOut")}</span>
```

For a sentence with a bolded fragment, use `Trans` rather than splitting the
string — a translator needs the whole sentence:

```tsx
// en.json:  "step2": "You can place <b>up to two independent bets</b> per round"
<Trans i18nKey="howToPlay.placingBets.step2" components={{ b: <b /> }} />
```

Rules of thumb:

- Add every key to **both** `en.json` and `ka.json`. A missing key falls back to
  English, which hides the gap.
- `TranslationKey` is a plain `string` alias, not i18next's `ParseKeys` — see the
  comment in `i18n/types.ts` for the TypeScript-version reason, and the
  conditions for tightening it.
- Static lists carry translation *keys*, not translated text; the component
  translates at render (`MENU_ITEMS`, `INFO_TABS`, `HOW_TO_PLAY_SECTIONS`).

---

## Sound

Interactive controls make noise. `playSound` reads the menu setting itself, so
there is nothing to thread down:

```tsx
import { playSound, Sound } from "@/game/sounds";

onClick={(event) => {
  playSound(Sound.SmallButton);
  onClick?.(event);
}}
```

`Sound.SmallButton` for anything small (steppers, toggles, chips, menu rows);
`Bet` / `Cashout` / `Cancel` are mapped per variant inside `BetButton`.

---

## Accessibility

The patterns already in place, worth keeping:

- Icon-only buttons carry an `aria-label` from a translation key.
- `Radio` and `Toggle` wrap real inputs — the whole row is a `<label>`, so the
  label text is clickable and the control is keyboard-reachable.
- Modals trap focus, close on Escape, lock body scroll and are labelled by their
  heading.
- Live regions where something appears unprompted: the win notice is
  `role="status" aria-live="polite"`.
- Expanders pair `aria-expanded` with `aria-controls`.
- Keep a visible `:focus-visible` state on anything custom-styled.

---

## Before you push

```bash
npx tsc --noEmit   # types
npm run lint       # eslint
npm run build      # tsc -b + vite build
```

There is no test runner in the project. For logic that isn't obvious from
reading — engine settlement, store folding — the cheapest check is a scratch
script that imports the module and asserts against it; the game layer has no
React or DOM dependencies apart from `localStorage` and `requestAnimationFrame`.
