# GameIdea design handoff, 2026-11-04

## 1. Title and metadata

- Product: GameIdea (working name)
- Bundle date: 2026-11-04
- Bundle version: 2
- Designer: Decaf, with Claude (Cowork) on the live canvas
- Live canvas: https://claude.ai/artifact/8Z27m7aYUEDgXcXVJ5Nx9D (version 1793799578-7772)
- Input for: `/dev-ui-update`

## 2. Fidelity and precedence

Fidelity: final-ish. The changed screens in section 3 are final-ish. The Concept panel frames (`Stack4Chips*`) are final-ish for look and size, and the plan still owns the behavior (`docs/feature-one-pager-board.html`). `ExpTuckIcons` is exploratory and is kept as a record.

Where a mockup and this README disagree, this README wins.

`docs/design-system.html` holds decisions made after the 2026-11-02 handoff (its Handoff log, 2026-11-03). Those decisions win over these mockups where this README does not name a change. Section 12 lists the places where the mockups are older than the design doc.

## 3. Supersedes

This bundle supersedes `docs/design-handoff/` (version 1, 2026-11-02) **by section**. That bundle is consolidated and frozen. It is not edited.

### What changed since the last handoff

| # | Change | Frames | Design-doc sections it changes |
|---|---|---|---|
| A | **Concept panel added.** A panel beside the Hook Card holds settled cards as text-sized chips, in one lane per deck. It has a resize handle (1 or 2 columns), a drop target state, and a collapsed state with a folded stack. | `Stack4ChipsFull`, `Stack4ChipsDrag`, `Stack4ChipsCollapsed` | New section (One-Pager board). Adds to 9.1. |
| B | **Settings tabs.** The Settings dialog has 2 tabs: Appearance and Genres. The Genres panel moved into the Genres tab. The rail lost its GENRES group and Genres button. The dialog is 900 wide. | `Settings`, `Genres`, `Main`, `EmptyBoard`, `Theme*` | 8.2, 9.10, 9.11 |
| C | **Dark theme expanded to cards.** In dark mode, cards, tucked cards, the Modifier card in a drag, and notes are dark. In light mode, cards and notes stay cream, and the Hook Card is white with dark text. | `Main`, `Cards`, `HookCard`, `Combine`, `Connector`, `Tuck`, `RedrawAll`, `RotationHover`, `ExpTuckIcons`, `Theme*`, `Stack4Chips*` | 3 (deviations 4 and 8), 4.2 (accent text rule), 4.5, 9.4, 9.5, 9.12, 10 (last rule) |
| D | **Card coloring.** A card face gets a 1 px edge in its deck card color and a 14% tint of that color. Concept chips use the deck card color for the border and a 28% fill. | `Stack4Chips*` only | 4.4, 4.5. See open question 1. |

Also new, not in the list above:

- `ExpTuckIcons`: the first drawing of the tucked-card type icon and lock. The design doc (Handoff log, 2026-11-03) already settled the final place: bottom-right corner, 4 from the edges. The design doc wins. This frame is a record only.
- 3 old frames (`Stack3Concept*`, "Hook Plus Concept Sheet") were removed from the canvas. They are not in this bundle.

Unchanged frames are in `mockups/` again so that the bundle is complete: `BoardList`, `ListStates`, `Decks`, `States`. Their only change is the `data-props` color list (packaging).

## 4. Base system and deviations

Base: the TheForge visual design, as consolidated in `docs/design-system.html` section 3.

This bundle changes 2 deviations and adds 2. The list stays closed.

1. **Changed (deviation 4).** The Hook Card is dark (`#2A2F38`) in dark mode and white (`#FFFFFF`) in light mode. It keeps the 2 px theme color border in both. Reason: in dark mode the cards are now dark too, so a fixed dark Hook Card no longer stands apart in light mode either. The border carries the identity.
2. **Changed (deviation 8).** Mode now changes card faces, the note and the Hook Card fill. Deck colors, rings, badges and the center icons do not change. Reason: cream cards on a dark canvas were too bright, and the user asked for dark cards.
3. **New.** Concept chips are text-sized pills with square corners (radius 8), not cards. Reason: many settled cards must fit beside the Hook Card.
4. **New.** Settings holds the board's genres in a tab. Reason: fewer rail items, and genres are a setting the user changes rarely.

## 5. Artboards

Frame ID = file name without `.dc.html`. Sizes come from `mockups/canvas.json`.

| File | Frame ID | Screen | What it shows | States drawn | Mode | Changed? |
|---|---|---|---|---|---|---|
| `Main.dc.html` | Main | Board | Full stack, selected Twist card with its strip menu, loose Modifier card, note | rest, selected | dark | C, B |
| `BoardList.dc.html` | BoardList | Board list | Board cards, board menu, New Board dialog | menu open, dialog | dark | no |
| `EmptyBoard.dc.html` | EmptyBoard | Board | No cards, start guide | empty | dark | B |
| `ListStates.dc.html` | ListStates | Board list | No boards, rename in place | empty, editing | dark | no |
| `Decks.dc.html` | Decks | Reference | Deck colors and icons | — | dark | no |
| `Cards.dc.html` | Cards | Component | 4-cue, 2-cue, combined and locked cards | rings shown | dark | C |
| `RotationHover.dc.html` | RotationHover | Component | Ring-half hover on a combined card | hover inner, hover outer | dark | C |
| `HookCard.dc.html` | HookCard | Component | New, selected after Copy, top card not a Player Role, clipboard fallback | 4 | dark | C |
| `Combine.dc.html` | Combine | Component | Modifier drop zones | combine, swap, add on top, split | dark | C |
| `Tuck.dc.html` | Tuck | Component | Tuck slot while dragging | drag | dark | C |
| `Connector.dc.html` | Connector | Component | Badges, word menu, word table | menu open | dark | C |
| `RedrawAll.dc.html` | RedrawAll | Component | Redraw All with a locked card | before, after | dark | C |
| `Genres.dc.html` | Genres | Settings dialog | Genres tab | tab selected | dark | B |
| `Settings.dc.html` | Settings | Settings dialog | Appearance tab | tab selected | dark | B |
| `States.dc.html` | States | Notices | Banners, delete dialog, export menu | 4 | dark | no |
| `ThemeOrangeDark.dc.html` | ThemeOrangeDark | Board | Board in orange | rest | dark | C, B |
| `ThemeOrangeLight.dc.html` | ThemeOrangeLight | Board | Board in orange | rest | light | C, B |
| `ThemeGreenDark.dc.html` | ThemeGreenDark | Board | Board in green | rest | dark | C, B |
| `ThemeGreenLight.dc.html` | ThemeGreenLight | Board | Board in green | rest | light | C, B |
| `ThemeBlueDark.dc.html` | ThemeBlueDark | Board | Board in blue | rest | dark | C, B |
| `ThemeBlueLight.dc.html` | ThemeBlueLight | Board | Board in blue | rest | light | C, B |
| `ExpTuckIcons.dc.html` | ExpTuckIcons | Board | Type icon and lock beside tucked cards | rest | dark | new, record only |
| `Stack4ChipsFull.dc.html` | Stack4ChipsFull | One-Pager board | Hook Train, Concept panel with 7 chips in 5 lanes, 3 loose tinted cards | rest | dark | A, C, D |
| `Stack4ChipsDrag.dc.html` | Stack4ChipsDrag | One-Pager board | A Resource Modifier dragged over the "salt" chip | drag, drop target | light | A, C, D |
| `Stack4ChipsCollapsed.dc.html` | Stack4ChipsCollapsed | One-Pager board | Folded Hook Train, collapsed Concept panel | collapsed | dark | A, C |

25 frames.

## 6. Tokens

`tokens.json` is the only token file in this bundle. It holds every value, with the changes listed under `_changes`. This bundle has no `_ds/` folder.

Usage rules:

- Card face tokens come from `cardFaces.dark` or `cardFaces.light`, chosen by the mode. Deck colors (`decks.*.card`, `decks.*.rail`) do not depend on the mode.
- The Hook Card label uses the accent text color of the current mode (`accentTextOnDark` or `accentTextOnLight`). This replaces the rule "the Hook label always uses the dark-mode accent text".
- Lane labels in the Concept panel use the deck rail color in dark mode and the deck card color in light mode. This is the same rule as the rail icons.
- Chip fill and card tint are the deck **card** color at an alpha (28% and 14%). They are not separate tokens.
- The tab underline and the drop-target outline on a chip follow the existing outline rule (design doc 4.2).

### Colors drawn with no token name

These values are drawn. The names are proposals. Confirm or rename them.

| Value | Proposed name | Use |
|---|---|---|
| `#3A404B` | `--card-edge` (dark) | 1 px inset edge on a dark card without deck tint. Not needed if open question 1 is yes. |
| `#C9B6F0` | `--zone-text` (dark) | Modifier drop-zone label on a dark card |
| `#2E2A22` | `--note-bg` (dark) | Note paper in dark mode |
| `#4A4436` | `--note-border` (dark) | Note edge in dark mode |
| `#C9BFA6` | `--note-label` (dark) | Note title label in dark mode |

Dark-mode card values that reuse existing tokens: face `#2A2F38` = `--hook-bg`, cue `#A9ADB6` = `--text-muted`, active cue `#ECEAE4` = `--text`, adjective `#A88BE6` = `--rail-modifier`, divider `#4A505C` = `--border-strong`.

Known one-offs from version 1 (still drawn, token wins): `#1E428A` in `RotationHover` → `--ring-hover-role`. `#A9C3F2` in `HookCard` → `--rail-role`.

## 7. Typography and icons

No change to families, weights or the role table (design doc section 6).

New roles:

| Role | Family · size / weight | Use |
|---|---|---|
| Settings tab | Inter 14/600 | Appearance, Genres |
| Concept header | Display 12/600, 0.08em, uppercase | "Concept" |
| Lane label | Inter 12/600 | "Mechanics", "Resources" |
| Concept chip | Inter 13/600 | Chip text |
| Count pill | Inter 11/600 | "7 Cards", "5 Cards" |

New icons, all Lucide-style stroke 2.2:

- Lane label icons: the deck icon at 14.
- Resize handle: 2 vertical lines at 14.
- Expand Stack and the collapsed Concept button: chevrons-up-down at 16 and 14.

Removed: the sliders icon (the rail Genres button is gone).

## 8. Shell

Changed: the left rail. The GENRES group label and the Genres button are removed. All other rail items, sizes and order are unchanged (design doc 8.2).

On a One-Pager board, the frames draw the same rail as a Free Form board. The footer chip reads "15 cards · 1 hook · 1 concept". The collapsed frame reads "12 cards · 1 hook · 1 concept · folded".

## 9. Per-screen specs

All values are CSS px at 100% zoom. Only new or changed parts are given. Everything else is as in `docs/design-system.html`.

### 9.1 Cards in dark mode (Main, Cards, HookCard, Combine, Connector, Tuck, RedrawAll, RotationHover, Theme*Dark)

- Face `#2A2F38`. Every tucked card uses the same face. The 4 cream tucked shades are not used in dark mode.
- Edge: inset 1 `#3A404B`. Shadow `0 6px 18px rgba(0,0,0,0.45)`.
- Cue text `#A9ADB6`. Active cue `#ECEAE4`. Adjective, active or not, `#A88BE6`.
- Ring gap lines and ring arrows: `#2A2F38` (the face color).
- 2-cue divider `#4A505C`. Combined-card dot border `#2A2F38`.
- The small Modifier card in a drag (`.mini`) uses the same face and text.
- Drop-zone label `#C9B6F0`. The zone fill and dashed border do not change.
- Center icon circles, rings, badges and the lock badge do not change.

### 9.2 Cards in light mode (Theme*Light)

No change. Cream faces and the 4 tucked shades, as in design doc 4.5.

### 9.3 Hook Card

- Dark mode: no change.
- Light mode: fill `#FFFFFF`. Border 2 `--accent`. "Hook" label in the light-mode accent text color (`#B4531A`, `#2B5FB8`, `#1F7A4F`). Sentence `#1B1E24`. Shadow `0 8px 22px rgba(0,0,0,0.18)`.
- Collapsed stack: a count pill at the right end of the header. 22 tall, padding 0 9, radius 11, fill `--accent`, text 11/600 `--on-accent`, "5 Cards".

### 9.4 Note (Main, ExpTuckIcons, Theme*Dark)

- Dark mode: fill `#2E2A22`, border 1 `#4A4436`, label `#C9BFA6`, text `#ECEAE4`, shadow `0 8px 22px rgba(0,0,0,0.45)`.
- Light mode: no change.

### 9.5 Settings dialog, Appearance tab (Settings)

- Dialog: 900 wide (was 760). Padding 24 28 22. Radius 14. Over `--scrim`.
- Header: title "Settings" Display 22/700, close button 44 × 44, padding-bottom 10.
- Tab bar: gap 4, bottom border 1 `--border`, margin-bottom 4.
  - Tab: 44 tall, padding 0 14, 14/600 `--text-muted`, bottom border 2 transparent, margin-bottom -1.
  - Selected tab: `--text`, bottom border 2 `--accent`.
- Scope line: 13, line height 1.5, `--text-muted`, margin-top 14. "These settings apply to every board in this browser. A change applies at once."
- Sections: Appearance (Mode, Theme color), Canvas (Snap to grid), Keyboard. Sizes as design doc 9.11.
- Mode help text is now: "Dark or light screens. Cards are dark in dark mode and cream in light mode."
- Footer: version line and Done (primary, 44 tall, padding 0 20).
- The Settings rail button shows as pressed while the dialog is open: fill `--surface-raised`, border 1 `--accent`.

### 9.6 Settings dialog, Genres tab (Genres)

- Same dialog, header and tab bar as 9.5. The Genres tab is selected.
- Scope line: "These genres apply to this board only. Pick genres at the top. Each genre you pick shows on the 4 genre decks below, already on. Turn one off to keep it out of that deck. A change applies to the next draw only. Cards on the board keep their cues. The other 7 decks do not use genre."
- Top section: padding 16 0, gap 12. Label "All 4 decks" and an "All on" button, 36 tall, ghost style. 21 chips, 36 tall, padding 0 12, radius 18, 13. On and off styles as design doc 9.10.
- Deck rows: Mechanic, Resource, Progression, Constraint. Row padding 14 0, top border 1. Name column 170 with the deck icon in its rail color. Chips 32 tall, padding 0 10, 12.
- Footer: top border 1, padding-top 16. Note text 12 `--text-muted`. Done button 44.
- There is no separate Genres panel and no Genres rail button.

### 9.7 Concept panel, full (Stack4ChipsFull)

- Place: left = Hook Card left + 240 + 56. Top = Hook Card top.
- Panel: 232 wide (1 column). Padding 16. Radius 12. Gap 12. Fill `--surface`. Border 1 `--border`. Shadow `0 8px 22px rgba(0,0,0,0.4)`. The height grows with the content.
- Header: "Concept" Display 12/600, 0.08em, uppercase, `--text-muted`. Count pill 22 tall, padding 0 9, radius 11, border 1 `--border-strong`, 11/600 `--text`, "7 Cards". Gap 8.
- Lane: a label, then the chips. Gap 6.
  - Label: deck icon 14 and the plural deck name, 12/600, gap 6, in the lane color (section 6).
  - Chips wrap side by side. Gap 8.
- Chip: 36 tall, padding 0 12, radius 8, border 1 deck card color, fill deck card color at 28%, text 13/600 `--text`, no icon, no wrap.
- Lanes drawn: Mechanics, Resources, Settings, Mood, Twist, in rail order. Empty decks have no lane.
- Resize handle: 24 × 44, radius 8, border 1 `--border-strong`, fill `--surface`, icon 14 `--text-muted`. It sits on the right edge, centered on the panel height, 12 outside the edge. Cursor ew-resize. aria-label "Resize Concept, snaps to 1 or 2 columns".
- Loose cards on the canvas use the card tint (section 4, deviation and open question 1).

### 9.8 Concept panel, drop target (Stack4ChipsDrag, light mode)

- A Resource Modifier card is dragged over the "salt" chip: rotate 3°, scale 1.04, `--shadow-drag`.
- The target chip gets an outline 2 `#6E48B5`, offset 3.
- No lane highlight and no "Add to …" box are drawn. Both were removed on purpose.
- Light-mode panel: fill `#FFFFFF`, border `#DDD8CE`. Chip text `#1B1E24`. Lane labels in the deck card color.

### 9.9 Collapsed stack and Concept panel (Stack4ChipsCollapsed)

- Folded stack: the Hook Card with 3 card layers behind it. Each layer is offset 6 right and 7 down from the one above. Layer faces in dark mode: `#2B303A`, `#2A2F38`, `#23272F`.
- Expand Stack button: 20 below the Hook Card, left-aligned with it. 44 tall, padding 0 14, radius 8, fill `--surface`, border 1 `--border`, 13/600, icon 16, gap 8.
- Collapsed Concept: a button at Hook Card right + 56, Hook Card top + 38. 44 tall, padding 0 14, radius 10, fill `--surface`, border 1 `--border`, shadow `0 8px 22px rgba(0,0,0,0.4)`. Content: "Concept" 13/600, the count pill, icon 14.

### 9.10 Card tint (Stack4Chips*)

- Edge: inset 1 in the deck card color.
- Tint: the deck card color at 14% over the face.
- Drawn on canvas cards and tucked cards in both modes. The dark face is `#2A2F38` under the tint. The light face is the cream face under the tint.
- With the tint, the dark card has no `#3A404B` edge, and its shadow is `0 6px 18px rgba(0,0,0,0.35)`.

## 10. Interaction contracts

No change to design doc section 10, except these:

1. Mode changes card faces, tucked faces, the note and the Hook Card fill (replaces the last rule of design doc section 10).
2. The Settings dialog opens on the Appearance tab from the rail. A tab change is instant. It is not an undo step.
3. Genre changes in the Genres tab apply to the open board only. They are not in the undo history (as before).
4. Concept panel behavior is owned by `docs/feature-one-pager-board.html`: drop routing, pop-out by double-click, drag out, Modifier combine on a chip, and 1 undo step for each action.
5. The resize handle snaps the panel to 1 or 2 columns. No other width is allowed. A resize is 1 undo step and saves on release.
6. Expand Stack and the collapsed Concept button each toggle one view. See open question 4.

## 11. Decisions

1. Dark mode has dark cards. Changes design doc 4.5, deviation 8 (section 3) and section 10.
2. The Hook Card is white in light mode, and its label uses the mode's accent text color. Changes design doc deviation 4 and the accent text rule in 4.2.
3. The note is dark in dark mode. Changes design doc 4.5 and 9.12.
4. Settings has 2 tabs, Appearance and Genres. The Genres panel becomes the Genres tab. Changes design doc 9.10 and 9.11.
5. The rail has no GENRES group and no Genres button. Changes design doc 8.2 and the M3 row of section 16.
6. The Settings dialog is 900 wide. Changes design doc 9.11.
7. The Mode help text reads "Dark or light screens. Cards are dark in dark mode and cream in light mode." Changes design doc 9.11.
8. Concept chips show no deck icon. The lane label carries the icon. Changes `feature-one-pager-board.html` §Blast radius (features/card/: "deck icon and active text").
9. The Concept panel width snaps to 1 column (232) or 2 columns. Adds to `feature-one-pager-board.html` §Scope ("resizable with a handle") and fills its assumption "the panel width has a minimum and a maximum".
10. Lanes are labeled with the plural deck name and the deck icon. Adds to `feature-one-pager-board.html` §Scope (Lanes).
11. The Modifier drop target on a chip is an outline in the Modifier color. Adds to `feature-one-pager-board.html` §Drop routing.
12. The Concept panel sits 56 to the right of the Hook Card, top-aligned. Adds to `feature-one-pager-board.html` §Scope ("a fixed place to the right of the Hook Card").

## 12. Details the plan does not state

The mockups show these. Confirm or remove each one.

1. A folded Hook Train with an "Expand Stack" button, and a count pill on the Hook Card header ("5 Cards").
2. A collapsed Concept panel that shows as one button with a count.
3. A footer suffix "· folded" when the stack is folded.
4. The footer count. `Stack4ChipsFull` reads "15 cards", which counts the 3 loose cards. The feature says the footer does not count loose cards. `Stack4ChipsCollapsed` reads "12 cards" for the same board.
5. The Genres tab is board-scoped inside a dialog that is otherwise app-wide. The 2 tabs have 2 different scope lines.
6. The Settings rail button looks pressed while Settings is open.
7. Dark tucked cards all share one face. Light tucked cards get darker with depth.

The mockups are older than the design doc in these places. The design doc wins, and the mockups were not redrawn:

- Card and Hook Card radius: drawn 14, design doc 7.
- Mechanic icon: drawn as repeat, design doc wrench.
- Strip menus: drawn as text buttons, design doc icon buttons with tooltips. The Hook Card menu opens on hover, not on click (`HookCard` caption text).
- Tucked type icon and lock: drawn beside the card (`ExpTuckIcons`), design doc bottom-right corner on the card.
- The Genres tab footer still says "Cues tagged Generic fit every genre and are always on." The design doc dropped the Generic line.
- The New Board dialog (`BoardList`) says "Change them in the Genres panel." The panel is now the Genres tab.

## 13. Not mocked up

- The New Board dialog with the board kind choice (One-Pager or Free Form).
- The One-Pager empty state, and the rail on a One-Pager board if it differs.
- The board list label "One-Pager".
- The Concept panel at 2 columns, and the panel while it is resized.
- A lane appearing during a drag (the feature says the dragged card's lane shows).
- The drop hint that names the combine result, for example "Stolen Salt".
- A chip being dragged out, and a pop-out by double-click.
- The Concept panel in dark mode during a drag, and in light mode at rest.
- Settings, both tabs, in light mode.
- Card tint on the Free Form frames (open question 1).
- The component frames (`Cards`, `HookCard`, `Combine` and the others) in light mode.
- Everything listed in design doc section 15 that is still open.

## 14. Open questions

1. **Card coloring scope.** The deck edge and 14% tint are drawn only on the Concept frames. Do all cards on every board get them? If yes, the `#3A404B` edge goes away. Decides: user.
2. **Token names.** Confirm the 5 proposed names in section 6. Decides: user.
3. **Genres tab outside a board.** What does the Genres tab show when Settings opens from the Board list, where no board is open? Decides: user.
4. **Folded stack and collapsed Concept.** Are these in the One-Pager feature? Is the folded state saved with the board? Decides: user, then `/dev-add-feature` if yes.
5. **Footer count on a One-Pager board.** Count loose cards or not (section 12, item 4)? Decides: user.

## 15. Accessibility

Measured 2026-11-04 (WCAG contrast ratio):

- Dark card text: `#ECEAE4` on `#2A2F38` is 11.2:1. `#A9ADB6` on `#2A2F38` is 6.0:1. `#A88BE6` on `#2A2F38` is 4.8:1.
- Tinted cards: the inactive cue is 5.3:1 or better in dark mode and 4.7:1 or better in light mode, for every deck.
- Dark note: `#ECEAE4` on `#2E2A22` is 11.9:1. `#C9BFA6` on `#2E2A22` is 7.8:1.
- Light Hook Card: `#1B1E24` on `#FFFFFF` is 16.7:1. The label colors on white are 5.0:1 (orange), 6.1:1 (blue) and 5.3:1 (green).
- Chips: `#ECEAE4` on a 28% deck fill over `#23272F` is 9.6:1 or better for every deck. `#1B1E24` on a 28% fill over `#FFFFFF` is 10.7:1 or better.
- Chips are 36 tall, below the 44 px target. Same deviation as rail buttons (mouse-only desktop).
- Tabs are 44 tall, with `role="tablist"`, `role="tab"` and `aria-selected`.
- The resize handle has an aria-label and is 44 tall.
- Not specified: keyboard access to chips and the resize handle, and focus style on tabs.

## 16. Assets and licensing

No change from design doc section 14. Fonts are bundled with `@fontsource`. The mockups load them from Google Fonts, and the app must not. Icons are Lucide (ISC). The new icons (chevrons-up-down, the 2-line grip) are in Lucide.

## Bundle notes

- `mockups/` holds every frame and `canvas.json`. The canvas runtime `support.js` is not included. Each `{{accent}}` has a default, so each file renders on its own.
- Packaging change: each `data-props` color list now holds the 3 theme colors. The canvas had old placeholder colors there. No design value changed.
- `screenshots/` holds a render of each frame and the frame index.
- `reference/` holds copies of the plan docs and the design doc as they were on 2026-11-04. They are frozen. `docs/` wins over them.

## Consolidated

This bundle was consolidated into `docs/design-system.html` on 2026-11-04 by `/dev-ui-update`. The design doc is now authoritative. The `reference/` copies are historical, and `docs/` wins over them. The user dropped the folded stack, the collapsed Concept panel and the 1-or-2-column snap, and settled the 5 open questions. See the design doc's Handoff log.
