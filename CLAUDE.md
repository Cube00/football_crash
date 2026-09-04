# Football Crash — working notes

A crash-game **skin**. React 19 + TypeScript + Vite, Phaser/Spine canvas, CSS
Modules + BEM. It renders a game whose rules, money and round loop belong to the
**Krash SDK** (`@krash/sdk` + `@krash/react`).

## The SDK documentation lives in this repo

`.claude/sdk-docs/` — the full integration documentation, converted to Markdown.
Start at [`.claude/sdk-docs/README.md`](.claude/sdk-docs/README.md) for the index.

**Read the relevant chapter before writing game logic.** The `panels/` chapters
each end with a "SDK vs UI policy (skin responsibility)" split — that split is
the answer to "should this code exist here at all?", and it is not guessable.

The chapters that settle most questions:

- `06-hooks-reference.md` — every hook, its exact return shape, its re-render trigger
- `07-events.md` — all 30 events with verbatim payload interfaces
- `04-betting.md` — the full button-variant decision table
- `11-freerounds.md` + `panels/09-freebet.md` — what the SDK will **not** do for free bets
- `12-contexts.md` — the five optional providers (Device, Settings, Currency, GameConfig, Language)

## The seam: `src/sdk/`

The SDK packages are **not installed** — they live on a private registry that
needs a deploy token (`.claude/sdk-docs/00-access.md`). Until they are,
`src/sdk/` mirrors their public API:

| File | What it is | On install |
| --- | --- | --- |
| `types.ts` | every type/enum, transcribed from the docs | `export * from "@krash/sdk"` |
| `client.ts` | the `KrashClient` surface the skin uses | delete — the real client comes from the SDK |
| `hooks.ts` | the hooks, returning inert values | `export { … } from "@krash/react"` |
| `contexts.tsx` | Device/Settings/Currency/Language providers | `export { … } from "@krash/react"` |
| `dom.ts` | `useMediaQuery`, `useClickOutside` | delete — both are in `@krash/react` |

Rules for that folder:

1. **Everything imports game state from `@/sdk` and nowhere else.** One barrel,
   one swap.
2. **Signatures must match the documented ones exactly.** A convenient deviation
   here is a rewrite of every call site later.
3. `hooks.ts` and `client.ts` stay inert — they stand for *server* state and
   faking it would be a second engine. `contexts.tsx` and `dom.ts` are
   implemented, because they read the browser and have no session behind them.

## What is the SDK's, and must never be reimplemented here

Round loop and phases · the crash draw · the multiplier · balance arithmetic ·
bet acceptance, cancel, cashout · button variant (`computeButtonVariant`) ·
auto-play (rounds, stop conditions, server-side auto-cashout) · free-round
grants and their accounting · bet/round history · connection, reconnect,
keep-alive · persistence of bet amount, layout and auto-play config ·
sound/music/animation *preferences* (`SettingsProvider`) · device detection ·
display currency · language state and `?lang` sync.

## What is genuinely the skin's

Layout, styling and animation · the Phaser scene and the EventBus that feeds it
· sound playback itself · modals, popups, focus trap, scroll lock, Escape ·
clamping bet amounts to `minBet`/`maxBet` and to a range grant's bounds ·
gating cashout below a grant's `minCashout` · the free-bet slot lock · the
countdown bar (the SDK ships `tick.remainingMs`, not a hook) · the live bets
feed (`bet-update` is an event, not a store slice) · the crash-history strip
merging `crash-history-item` into `game-history` · the win-notice dismissal
timer · statistics buckets and percentages.

## Conventions

See `docs/CONVENTIONS.md`. In short: one folder per component
(`Name.tsx` / `Name.module.css` / `Name.types.ts` / `index.ts`), CSS Modules
with BEM accessed as `styles["block__element--modifier"]`, `cx()` for
conditionals, design tokens over literals, `@/` alias for anything outside the
current folder.

## Commands

```bash
npm run dev      # vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint
```
