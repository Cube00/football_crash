<!-- source: https://krash-sdk-docs.playcore.live/en/00-access/ -->

# 0. Access, installation and the starter project

This chapter covers everything you need before writing code: access to the npm registry, backend addresses, obtaining a test session, and a runnable starter project. Values shown as `<...>` are provided to you by the Krash team.

## What you receive

| What | Where | Format |
| `@krash/sdk`, `@krash/react` | private npm registry (GitLab Package Registry) | npm packages, ES modules + `.d.ts` + source maps |
| Documentation | this site | 17 chapters + 17 UI panels, in Georgian and English; `llms-full.txt` for AI assistants |
| Starter project | downloads/minimal-skin.zip | Vite + React + TypeScript, every panel in minimal form, runs on demo out of the box |
| Backend access | from the Krash team | `apiBaseUrl`, `sfsHost`, `gameId`, test tokens |

## 1. npm registry

The packages live on Krash's private registry. Create `.npmrc` in your project root:
```
@krash:registry=https://gitlab.xcoder.ge/api/v4/projects/280/packages/npm/
//gitlab.xcoder.ge/api/v4/projects/280/packages/npm/:_authToken=<DEPLOY_TOKEN>

```

`<DEPLOY_TOKEN>` is a GitLab deploy token with the `read_package_registry` scope, issued by the Krash team. Do **not** commit `.npmrc` (add `**/.npmrc` to `.gitignore`); in CI, inject the token from the environment:
```
# CI
echo "//gitlab.xcoder.ge/api/v4/projects/280/packages/npm/:_authToken=${KRASH_NPM_TOKEN}" >> .npmrc

```

Then:
```
pnpm add @krash/sdk @krash/react sfs2x-api

```

`sfs2x-api` comes from the public npm registry and is a peer dependency — the SDK does not import it itself; you pass it to `KrashProvider` via the `sfs2xModule` prop (see 01).

Versions: `@krash/sdk` and `@krash/react` must be upgraded together — the `@krash/react` peer dependency requires the exact major/minor of `@krash/sdk`.

## 2. Backend addresses

| Parameter | Where | Value |
| `VITE_API_BASE_URL` | `.env` | `https://<api-host>` — REST API (`/seamless/session/exchange`, `/seamless/launch/demo`, `/seamless/session/recovery/bets`) |
| `VITE_SFS_HOST` | `.env` | `<sfs-host>` — SmartFox WebSocket host (port 443, SSL, zone default `BasicExamples`) |
| `VITE_GAME_ID` | `.env` | `<your-game-id>` — your game ID, agreed with the backend |

Staging and production addresses differ; obtain both from the Krash team. The SDK's default `gameId` is a legacy value — **always** pass your own.

## 3. Test session

There are two ways:

**Demo mode** — no token needed. Open:
```
http://localhost:5173/?mode=demo&gid=<your-game-id>

```

The SDK requests a demo session itself (`GET /seamless/launch/demo`). The demo balance is virtual; every feature (bets, cashout, autoplay, free bets if enabled on the backend) works exactly as in a real session.

**Real session** — the lobby issues a one-shot token:
```
http://localhost:5173/?t=<one-shot-token>&gid=<your-game-id>&lang=en&currency=USD&platform=desktop&lobbyUrl=<url>&exitUrl=<url>

```

The token is single-use and the SDK exchanges it for a session token (`POST /seamless/session/exchange`). For testing, tokens are generated from the Krash team's test lobby — request the address and test accounts. On refresh the SDK reuses the stored session for the same token, so you can reload several times with one token.

To test free bets, a grant must be credited to your test account on the backend — the Krash team does this as well.

## 4. Starter project

minimal-skin.zip — a complete, runnable Vite + React + TypeScript application that demonstrates every SDK capability with minimal code: loader gate, header/balance, multiplier + countdown, history strip, two betting panels with every button variant, autoplay, free bets (list, bind, completed modal), my bets, live bets, connection overlay, sound toggle.
```
unzip minimal-skin.zip && cd minimal-skin
# .npmrc — see §1
cp .env.example .env        # fill in VITE_API_BASE_URL, VITE_SFS_HOST, VITE_GAME_ID
pnpm install
pnpm dev
# http://localhost:5173/?mode=demo&gid=<your-game-id>

```

The starter's `package.json` pins `@krash/sdk` and `@krash/react` to published versions. Each panel is a separate file in `src/panels/` and corresponds to a panels/ chapter — replace them with your own design one by one.

## 5. Working with an AI assistant

The documentation as a single file: `llms-full.txt` (English) / `ka/llms-full.txt` (Georgian). Drop it into Cursor, Claude or any other assistant as context together with the starter code. The package's `.d.ts` files in `node_modules/@krash/*` are the assistant's source of types.

## What you will not find in this documentation

- **Server rules** (exact limit calculations, phase durations, the full list of error codes) — these belong to the backend; the documentation only describes what the SDK sends and receives (17).
- **The full source of the reference implementation** — only the fragments included in the documentation and the starter project are provided.

## Checklist

- [ ] `.npmrc` created, `pnpm add @krash/sdk @krash/react sfs2x-api` succeeded
- [ ] `.env` filled with staging addresses
- [ ] the starter runs at the `?mode=demo&gid=...` URL and a bet can be placed
- [ ] you have a test account and a source of one-shot tokens
- [ ] a free bet grant is credited to the test account (if you are building free bets)

