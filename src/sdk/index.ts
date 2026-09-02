/**
 * The single seam between this skin and the Krash SDK.
 *
 * Everything in the app imports game state, betting, auto-play and free bets
 * from `@/sdk` and nowhere else. Today the three modules behind this barrel are
 * placeholders (the SDK packages are not installed); when they are, each module
 * becomes a re-export from `@krash/sdk` / `@krash/react` and no consumer changes.
 *
 * Rules for this folder:
 *   1. Shapes and constants only — no round loop, no RNG, no balance maths.
 *      `dom.ts` is the one exception and says why in its own header: browser
 *      utilities have no server state to fake, so they are implemented.
 *   2. Signatures must match the SDK's exactly. A convenient deviation here is
 *      a rewrite of every call site later.
 *   3. Anything the integration docs do not specify is marked `UNDOCUMENTED`
 *      and must be confirmed against the real package.
 */
export * from "./types";
export * from "./client";
export * from "./hooks";
export * from "./dom";
