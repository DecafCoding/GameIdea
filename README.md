# GameIdea

GameIdea is a browser canvas for solo and hobby game developers and game jam entrants: draw game concept cards from decks, turn each card's ring to choose the active cue, combine Modifiers onto Player Role and Setting cards, and read the stack as a game hook. It runs locally in a desktop browser, with no server, no account and no AI.

Boards save in the browser (IndexedDB) after each change, you can keep many boards in the board list, and undo and redo cover every board change. Each board exports as a plain text file or as a board file, the backup that imports again on any computer. The app sends no request to any address but its own.

> **Status: Phase 1 (copy and rename).** The app is a story-free copy of TheForge under the GameIdea name, ports, tokens, icons and shell. No cue pools ship yet, so the decks stay off: the board shows the "decks did not load" banner with Retry and the deck buttons are disabled until the Phase 2 pools ship. Boards, notes, export and import work.

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

- **Text File** downloads `<board-name>.txt`: the board in plain words. Stacks are listed top to bottom, tucked cards indented, with only the active cue or pair; a Modifier tucked under a card joins its line. Then the notes.
- **Board File** downloads `<board-name>.gameidea.json`: all data of the board. This is your backup; the browser's storage can be cleared.

**Import Board File** on the board list reads a `.gameidea.json` file and always saves it as a new board, so it never overwrites one you have. If the name is taken, " (imported)" is added. A file that is not a good board file (not JSON, a broken board, a newer format, over 5 MB) shows "This file is not a GameIdea board file. Nothing changed." with Choose Another File, and nothing is saved. The board format starts at version 1 with no upgrade steps.

## Use The Board

Open a board from the board list. The app mark in the top bar goes back to the list.

- **Saving:** every finished change saves at once; a drag saves once, on drop. The save mark next to the board name reads Saved, Saving or Save Failed. If a save fails, the last good version stays and a banner offers Export Board File.
- **Undo and redo:** the Undo and Redo buttons, or Ctrl+Z and Ctrl+Shift+Z (Cmd on macOS), step through up to 100 changes on this board. The history lasts for the session and clears when you open another board or reload.
- **2 tabs:** when another tab changes the open board, this tab reloads it and shows a notice. Undo history is cleared.
- **Decks:** the side rail lists Player Role, Goal, Conflict, Modifier and Setting. They stay off until the Phase 2 pools ship.
- **Notes:** "Add Note" adds a note in edit mode. Drag the bottom-right handle to resize, the trash button deletes it, and dragging the note moves it.
- **View:** drag the empty canvas to pan, use the mouse wheel or the zoom strip to zoom (25 to 200 percent), click the percent to reset to 100 percent, and Fit to show every card.

## Browser Tests And Fixture Pools

No pool files ship in `public/pools/` until Phase 2. The Playwright tests serve made-up pools from `tests/e2e/fixtures/pools/*.json` through an automatic fixture in `tests/e2e/test.ts`; every spec imports `test` and `expect` from `./test`. A spec that tests the pool failure banner registers its own route, which wins.

## Project Layout

See `CLAUDE.md` for the full folder layout and conventions. Main folders so far:

- `src/app/`: start-up, hash routing, the board list page, the board screen shell (top bar, side rail, save mark, undo keys, banners) and the card test page
- `src/features/card/`, `features/draw/`: the card, its rings, the card strip, deck buttons and draw logic
- `src/features/canvas/`: the React Flow canvas, stacks, drop zones, connector badges and board actions
- `src/features/notes/`: notes
- `src/features/boards/`: the board list with the name-only New Board dialog, Import Board File, rename and the delete dialog
- `src/features/export/`: the Export menu, the text file and board file, and the import checks (the only folder that uses Zod)
- `src/shared/model/`: types and constants (card types, deck names, the 21 genres, the format version)
- `src/shared/storage/`: the only module that touches IndexedDB (Dexie database `gameidea`): the storage actions, the tab message and autosave
- `src/shared/store/`: the open board in a Zustand store with zundo undo, and the save status
- `src/shared/ui/`: the design tokens (`tokens.css`), icons, buttons, dialogs and banners
- `src/test/`: fixture boards for unit and browser tests and the story-name check
- `public/icons/`: the deck icons, UI icons and the Hook Card icon
- `tests/e2e/`: Playwright specs, helpers and `fixtures/pools/`
- `scripts/`: the size check, the port lock check and the CSS color check

`docs/architecture.html` holds every technical decision. The spec and phases are in `docs/prd.html`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on each pull request: lint (with the CSS color check), format check, typecheck, unit tests, build, the size check, the port lock check, and Playwright in all 3 browsers. It needs no secrets.
