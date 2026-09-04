# `src/sdk` — the integration seam

This folder is a **placeholder for `@krash/sdk` + `@krash/react`**, which are not
installed yet — they live on a private registry that needs a deploy token
(`.claude/sdk-docs/00-access.md`). It exists so the skin can be written against
the SDK's real API today and switched over with a one-file change tomorrow.

## Switching it on

```bash
npm install @krash/sdk @krash/react sfs2x-api
```

Then:

1. `types.ts` → `export * from "@krash/sdk";`
2. `client.ts` → delete; `KrashClient` comes from the SDK.
3. `hooks.ts` → `export { … } from "@krash/react";`
4. `contexts.tsx` → delete; `export { DeviceProvider, useDevice, SettingsProvider,
   useSettings, CurrencyProvider, useCurrency, LanguageProvider, useLanguage,
   detectPlatform } from "@krash/react";`
5. `dom.ts` → delete; `export { useMediaQuery, useClickOutside } from "@krash/react";`
6. Mount `KrashProvider` outermost in `main.tsx` — the provider stack below it
   is already in the documented order.

No component, container or hook outside this folder should need editing.

## Two kinds of file here

**Inert** — `hooks.ts`, `client.ts`. They stand for *server* state: balance,
phase, slots, grants, history. There is no server in this build and nothing in
the skin may pretend otherwise, so they return frozen empties and no-ops.

**Implemented** — `contexts.tsx`, `dom.ts`. A media query, an outside click, the
device class, the settings toggles, the display currency, the language code: all
of it is read from the browser and the URL, with no session behind it. An inert
version would not be honest emptiness — it would break the mobile layout, stop
popovers closing and take the settings menu off the air. These files reproduce
the *documented* behaviour, including the surprising parts (runtime device
detect beats the `?platform` hint; settings persist only once a session token
exists; `?extraParams` beats storage; `?lang=en` deletes the parameter).

## The one deliberate deviation

`SettingsProvider`'s `music` default is `false`; the package's is `true`. The
skin's ambient bed should not start unasked on every launch. Everything else in
this folder reproduces the documented behaviour exactly.

When the packages go in, that default comes back as `true` — the equivalent is
`?extraParams={"music":false}` on the launch URL, which the operator controls
and which overrides the stored value. Settle it with the integration team; do
not wrap `SettingsProvider` in a local default.

## What must never appear here

A round loop, a crash-point draw, a multiplier curve, balance arithmetic, bet
acceptance, ticket accounting, auto-play stop conditions, or persistence of any
game state. All of it is the SDK's, and all of it was deleted from this project
on purpose. A placeholder that starts computing is a second engine.

## Provenance

Every shape is transcribed from the integration documentation in
`.claude/sdk-docs/` — mainly `07-events.md` (payload interfaces, given verbatim
there), `06-hooks-reference.md` (`GameConfig`, `ClientConfig`, hook returns) and
`12-contexts.md`. Nothing here is inferred any more; if a field is not in those
files, it is not in this folder.

The string *values* of enums the docs name but do not spell (`BetButtonVariant`,
for one) are the skin's own. They are compared, never serialised, so a different
spelling in the package costs nothing.
