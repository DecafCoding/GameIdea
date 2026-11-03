# GameIdea

GameIdea is a browser canvas for solo and hobby game developers and game jam entrants: draw game concept cards from decks, turn each card's ring to choose the active cue, combine Modifiers onto Player Role, Resource and Setting cards, tuck cards under a Hook Card and copy the computed one-sentence game hook. It runs locally in a desktop browser, with no server, no account and no AI.

Boards save in the browser (IndexedDB) after each change, you can keep many boards in the board list, and undo and redo cover every board change. Each board exports as a plain text file or as a board file, the backup that imports again on any computer. The app sends no request to any address but its own.

> **Status: Phase 5 (export and finish) — the MVP is complete.** The rail draws all 11 decks plus the Hook Card, which reads its stack as a hook sentence you can copy. The text file export starts with each hook. Settings switch Dark or Light mode and the Orange, Blue or Green theme color, and dropped cards and notes snap to the dot grid.

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

Settings live in the browser per address and port too, so 4174, 5174 and 4444 each keep their own.

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

**Check it:** after `npm run build`, `node scripts/check-lan.mjs` starts the HTTPS preview, checks that `https://localhost:4444/` answers with the app on all interfaces and that a second start on the busy port fails, then stops it. It prints `SKIP` and exits 0 when `.certs/` has no certificate (CI has none, so it runs only locally).

## Board List

Run `npm start` and open http://localhost:4174. The board list at `#/` shows your saved boards as cards, newest first. Each card shows the name, a meta line ("Edited 10 minutes ago · 8 cards · 1 hook", or "no hook yet"), the first hook sentence (or "No Hook Card on this board."), a dot for each deck on the board and a More button. With no boards, a "No Boards Yet" box offers Import Board File and New Board.

- **New Board** opens a dialog that asks only for a name. Make Board stays off until the name has text; Enter makes the board, Esc cancels. All 21 genres start on for every genre-tagged deck.
- **Open:** click a board's name.
- **More menu:** Rename, Export Board File and Delete. Arrow keys move between items; Esc or a click outside closes it.
- **Rename** turns the name into a field in place: Enter saves, Esc cancels, and a click outside the card also saves. An empty name keeps the old one.
- **Export Board File** downloads the board file without opening the board.
- **Delete** opens the `Delete "<name>"?` dialog. Only Delete Board removes the board; undo does not bring it back.

## Export And Import

**Export** in the board top bar opens a menu with 2 rows. A click downloads the file at once:

- **Text File** downloads `<board-name>.txt`: each hook on the board, then the cards and notes in plain words. It starts with the board name and a Hooks section (each non-empty hook sentence in reading order, one paragraph each). Stacks are listed top to bottom, tucked cards indented, with only the active cue or pair; a Modifier tucked under a card joins its line, an On Top Modifier reads inside its card's words, and a Hook Card line reads "Hook Card" with its stack under it. Then the notes.
- **Board File** downloads `<board-name>.gameidea.json`: all data of the board. This is your only backup; the browser's storage can be cleared. A board file imports again with nothing lost (a browser test compares every field).

**Import Board File** on the board list reads a `.gameidea.json` file and always saves it as a new board, so it never overwrites one you have. If the name is taken, " (imported)" is added. A file that is not a good board file (not JSON, a broken board, a newer format, over 5 MB) shows "This file is not a GameIdea board file. Nothing changed." with Choose Another File, and nothing is saved. The board format starts at version 1 with no upgrade steps.

## Use The Board

Open a board from the board list. The app mark in the top bar goes back to the list.

- **Saving:** every finished change saves at once; a drag saves once, on drop. The save mark next to the board name reads Saved, Saving or Save Failed. If a save fails, the last good version stays and a banner offers Export Board File.
- **Undo and redo:** the Undo and Redo buttons, or Ctrl+Z and Ctrl+Shift+Z (Cmd on macOS), step through up to 100 changes on this board. The history lasts for the session and clears when you open another board or reload.
- **2 tabs:** when another tab changes the open board, this tab reloads it and shows a notice. Undo history is cleared.
- **Rail:** the Hook Card button, then Core (Player Role, Mechanic, Resource, Goal, Conflict), the Modifiers row (Player Role, Resource and Setting Modifier; point at a button for its name) and Optional (Setting, Mood, Twist, Progression, Constraint), then Genres, Add Note and Settings at the bottom. Mechanic, Resource, Progression and Constraint show a genre count pill when their genres are narrowed. A click draws one card into open space near the view center. If the pools do not load, a banner offers Retry and only the Hook Card button stays on.
- **Genres:** the Genres button under the rail's Genres heading opens the Genres panel. The top row picks genres for all 4 genre-tagged decks (Mechanic, Resource, Progression, Constraint) at once, and All On turns every genre back on; each deck row below turns a picked genre off or on for that deck only. Each deck keeps at least 1 genre, so its last chip cannot be turned off. A change applies to the next draw only (cards on the board keep their cues), saves with the board and is never an undo step. A genre deck button shows a count pill while its deck has fewer than 21 genres on, and the line under Genres reads "All genres" or "N genres" (the genres on in any of the 4 decks).
- **Cards:** each 200 px card shows 4 cues (Player Role, Mechanic, Resource, Setting, Mood, Modifier) or 2 cues (Goal, Conflict, Twist, Progression, Constraint). Point at a card and click a ring arrow to turn it; R turns the card under the pointer, Shift+R its inner (adjective) ring. The cue at the bottom edge is the active one.
- **Card strip:** click a card for Split (a card with a merged or On Top Modifier), Redraw (new cues from its deck, keeping its place, tucks, lock, badge word and adjectives), Lock or Unlock, and Discard (Delete key too). A locked card shows a lock and keeps its cues through Redraw All.
- **Tuck:** drag a card onto another to tuck it 56 px under; a stack moves with its top card. While you drag the next card in the order Player Role, Mechanic, Resource, Goal, Conflict, a "<Deck> goes here" slot shows under the stack. A badge on each seam shows the connector word ("You are a", "who must", "using", "to", "but"); click it to pick another word.
- **Modifiers:** drop a Modifier anywhere on a plain Player Role, Resource or Setting card to combine: its 4 adjectives become the inner ring ("frozen pilot"). On a combined card, drop in the top band ("Add on top") to put a second Modifier on top ("tall frozen pilot"), or elsewhere to swap the adjectives (the old ones come back as a Modifier card beside it). Split moves the merged adjectives back out into a Modifier card, or releases the On Top Modifier when there is no merged ring. A Modifier on any other deck tucks like a normal card.
- **Hook Card:** draw one from the top of the rail and tuck a Player Role under it, then a Mechanic, a Resource, a Goal and a Conflict. Stack cards sit 20 px in from its edge. It shows the hook sentence, computed from the stack on every change. Point at it for its menu: **Copy** puts the sentence on the clipboard (it reads "Copied" for 2 seconds; if the browser blocks it, a dialog shows the text selected for Ctrl+C), **Redraw All** redraws every unlocked card in the stack in one undo step, and **Discard** removes the Hook Card (its stack stays). A Hook Card never tucks under a card. A Mood, Twist or Progression card tucked into a stack starts a new sentence ("It feels…", "Except…", "As you play,…"); a Constraint adds "with …" to the current sentence.
- **Empty board:** a new board shows a short guide with 3 steps and a "Start Here" tag at the rail's Hook Card button. It goes away once the first card or note is on the board.
- **Notes:** "Add Note" puts a note at the free grid spot nearest the view center, open and ready to type; it is one undo step. Drag the bottom-right handle to resize, the trash button deletes it, and dragging the note moves it.
- **Snap to grid:** with Snap To Grid on (the default), a free card or note you drop on empty canvas lands on the nearest 24 px dot of the grid. Hold Alt while you drop to place it freely. Tuck, combine and On Top drops ignore snap, a drop is one undo step, and turning snap on never moves cards already on the board.
- **View:** drag the empty canvas to pan, use the mouse wheel or the zoom strip to zoom (25 to 200 percent), click the percent to reset to 100 percent, and Fit to show every card.

## Settings

**Settings** at the bottom of the rail opens the Settings dialog. Every change applies at once and saves; there is no Cancel, and Done, × or Esc close it.

- **Mode:** Dark (default) or Light. The cards look the same in both.
- **Theme Color:** Orange (default), Blue or Green: buttons, selection, the Hook Card border and the genre counts.
- **Snap To Grid:** on by default (see Use The Board). Hold Alt while you drag to place freely.
- **Keyboard:** R turns the outer ring (or the only ring) one step, Shift+R the inner ring of a combined card, Ctrl+Z undoes and Ctrl+Shift+Z redoes.
- The footer shows the app version from `package.json`.

Settings apply to every board in this browser and live only in the local storage key `gameidea.settings` (`{"version":1,"mode","accent","snap"}`), never in a board, a board file, the text file or the undo history. They are kept per address and port. A missing or broken record, or an unknown value, falls back to the default for that field. A second open tab follows a change within a second. If the browser blocks local storage, the app runs on the defaults and the dialog says "This browser does not save settings. They reset when the page reloads."

## Design Tokens And Icons

`src/shared/ui/tokens.css` holds the GameIdea token set from `docs/design-system.html`: Dark and Light mode and the Orange, Blue and Green theme colors, picked by `data-mode` and `data-theme` on `<html>`. `index.html` sets `data-mode="dark" data-theme="orange"` as the fallback; a small inline script (`src/shared/storage/themeBoot.ts`, put at the top of `<head>` by a Vite plugin) applies the saved settings before the first paint, so a Light reload never flashes dark. Only the chrome and the accent follow the attributes; cards, notes, badges, deck colors and the Hook Card never change. In light mode, selection and focus outlines use the light accent text color; warning banners, "Save Failed" and Discard keep fixed colors in every theme. The fonts (Space Grotesk and Inter) are bundled, and the deck icons, UI icons and the Hook Card icon are SVG files in `public/icons/`.

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

The Playwright tests serve made-up pools from `tests/e2e/fixtures/pools/*.json` through an automatic fixture in `tests/e2e/test.ts`, so specs see fixed cue texts; every spec imports `test` and `expect` from `./test`. The `settings` option of the same file seeds the Settings record for a describe block, for example `test.use({ settings: { snap: false } })`; the drag, tuck, combine and On Top tests run with snap on and off. `tests/e2e/first-load.spec.ts` (Chromium timing project) throttles the network to 25 Mbps and checks the first load stays under 2 s. A spec that tests the pool failure banner registers its own route, which wins. `tests/e2e/pools-real.spec.ts` removes the route and draws every rail deck from the shipped pools.

## Project Layout

See `CLAUDE.md` for the full folder layout and conventions. Main folders so far:

- `src/app/`: start-up, hash routing, the board list page, the board screen shell (top bar, side rail, save mark, undo keys, banners) and the card test page
- `src/features/card/`, `features/draw/`: the card, its rings, the card strip, deck buttons and draw logic
- `src/features/canvas/`: the React Flow canvas, stacks, drop zones, connector badges, the stack reading order and board actions (including Redraw All)
- `src/features/hook/`: the Hook Card, its hover menu, Copy and its fallback dialog, and the pure hook sentence builder
- `src/features/genres/`: the Genres panel, the genre count pill, the Genres button and the pure genre rules
- `src/features/notes/`: notes
- `src/features/boards/`: the board list with board cards, the More menu (rename, export, delete), the name-only New Board dialog, Import Board File and the delete dialog
- `src/features/settings/`: the settings store (Zustand, no undo), the Settings dialog, its Keyboard list and the version footer
- `src/features/export/`: the Export menu, the text file and board file, and the import checks (the only folder that uses Zod)
- `src/shared/model/`: types and constants (the 12 card types, deck and Modifier deck names, the 21 genres and their names, the format version) and the Settings record with its parser
- `src/shared/storage/`: the only module that touches IndexedDB (Dexie database `gameidea`) or local storage: the 5 board actions, the 3 settings actions, the theme boot script, the tab message and autosave
- `src/shared/store/`: the open board in a Zustand store with zundo undo, and the save status
- `src/shared/ui/`: the design tokens (`tokens.css`), icons, buttons, dialogs (default, wide, panel and settings sizes) and banners
- `src/test/`: fixture boards for unit and browser tests and the story-name check
- `public/icons/`: the deck icons, UI icons and the Hook Card icon
- `tests/e2e/`: Playwright specs, helpers and `fixtures/pools/`
- `public/pools/`: the 11 cue pools
- `scripts/`: the one-time pool split, the size check, the port lock check, the local network HTTPS check and the CSS color check

`docs/architecture.html` holds every technical decision. The spec and phases are in `docs/prd.html`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on each pull request: lint (with the CSS color check), format check, typecheck, unit tests, build, the size check, the port lock check, and Playwright in all 3 browsers. It needs no secrets.
