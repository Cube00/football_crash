# `src/sdk` — the integration seam

This folder is a **placeholder for `@krash/sdk` + `@krash/react`**, which are not
installed yet. It exists so the skin can be written against the SDK's real API
today and switched over with a one-file change tomorrow.

## Switching it on

```bash
npm install @krash/sdk @krash/react sfs2x-api
```

Then:

1. `types.ts` → `export * from "@krash/sdk";`
2. `client.ts` → delete; `KrashClient` comes from the SDK.
3. `hooks.ts` → `export { … } from "@krash/react";`
4. `dom.ts` → delete; `export { useMediaQuery, useClickOutside } from "@krash/react";`
5. Mount `KrashProvider` in `main.tsx`.

No component, container or hook outside this folder should need editing.

## `dom.ts` is the one implemented file

`useMediaQuery` and `useClickOutside` read the browser, not the server. There is
no session behind them and nothing to fake, so they are written out rather than
stubbed — an inert version would break the mobile layout and stop popovers
closing, which is a bug dressed up as emptiness. They replaced the skin's own
`useWindowSize` / `BREAKPOINT` / `useOnClickOutside`.

## What must never appear here

A round loop, a crash-point draw, a multiplier curve, balance arithmetic, bet
acceptance, ticket accounting, auto-play stop conditions, or localStorage of any
game state. All of it is the SDK's, and all of it was deleted from this project
on purpose. A placeholder that starts computing is a second engine.

## Confirm before relying on

Shapes marked `UNDOCUMENTED` in `types.ts` are inferred from prose in the
integration docs rather than from a published type:

- `BetUpdatePayload` — the other-players broadcast
- `GameHistoryItem`, `MyHistoryRound` — the two history responses
- `GameConfig` — the `game-config` payload
