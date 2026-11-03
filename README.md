# GameIdea

GameIdea is a browser canvas for solo and hobby game developers and game jam entrants: draw game concept cards from decks, turn each card's ring to choose the active cue, combine Modifiers onto Player Role, Resource and Setting cards, tuck cards under a Hook Card and copy the computed one-sentence game hook. It runs locally in a desktop browser, with no server, no account and no AI.

Boards save in the browser (IndexedDB) after each change, you can keep many boards in the board list, and undo and redo cover every board change. Each board exports as a plain text file or as a board file, the backup that imports again on any computer. The app sends no request to any address but its own.

> **Status: Phase 2 (hook test).** The 11 cue pools ship in `public/pools/`. The rail draws the Hook Card, the 5 core decks, the 3 Modifier decks and Setting; the Hook Card reads its stack as a hook sentence you can copy. Next: the user's manual M2 hook test (below), then the Genres panel (Phase 3) and the optional deck buttons (Phase 4).

## Requirements

- Node.js 24 LTS (see `.nvmrc`)
- npm

## Setup

```bash
npm install
npx playwright install chromium firefox webkit   # browsers for npm run test:e2e
```

All library versions are pinned exactly in `package.json`.

## Scripts

| Script                 | What It Does                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Development server at http://localhost:5174                                                                                        |
| `npm start`            | Build, then serve the built app at http://localhost:4174                                                                           |
| `npm run start:lan`    | Build, then serve the built app over HTTPS on the local network at port 4444 (see Local Network)                                   |
| `npm run build`        | Production build into `dist/`                                                                                                      |
| `npm test`             | Vitest unit tests                                                                                                                  |
| `npm run test:e2e`     | Playwright in Chromium, Firefox and WebKit against `npm start`, including a network test that fails on any request outside the app |
| `npm run lint`         | ESLint (including the import rules from `docs/architecture.html`), then `scripts/check-css-colors.mjs`                             |
| `npm run typecheck`    | `tsc --noEmit`                                                                                                                     |
| `npm run format`       | Prettier, rewriting files                                                                                                          |
| `npm run format:check` | Prettier, checking only (used in CI)                                                                                               |
| `npm run size`         | Size check after a build: JavaScript ≤ 250 KB gzip, pools ≤ 100 KB gzip                                                            |

`scripts/check-css-colors.mjs` fails on any hex, `rgb(a)` or `hsl(a)` color in a CSS file under `src/` outside `src/shared/ui/tokens.css`. Every chrome color comes from a design token; the only allowed literals are fixed colors on a deck or danger fill, marked with a `/* fixed: <reason> */` comment on the same line.

## Ports

- **5174** is for development (`npm run dev`).
- **4174** serves the built app (`npm start`). It holds your real boards.
- **4444** serves the built app over HTTPS to the local network (`npm run start:lan`).

The ports differ from TheForge (5173, 4173, 4443) so both apps run side by side. All 3 ports are locked with `strictPort`. If a port is in use, the command fails instead of moving to another port, because the browser stores boards separately for each address and port. Stop any running `npm start` before `npm run test:e2e`, or the tests reuse that server and its older build.

**Run locally:** `npm start` is the one command for real work. After a build, `node scripts/check-port-lock.mjs` checks that both locked ports fail when busy (CI runs it too).

## Local Network

`npm run start:lan` serves the same build at `https://<this machine's LAN address>:4444` so phones and other computers on the network can use it. `http://localhost:4174` is untouched.

Each device keeps its own boards in its own browser. Nothing is shared between devices; move a board with Export Board File and Import Board File. On this machine, `https://…:4444` is also a separate site from `http://localhost:4174`, with its own board list.

HTTPS is needed because browsers give plain-HTTP network pages fewer features, such as persistent storage. The certificate comes from [mkcert](https://github.com/FiloSottile/mkcert) and lives in `.certs/`, which git ignores.

One-time setup on the serving machine:

1. `sudo apt install mkcert libnss3-tools`, then `mkcert -install` to create the local certificate authority.
2. `mkcert -cert-file .certs/lan.pem -key-file .certs/lan-key.pem <LAN address> localhost`. Run it again if the LAN address changes.
3. Open the port: `sudo ufw allow 4444/tcp`.

On each other device, trust the certificate authority once. Its file is `rootCA.pem` in the folder that `mkcert -CAROOT` prints:

- **iPhone or iPad:** send the file to the device, install the profile in Settings, then turn it on in Settings › General › About › Certificate Trust Settings.
- **Android:** Settings › Security › Encryption & credentials › Install a certificate › CA certificate.
- **Windows, macOS or Linux:** import it into the system trust store, or into Firefox's own store.

Keep `rootCA-key.pem` private and never copy it to another device: anyone with it can make certificates your devices trust.

## Board List

Run `npm start` and open http://localhost:4174. The board list at `#/` shows your saved boards, newest first, each with a strip of its card colors and "N cards · N notes · edited …".

- **New Board** opens a dialog that asks only for a name. Make Board stays off until the name has text; Enter makes the board, Esc cancels. All 21 genres start on for every genre-tagged deck.
- **Open:** click a board's name.
- **Rename:** the pencil button turns the name into a field. Enter or Save keeps the new name; Esc or Cancel keeps the old one. An empty name is not saved.
- **Delete:** the trash button opens the `Delete "<name>"?` dialog. Only Delete Board removes the board; undo does not bring it back.

## Export And Import

**Export** in the board top bar opens a menu with 2 rows. A click downloads the file at once:

- **Text File** downloads `<board-name>.txt`: the board in plain words. Stacks are listed top to bottom, tucked cards indented, with only the active cue or pair; a Modifier tucked under a card joins its line, an On Top Modifier reads inside its card's words, and a Hook Card line reads "Hook Card" with its stack under it. Then the notes.
- **Board File** downloads `<board-name>.gameidea.json`: all data of the board. This is your backup; the browser's storage can be cleared.

**Import Board File** on the board list reads a `.gameidea.json` file and always saves it as a new board, so it never overwrites one you have. If the name is taken, " (imported)" is added. A file that is not a good board file (not JSON, a broken board, a newer format, over 5 MB) shows "This file is not a GameIdea board file. Nothing changed." with Choose Another File, and nothing is saved. The board format starts at version 1 with no upgrade steps.

## Use The Board

Open a board from the board list. The app mark in the top bar goes back to the list.

- **Saving:** every finished change saves at once; a drag saves once, on drop. The save mark next to the board name reads Saved, Saving or Save Failed. If a save fails, the last good version stays and a banner offers Export Board File.
- **Undo and redo:** the Undo and Redo buttons, or Ctrl+Z and Ctrl+Shift+Z (Cmd on macOS), step through up to 100 changes on this board. The history lasts for the session and clears when you open another board or reload.
- **2 tabs:** when another tab changes the open board, this tab reloads it and shows a notice. Undo history is cleared.
- **Rail:** the Hook Card button, then Core (Player Role, Mechanic, Resource, Goal, Conflict), the Modifiers row (Player Role, Resource and Setting Modifier; point at a button for its name) and Optional (Setting). A click draws one card into open space near the view center. If the pools do not load, a banner offers Retry and only the Hook Card button stays on.
- **Cards:** each 200 px card shows 4 cues (Player Role, Mechanic, Resource, Setting, Mood, Modifier) or 2 cues (Goal, Conflict, Twist, Progression, Constraint). Point at a card and click a ring arrow to turn it; R turns the card under the pointer, Shift+R its inner (adjective) ring. The cue at the bottom edge is the active one.
- **Card strip:** click a card for Split (a card with a merged or On Top Modifier), Redraw (new cues from its deck, keeping its place, tucks, lock, badge word and adjectives), Lock or Unlock, and Discard (Delete key too). A locked card shows a lock and keeps its cues through Redraw All.
- **Tuck:** drag a card onto another to tuck it 56 px under; a stack moves with its top card. While you drag the next card in the order Player Role, Mechanic, Resource, Goal, Conflict, a "<Deck> goes here" slot shows under the stack. A badge on each seam shows the connector word ("You are a", "who must", "using", "to", "but"); click it to pick another word.
- **Modifiers:** drop a Modifier anywhere on a plain Player Role, Resource or Setting card to combine: its 4 adjectives become the inner ring ("frozen pilot"). On a combined card, drop in the top band ("Add on top") to put a second Modifier on top ("tall frozen pilot"), or elsewhere to swap the adjectives (the old ones come back as a Modifier card beside it). Split moves the merged adjectives back out into a Modifier card, or releases the On Top Modifier when there is no merged ring. A Modifier on any other deck tucks like a normal card.
- **Hook Card:** draw one from the top of the rail and tuck a Player Role under it, then a Mechanic, a Resource, a Goal and a Conflict. Stack cards sit 20 px in from its edge. It shows the hook sentence, computed from the stack on every change. Point at it for its menu: **Copy** puts the sentence on the clipboard (it reads "Copied" for 2 seconds; if the browser blocks it, a dialog shows the text selected for Ctrl+C), **Redraw All** redraws every unlocked card in the stack in one undo step, and **Discard** removes the Hook Card (its stack stays). A Hook Card never tucks under a card.
- **Notes:** "Add Note" adds a note in edit mode. Drag the bottom-right handle to resize, the trash button deletes it, and dragging the note moves it.
- **View:** drag the empty canvas to pan, use the mouse wheel or the zoom strip to zoom (25 to 200 percent), click the percent to reset to 100 percent, and Fit to show every card.

## Design Tokens And Icons

`src/shared/ui/tokens.css` holds the GameIdea token set from `docs/design-system.html`: Dark and Light mode and the Orange, Blue and Green theme colors, picked by `data-mode` and `data-theme` on `<html>`. `index.html` sets `data-mode="dark" data-theme="orange"`; the Settings switch comes in a later phase. Only the chrome and the accent follow the attributes; cards, notes and deck colors never change. The fonts (Space Grotesk and Inter) are bundled, and the deck icons, UI icons and the Hook Card icon are SVG files in `public/icons/`.

## Pools

The 11 cue pools are JSON files in `public/pools/` (role, mechanic, goal, conflict, resource, modifier, setting, mood, twist, progression, constraint), loaded by web address. They were made once from `docs/libraries/decks.json` by `scripts/split-decks.mjs`, which copied each cue's text unchanged except for 2 rules (the Constraint lead word lowercased, a leading "the", "a" or "an" dropped from a Setting cue), mapped genres and Modifier targets and gave each cue a stable id.

**The JSON files are now the source: edit them directly.** Never run the split again; it refuses to write while any pool file exists. `src/shared/pools/poolFiles.test.ts` keeps the floors on every edit: at least 10 cues per genre in Mechanic, Resource, Progression and Constraint, at least 20 cues for each Modifier deck (by its `targets`), unique ids and texts, and the 2 grammar rules.

## M2 Hook Test (Manual)

The milestone M2 check is yours, not an automated gate. It judges whether the drawn cards and hooks are worth building.

1. Run `npm start` and open http://localhost:4174 (your real boards).
2. Draw 20 stacks: a Hook Card with a Player Role, a Mechanic, a Resource, a Goal and a Conflict tucked under it, adding Modifiers as you like. Turn rings and use Redraw All freely.
3. **Pass bar:** at least 16 of 20 cards usable in each core deck, at least 20 of 25 usable in each of the 3 Modifier decks, and at least 12 of 20 hooks you would build.
4. **Record results** in a note on the board (cards you rejected, hooks you liked), then Export › Text File to keep them.
5. **If it fails:** edit or replace cues in `public/pools/*.json` (the floor test tells you if an edit breaks a floor), or change the badge words in `src/features/canvas/connector.ts`. A failed hook test is a content fix, not an architecture change.

## Browser Tests And Fixture Pools

The Playwright tests serve made-up pools from `tests/e2e/fixtures/pools/*.json` through an automatic fixture in `tests/e2e/test.ts`, so specs see fixed cue texts; every spec imports `test` and `expect` from `./test`. A spec that tests the pool failure banner registers its own route, which wins. `tests/e2e/pools-real.spec.ts` removes the route and draws every rail deck from the shipped pools.

## Project Layout

See `CLAUDE.md` for the full folder layout and conventions. Main folders so far:

- `src/app/`: start-up, hash routing, the board list page, the board screen shell (top bar, side rail, save mark, undo keys, banners) and the card test page
- `src/features/card/`, `features/draw/`: the card, its rings, the card strip, deck buttons and draw logic
- `src/features/canvas/`: the React Flow canvas, stacks, drop zones, connector badges, the stack reading order and board actions (including Redraw All)
- `src/features/hook/`: the Hook Card, its hover menu, Copy and its fallback dialog, and the pure hook sentence builder
- `src/features/notes/`: notes
- `src/features/boards/`: the board list with the name-only New Board dialog, Import Board File, rename and the delete dialog
- `src/features/export/`: the Export menu, the text file and board file, and the import checks (the only folder that uses Zod)
- `src/shared/model/`: types and constants (the 12 card types, deck and Modifier deck names, the 21 genres, the format version)
- `src/shared/storage/`: the only module that touches IndexedDB (Dexie database `gameidea`): the storage actions, the tab message and autosave
- `src/shared/store/`: the open board in a Zustand store with zundo undo, and the save status
- `src/shared/ui/`: the design tokens (`tokens.css`), icons, buttons, dialogs and banners
- `src/test/`: fixture boards for unit and browser tests and the story-name check
- `public/icons/`: the deck icons, UI icons and the Hook Card icon
- `tests/e2e/`: Playwright specs, helpers and `fixtures/pools/`
- `public/pools/`: the 11 cue pools
- `scripts/`: the one-time pool split, the size check, the port lock check and the CSS color check

`docs/architecture.html` holds every technical decision. The spec and phases are in `docs/prd.html`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on each pull request: lint (with the CSS color check), format check, typecheck, unit tests, build, the size check, the port lock check, and Playwright in all 3 browsers. It needs no secrets.
