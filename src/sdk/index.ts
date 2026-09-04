/**
 * The single seam between this skin and the Krash SDK.
 *
 * Everything in the app imports game state, betting, auto-play, free bets,
 * settings, device and currency from `@/sdk` and nowhere else. Today the four
 * modules behind this barrel are placeholders (the SDK packages live on a
 * private registry — `.claude/sdk-docs/00-access.md`); when they are installed,
 * each module becomes a re-export from `@krash/sdk` / `@krash/react` and no
 * consumer changes.
 *
 * Rules for this folder:
 *   1. Shapes and constants only — no round loop, no RNG, no balance maths.
 *      `dom.ts` and `contexts.tsx` are the exceptions and say why in their own
 *      headers: browser and URL state has no server behind it to fake, so it is
 *      implemented.
 *   2. Signatures must match the SDK's exactly. A convenient deviation here is
 *      a rewrite of every call site later.
 *   3. Every shape is transcribed from `.claude/sdk-docs/`, chiefly
 *      `07-events.md` and `06-hooks-reference.md`. If the docs do not specify
 *      it, it does not go in.
 */
export * from "./types";
export * from "./client";
export * from "./hooks";
export * from "./contexts";
export * from "./dom";
