# Football Crash

A football-themed crash betting game built with **React + TypeScript + Vite**.

The UI is split into two sides:

- **Left panel** — a board with tabs: **Bets**, **My Bets**, **Leaderboard**, and **Stats**.
- **Right panel** — the **crash animation** and the **betting buttons**.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** — dev server & build tooling
- **React Compiler** — enabled for automatic memoization
- **CSS Modules + BEM** — styling (`*.module.css`, class names as `block__element--modifier`)
- **ESLint** — linting

## Documentation

| Doc | What's in it |
| --- | --- |
| [Architecture](docs/ARCHITECTURE.md) | how the canvas, events, SDK and sprites fit together |
| [Conventions](docs/CONVENTIONS.md) | component anatomy, styling, state, i18n, sound, a11y |
| [UI systems](docs/UI-SYSTEMS.md) | modals, stacking order, breakpoints and container queries |
| [Free bets](docs/FREE-BETS.md) | what the skin owns of a grant, and what it must not touch |
| [Krash SDK docs](.claude/sdk-docs/README.md) | the integration documentation: hooks, events, and the SDK-vs-skin split per panel |
| [CLAUDE.md](CLAUDE.md) | the short version of all of the above, loaded by Claude Code at startup |

> The game's rules, money and round loop belong to the **Krash SDK**
> (`@krash/sdk` + `@krash/react`), reached through the single seam in
> `src/sdk/`. The packages are not installed yet — see `src/sdk/README.md`.

## Architecture

The project uses a layered `src/` structure that separates reusable UI, layout, state, and helpers:

```
src/
├── main.tsx              # App entry point
├── App.tsx               # Root component
├── index.css             # Global base styles
├── App.css               # App-level styles
│
├── components/           # Reusable components
│   ├── layout/           # Structural pieces (left board, right panel, page shell)
│   └── ui/               # Presentational/shared UI (buttons, tabs, cards, etc.)
│
├── sdk/                  # The seam: everything game-related is imported from here
├── context/              # React Context providers (modals, the game boot)
├── hooks/                # Custom reusable hooks
├── styles/               # Shared styles / CSS Modules
├── utils/                # Helper functions and pure utilities
└── assets/               # Static assets (images, icons)
```

### Conventions

- **Styling:** every component owns a co-located `Component.module.css` and uses **BEM** naming
  (`styles.leaderboard`, `styles.leaderboard__item`, `styles['leaderboard__item--active']`).
- **components/layout** holds the structural regions — the left board (Bets / My Bets / Leaderboard / Stats)
  and the right region (crash animation + betting buttons).
- **components/ui** holds shared, presentational building blocks reused across the app.
- **sdk** is the only place the game's state comes from — balance, phase, bets,
  auto-play, free bets. Nothing else may compute them.
- **context** and **hooks** hold what is genuinely the skin's: modals, the audio
  layer, the countdown, the live bets feed.

## Getting Started

### Prerequisites

- **Node.js** 20.19+ or 22.12+
- **npm** (a `package-lock.json` is included)

### Install

```bash
npm install
```

### Run the dev server

```bash
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173). Hot Module Replacement is enabled.

## Available Scripts

| Command           | Description                                     |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR             |
| `npm run build`   | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally           |
| `npm run lint`    | Run ESLint over the project                    |

## Build for Production

```bash
npm run build
```

The optimized output is written to the `dist/` folder. To preview it locally:

```bash
npm run preview
```
