# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GameIdea (working name) is a browser canvas for solo and hobby game developers and game jam entrants. The user draws game concept cards from 11 decks, turns each card's ring to choose the active cue, combines Modifiers onto Player Role, Resource and Setting cards, tucks cards under a Hook Card, and selects and copies the computed one-sentence game hook. It runs locally in a desktop browser, with no server, no account and no AI.

**Deck click → draw distinct cues from a pool (genre / target filter) → card on canvas → turn rings / lock / combine / tuck under a Hook Card → computed hook sentence → select and copy → autosave to IndexedDB → export.**

The app starts from a copy of TheForge (`~/repos/theforge`), the user's story-card app. Phase 1 copies, renames and strips its story code.

See `README.md` for setup and usage. The authoritative docs are:

- `docs/prd.html` — the spec and the 5 implementation phases
- `docs/architecture.html` — every technical decision (stack, storage, layout, failure, targets). It wins over the PRD.
- `docs/design-system.html` — everything visual. Do not invent tokens, sizes or copy outside it. It wins over `docs/design-handoff/`, which is a record only.
- `docs/mvp-plan.html` — scope, the data model, the draw rules, the hook sentence rules and the connector badge words
- `docs/feature-modifier-decks.html` — the 3 Modifier decks, combine, swap, On Top and Split
- `docs/feature-settings-and-theme.html` — Settings, Light mode, theme colors, snap, Add note

## Repository Location & Layout

The repo lives at `~/repos/gameidea` (GitHub `DecafCoding/GameIdea`). One Vite + React app, managed with npm. Unit tests sit beside the code as `*.test.ts` / `*.test.tsx`. Browser tests live under `tests/e2e/`.

```
src/
  app/              app shell, the 2 screens (#/ and #/board/<id>), start-up, theme attributes
  features/
    draw/           deck buttons, grouped rail, draw logic (distinct cues), genre and target filters
    card/           card view, rings, rotate, cue text, lock control, type icons
    canvas/         React Flow setup, pan, zoom, drag, tuck, tuck hints, snap,
                    connector badges and their word rules for the 12 card types,
                    the One-Pager Concept panel (pure rules in concept.ts, the panel node)
    hook/           Hook Card: sentence builder (pure), selectable sentence, icon menu (Copy Hook and its fallback dialog, Redraw All, Duplicate, Discard)
    genres/         Genres tab content (on the Settings dialog), genre counts
    notes/          free-text notes with editable titles, Add note
    boards/         board list: make, open, rename, delete
    export/         text file (with hooks), board file, import and its Zod checks
    settings/       Settings dialog with Appearance and Genres tabs, Keyboard list, footer, settings store (no zundo)
  shared/
    model/          types: Board, Card, Ring, Cue, Note, Pool, Genre, format version
    store/          the board Zustand store with zundo
    storage/        the only storage module (Dexie, local storage settings, persistent storage, tab sync)
    pools/          loads public/pools/*.json by web address
    ui/             general parts: buttons, dialogs
public/pools/       role, mechanic, goal, conflict, resource, modifier, setting,
                    mood, twist, progression, constraint .json
public/icons/       11 deck icons, 3 Modifier icons, Hook Card icon (vendored Lucide SVG)
tests/e2e/          Playwright tests
docs/libraries/     decks.json, genres.json and Markdown libraries — a record after the split
```

The layout above is the plan from `docs/architecture.html` (`module-layout`) plus `features/settings/` from the settings brief. No app code exists yet; Phase 1 creates it.

## Build & Test

```bash
npm install
npm run dev          # development server, http://localhost:5174
npm start            # build, then serve the built app at http://localhost:4174
npm run start:lan    # build, then serve over HTTPS to the local network at port 4444
npm run build        # production build into dist/
npm test             # Vitest unit tests
npm run test:e2e     # Playwright in Chromium, Firefox and WebKit
npm run lint         # ESLint (includes the hard-coded chrome color check on CSS modules)
npm run typecheck    # tsc --noEmit
npm run format       # Prettier
npm run size         # JS and pool size checks
```

These scripts come from the TheForge copy in Phase 1. Keep the names as listed.

- **All ports are locked** (`strictPort`). If a port is in use, the command must fail, never move. The browser stores boards per address and port: 4174 holds the user's real boards, 5174 is for development, 4444 is HTTPS with an mkcert certificate in `.certs/` (git-ignored). The ports differ from TheForge (5173, 4173, 4443) so both apps run side by side.
- Port 4174 stays plain HTTP on localhost. `https://localhost:4174` would be a different origin and hide the user's boards.
- Node.js 24 LTS runs the build tools only. All library versions are pinned exactly in `package.json` and match TheForge.
- GitHub Actions runs lint, typecheck, unit tests, Playwright and the size checks on each pull request. A failed check blocks the merge.

## Architecture

Feature folders (Vertical Slice) in TypeScript strict mode with React 19. No router library, no backend, no repository pattern beyond the one storage seam.

Import rules (`import-rules` in `docs/architecture.html`). Do not break them:

- `app/` imports `features/` and `shared/`.
- A feature imports `shared/`. It uses another feature only through that feature's `index.ts`.
- `shared/` never imports `features/` or `app/`.
- Only `shared/storage/` touches IndexedDB, Dexie or local storage.
- Only `features/canvas/` imports React Flow (`@xyflow/react` 12).
- Only `features/export/` imports Zod.
- Only `features/hook/` calls the Clipboard API.

### Key Patterns

- **No TheForge story code.** Character, Motivation, Description types, Setting kinds (place, object, event) and kind-based connector rules must not survive the copy. The Phase 1 pass bar greps `src/` for them.
- **Storage seam.** The rest of the app uses only `listBoards`, `loadBoard`, `saveBoard`, `deleteBoard`, `onBoardChangedElsewhere`, plus `loadSettings`, `saveSettings`, `onSettingsChangedElsewhere` (a recorded exception in the settings brief).
- **One record per board.** Dexie database `gameidea`, tables `boards` (full BoardRecord) and `boardIndex`. Each save writes both in one transaction, once per finished change. A drag saves once, on drop. A failed save keeps the last good version and offers an export.
- **Cards copy their cues.** A pool change or genre change never changes cards on the board. Cards do not store `targets`.
- **Draws.** Distinct cues per card. Mechanic, Resource, Progression and Constraint draw only cues sharing a genre with the deck's current genres (each keeps at least 1 on). The 3 Modifier buttons draw from `modifier.json` filtered by `targets` and set `modDeck`. The other decks use the full pool.
- **Rings.** Role, Resource, Setting: `rings[0]` = 4 cues, `rings[1]` = 4 adjectives only after a combine, never `rings[2]`. Mechanic, Mood, Modifier: 4 cues. Goal, Conflict, Twist, Progression, Constraint: 2 cues. Active cue = bottom edge. The card body and center icon never turn.
- **Combine.** First combine moves the Modifier ring into `rings[1]` (with its `modDeck`) and deletes the card. Swap and Split make a new Modifier card beside the base card. On Top keeps a second Modifier as a card with `onTopOf`; 1 per base card. Any modifier merges with any Role, Resource or Setting card — targets guide the draw only.
- **Hook sentence is a pure function** in `features/hook/`, computed on every change and never stored. It takes the stack in reading order and must not import React or React Flow. Never output a blank slot. Rules live in `docs/mvp-plan.html` (Hook sentence rules, Connector badges).
- **Pools.** 11 JSON files in `public/pools/`, made once by a split of `docs/libraries/decks.json`. After the split the JSON is the source; never rerun the split over edited pools. The split changes cue text only by its 2 rules (lowercase the Constraint lead word, drop a leading the/a/an from Setting). Floors: 10 cues per genre per tagged deck, 20 per Modifier deck — enforced by the split and a unit test.
- **Pool load failure** shows an error with Retry. Boards and saved cards still work; only deck buttons stop.
- **Board file format is expensive to change.** `formatVersion` is 2, with 1 upgrade step: `UPGRADES[1]` for board files, shared with Dexie schema version 2 for saved records through `upgradeBoardV1` in `shared/model`. A further shape change adds Dexie `version(3)` and `UPGRADES[2]`. Import always creates a new board; a duplicate name gets "(imported)".
- **One-Pager boards.** The panel shows as "Details" on screen and in the text file; code and the board file keep the name `concept`. 2 board kinds, `free` (Free Form, every board made before format 2) and `onePager`, set at New Board and never changed. A One-Pager board has exactly 1 Hook Card and 1 Concept panel. Concept cards have `inConcept: true`, `tuckedUnder: null` and chip order by `z`; the panel's place is derived from the Hook Card (left + 296, same top) and only `conceptWidth` (232 to 640) is stored. Stack, reading, drop and placement code skip Concept cards, so the hook sentence never reads them. Each panel action is 1 `changeBoard`. Never use the attribute name `data-kind` (the story-name check bans it); use `data-board-kind`.
- **Undo.** zundo, up to 100 steps per board, session only; clears on board change, reload and when another tab changes the board. Every user action is one step (Redraw All included). Genre and settings changes are never in undo.
- **2 tabs.** After a save, post the board id on a BroadcastChannel; a tab showing that board reloads and shows the notice.
- **Theme.** Settings set `<html data-mode data-theme>` before first render (local storage, so no dark flash). The theme color changes only the accent. The mode changes the chrome, card faces, tucked faces, the note and the Hook Card fill (design 4.5). Badges, rings, center icons and deck colors never change. Every card has a 1 px deck-color edge and a deck tint (`--card-tint`: 14% dark, 7% light); the Hook Card has none. Light-mode outlines use `--accent-text`; the Hook label uses the current mode's `--accent-text`.
- **Snap** applies only to the drop of a free card or note, to the 24 px grid. Alt skips it. Tuck, combine and On Top drops ignore it.

## Configuration

There is no configuration and there are no secrets. No environment variables. CI needs no secrets. User preferences live only in the local storage key `gameidea.settings`, never in a board, board file, export or undo history.

## Conventions

- TypeScript strict. No `any` without a comment that says why.
- No request to any address other than the app's own. Fonts (Space Grotesk, Inter) and icons are bundled. A Playwright test checks the network.
- Use the design tokens from `docs/design-system.html` as CSS custom properties. Never hard-code a chrome color; the lint check fails hex and rgba in CSS modules outside tokens.css (except white on a deck or danger color and the theme swatches), and any card, Hook Card or note token defined outside tokens.css.
- Hit targets are 44 px, except rail deck buttons at 36 px (a recorded design deviation). Icon-only buttons need an `aria-label`.
- No `console.log` left in committed code. Show user-facing errors through the notices in the design doc.
- A short doc comment at the top of each module that says what it is for.
- **No secrets in source or committed config.**

## Testing

- **Unit:** Vitest. Cover draw logic and filters, ring turns, combine / swap / On Top / Split with `modDeck`, the hook sentence builder (every rule and failure case), connector words, snap math, settings parsing, the storage seam, import checks and the pool floor tests on `public/pools/`.
- **Browser:** Playwright in Chromium, Firefox and WebKit, against fixture boards: small fixtures, a 200-card board for speed checks and an 11-card stack for the long-stack drag test.
- **Targets:** draw, turn and hook update under 100 ms; 50 fps pan and drag with 200 cards; save under 50 ms for 200 cards; JavaScript 250 KB or less compressed; pools 100 KB or less compressed; first load under 2 s; no outside requests.
- Name tests for behavior: `functionName_condition_expectedResult`.

## UI Conventions

- **Title Case For All UI Text** — labels, button text, section headings, page titles, menu
  items, table column headers, tab names, dialog titles, and toast/notification titles.
  Example: "Classic Movies From The 1990's", **not** "Classic movies from the 1990s".
- Title Case applies to headings in generated documentation and reports as well.
- Body copy, help text, validation messages, and log messages stay in sentence case.
- In this app, buttons and menu items such as "Redraw All", "Add Note" and "Import Board File" are Title Case. Notices, help text, the hook sentence and cue text stay as written in `docs/design-system.html` and the pools.

## Working With Me (Interaction Rules)

- **Never** present multiple-choice questions, lettered or numbered pick-lists, or
  one-click/tappable answer options.
- Ask questions **conversationally, one at a time**, and wait for the answer before asking
  the next one.
- **Every question carries a recommendation** — your suggested answer plus a one-line reason.
- Always leave room for a typed, free-text reply; never constrain the answer to a fixed set.

## Commit Authorship

- All commits are authored **solely by the user**. Do **not** add Claude, Claude Code, or any
  AI tool as an author, and do **not** append a `Co-Authored-By` trailer for one.
- **No AI attribution anywhere.** Not in commit messages, PR or issue descriptions, code
  comments, XML/doc comments, changelogs, release notes, or documentation. Do not add
  "Generated with…", "🤖", "AI-assisted", or any equivalent marker.
- Write commit messages in the repository owner's voice: what changed and why.
