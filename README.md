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
| [Architecture](docs/ARCHITECTURE.md) | how the canvas, events, engine and sprites fit together |
| [Conventions](docs/CONVENTIONS.md) | component anatomy, styling, state, i18n, sound, a11y |
| [UI systems](docs/UI-SYSTEMS.md) | modals, stacking order, breakpoints and container queries |
| [Free bets](docs/FREE-BETS.md) | the grant model, ticket accounting and what's still mocked |
| [Backend](docs/BACKEND.md) | the event contract to implement when a real server arrives |

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
├── context/              # React Context providers (game state, bets, user, etc.)
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
- **context** and **hooks** hold the game logic and shared state (crash rounds, active bets, results).

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
