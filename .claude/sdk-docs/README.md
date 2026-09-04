# Krash SDK — integration documentation (local copy)

Converted from the HTML export of <https://krash-sdk-docs.playcore.live/en/>
(snapshot taken 2026-09-03). Each file keeps its source URL in an HTML comment
on line 1. Two series: the numbered chapters describe the packages, the
`panels/` chapters describe one screen area each and say, per area, **what the
SDK does** and **what is skin responsibility**.

Read the panel chapter before touching the matching component — it is the file
that tells you whether a piece of logic belongs here at all.

## Chapters

| File | What it settles |
| --- | --- |
| `00-access.md` | registry, `.env`, demo vs real session, starter project |
| `01-getting-started.md` | provider stack, launch sequence, loader gate, first bet |
| `02-configuration.md` | `KrashConfig`, debug, localStorage keys, `GameConfig`/`ClientConfig` |
| `03-game-phases.md` | the four phases, `tick`, `remainingMs`, freeze detector |
| `04-betting.md` | `SlotSnapshot`, the full button-variant table, pending bets, recovery |
| `05-autoplay.md` | `AutoPlayEngine`, stop reasons, server-side auto-cashout, persistence |
| `06-hooks-reference.md` | all 28 hooks, their return shapes and re-render triggers |
| `07-events.md` | the 30 events, payload interfaces verbatim, ordering diagrams |
| `08-store.md` | `KrashStore`, slices, subscription granularity |
| `09-advanced.md` | storage adapters, demo relaunch, testing |
| `10-examples.md` | end-to-end snippets |
| `11-freerounds.md` | grants, bind/unbind, deferred close-out, what the SDK will *not* do |
| `12-contexts.md` | `Device` / `Settings` / `Currency` / `GameConfig` / `Language` providers |
| `13-connection-and-protocol.md` | SmartFox connect, reconnect, keep-alive |
| `14-reference-implementation.md` | how the reference skin is put together |
| `15-integration-checklist.md` | the checklist to run before shipping |
| `16-krashclient-api.md` | vanilla `KrashClient` API |
| `17-wire-protocol.md` | wire field names, snake_case → camelCase |

## Panels

| File | Screen area |
| --- | --- |
| `panels/01-loader-and-launch.md` | loader gate + launch error screen |
| `panels/02-header-and-balance.md` | header, balance, currency + `currencyMinorUnits` |
| `panels/03-multiplier-and-countdown.md` | multiplier readout, pre-round countdown |
| `panels/04-multiplier-history-strip.md` | crash history strip |
| `panels/05-betting-panel.md` | amount input, presets, clamps |
| `panels/06-bet-button.md` | the primary button, variant → label mapping |
| `panels/07-autoplay-panel.md` | rounds, stop conditions, auto-cashout |
| `panels/08-double-slot.md` | `BetLayout`, two slots |
| `panels/09-freebet.md` | freebet mode of the betting panel |
| `panels/10-my-bets.md` | the player's own history |
| `panels/11-live-bets-feed.md` | other players' bets (`bet-update`) |
| `panels/12-statistics.md` | pill grid + distribution chart |
| `panels/13-round-info-and-provably-fair.md` | round details, hash/seed, Limits copy |
| `panels/14-settings-sound-animation.md` | sound / music / animation toggles |
| `panels/15-connection-and-network.md` | connection overlay, reconnect UX |
| `panels/16-phaser-eventbus-bridge.md` | canvas layer, SDK → EventBus relay |
| `panels/17-mobile-popups-and-keyboard.md` | device detect, popups, custom keyboard |

## Refreshing this copy

The source was a "save page as" export of the docs site. To regenerate after a
docs update, re-export and re-run the converter recorded in the session that
created these files (stdlib-only HTML → Markdown, keeps the `md-content__inner`
article and drops the site chrome).
