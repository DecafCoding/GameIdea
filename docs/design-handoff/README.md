# GameIdea design handoff

This folder holds the GameIdea mockups and design tokens. Use it as the input for `/dev-ui-update`.

- Live canvas: https://claude.ai/artifact/8Z27m7aYUEDgXcXVJ5Nx9D
- `mockups/` holds the source of each artboard (`.dc.html`) and the canvas index (`canvas.json`). The files need the canvas runtime to render. Open the live canvas to see them.
- `tokens.json` holds the colors, fonts and sizes.
- `_ds/gameidea/styles.css` holds the same tokens as CSS variables. Where a value disagrees, `styles.css` wins.
- `_ds/gameidea/readme.md` names the base design (TheForge) and the closed list of deliberate deviations.
- `screenshots/` holds a flat render of each artboard. `screenshots/README.md` is the frame index.

Fidelity: high-fidelity static mockups. Popovers and menus are drawn open on purpose. Where a mockup and this README disagree, this README wins. No `reference/` folder is included. The current plan docs in `docs/` are the reference.

The look carries over from TheForge: dark canvas, Space Grotesk and Inter, cream cards, rings on hover, tuck and notes.

## Artboards

| File (frame ID) | Shows |
|---|---|
| `Main.dc.html` | Board screen. Grouped rail, a full hook stack, a selected Twist card, a loose Modifier card, a note. |
| `BoardList.dc.html` | Board list with board cards, the board menu and the New Board dialog. |
| `EmptyBoard.dc.html` | New board with no cards and the 3-step start guide. |
| `ListStates.dc.html` | No boards yet. Rename in place. |
| `Decks.dc.html` | All decks with card color, rail color and icon. |
| `Cards.dc.html` | 4-cue card, 2-cue card, combined card, locked card. |
| `RotationHover.dc.html` | Hover on the inner and outer ring of a combined card. |
| `HookCard.dc.html` | Hook Card: new, selected with its menu, top card not a Player Role, clipboard fallback. |
| `Combine.dc.html` | Modifier drop zones: combine, swap, add on top, split. |
| `Tuck.dc.html` | Tuck hint slot while a card is dragged. |
| `Connector.dc.html` | Connector badges, the word menu and the full word table. |
| `RedrawAll.dc.html` | Redraw All before and after, with a locked card. |
| `Genres.dc.html` | Genres panel. |
| `States.dc.html` | Notices, errors, delete dialog, export menu. |
| `Settings.dc.html` | Settings dialog. |
| `Theme*.dc.html` | Board screen in Orange, Blue and Green, each in dark and light. |

## Decisions made in the mockups

These change or add to `docs/mvp-plan.html`.

### Decks and rail

1. Core order is Player Role, Mechanic, Resource, Goal, Conflict. The rail, the tuck hint and the hook sentence use this order.
2. The Modifier is 3 decks: one for Player Role, one for Resource, one for Setting. The rail shows them as 3 icon buttons on 1 line under the header "MODIFIERS".
3. Any Modifier can combine with any Player Role, Resource or Setting card.
4. Rail buttons are 36 px tall. Icons have no circle. Each icon is drawn in its deck rail color.
5. The 4 genre decks (Mechanic, Resource, Progression, Constraint) show a small orange count of the genres that are on.
6. A Settings button with a gear icon sits at the bottom of the rail.
7. Icons: Resource is a battery. Constraint is shield-x. The Modifiers are user-plus, battery-plus and map-pin-plus.

### Hook Card

8. The Hook Card is dark (`#2A2F38`) with a theme color border. It is 240 x 200 px.
9. Copy, Redraw All and Discard are in a menu above the card. The menu shows only when the user clicks the Hook Card.

### Connector badges

10. A badge is a pill in the color of the card below the seam.
11. "and" joins any 2 cards of the same deck. Player Role uses "and a / an" or "with a / an".
12. Modifiers never get "and". 2 adjectives on one card read side by side.

### Genres panel

13. The top section picks the genres. Each picked genre shows in all 4 deck rows, already on. A deck row can turn a genre off or on again.
14. There is no "All off" button. Each deck keeps at least 1 genre.

### Settings and themes

15. Settings has 3 sections:
    - Appearance: Dark or Light mode, and an Orange, Blue or Green theme color.
    - Canvas: a Snap to grid switch.
    - Keyboard: the key list.
16. Orange dark is the default theme.
17. Only the theme color and the dark or light base change between themes. Deck colors, cards and badges stay the same. The Hook Card stays dark in light mode.

## Colors drawn in the mockups that had no token

These 7 colors are now tokens in `_ds/gameidea/styles.css` and `tokens.json`.

| Drawn value | Token | Use |
|---|---|---|
| `#C9CCD2` | `--text-soft` (dark) | Secondary text one step above muted: hook preview on board cards, deck meaning on the deck chart, the Settings rail label. |
| `#3A3F49` | `--text-soft` (light) | The same role in light mode. |
| `#000000` | `--link-hover` (light) | Link hover in light mode. Dark mode uses `#FFFFFF`. |
| `#8FD6A4` | `--success-text` (dark) | The "Copied" label in the Hook Card menu. Light mode uses `#1F7A4F`. |
| `#4A2E86` | `--zone-text` | The label inside a Modifier drop zone, on the cream card. |
| `#1E428A` | `--ring-hover-role` | The ring half under the pointer. The rule for every deck is the card color mixed with 30% black. The token is `#214281`. The drawn value is close, and the token wins. |
| `#A9C3F2` | none, a mockup error | The "Player Role goes here" slot label on the Hook Card artboard. The rule is: slot label = deck rail color. Use `--rail-role` (`#6F9BEA`). |

The Modifier ring hover in `RotationHover` was drawn as `#4A2E86`. The rule gives `--ring-hover-modifier` `#4D327F`, and the token wins.

## Measurements

All values are CSS px at 100% zoom. Font sizes are size/weight. "Display" means Space Grotesk. All other text is Inter.

### Shell (Board screen, Empty board, Themes)

- **Top bar:** 56 tall. Padding 0 16. Gap 16. Fill `--surface`, bottom border 1 `--border`.
  - Logo tile: 28 x 28, radius 6, fill `--accent`, icon 16.
  - App name: Display 17/700.
  - Divider: 1 x 24.
  - Board name field: 220 wide, min 44 tall, padding 8 10, radius 6, text 15/600, transparent border.
  - Save mark: 8 dot, text 13.
  - Undo and Redo: 44 x 44, radius 8, border 1, icon 18, gap 4.
  - Export: 44 tall, padding 0 14, radius 8, 14/500, icon 16, chevron 12.
- **Left rail:** 232 wide. Padding 10 12 12. Gap 4 between items. Fill `--surface`, right border 1.
  - Group label: Display 11/600, letter spacing 0.08em, uppercase, padding 8 4 2, `--text-muted`.
  - Deck button: min 36 tall, padding 4 10, radius 8, border 1 `--border`, fill `--bg`, gap 10, label 14/600, icon 18 with stroke 2.2 in the deck rail color.
  - Hook Card button: same size. Border 1 `--accent`, fill `--accent-hook-button`, margin-top 4.
  - Modifier row: 3-column grid, gap 4. Each button is centered with padding 4 and an icon 18.
  - Genre count pill: 15 tall, min 16 wide, padding 0 4, radius 8, border 1 `--accent`, fill accent at 18%, text 9/600 in `--accent-text`. It sits at the right edge (margin-left auto).
  - Genres button: 2 lines (label 14/600, subtitle 12/400 muted). Border 1 `--border-strong`, transparent fill.
  - Add note: dashed border 1 `--border-strong`, margin-top 6.
  - Settings: transparent, no border, `--text-soft`, margin-top auto, so it sits at the bottom.
- **Canvas:** fill `--canvas`. Dot grid: 1.2 dots, every 24, offset 12.
  - Zoom control: 16 from bottom and right, padding 4, radius 10, buttons 44.
  - Card count chip: 16 from bottom and left, padding 8 12, radius 8, text 12.

### Cards on the canvas

- Card: 200 x 200, radius 14, `--shadow-card`.
- Cue text: Display 15/600, `--card-cue`. Top cue: 14 from the top, turned 180°. Side cues: centered on a 24 tall line, turned 90° or -90°.
- Active cue: Display 14/700, line height 1.25, 12 from the bottom, padding 0 12, `--card-cue-active`.
- 2-cue card: cues 28 from the top and bottom. Divider: 1 tall at y 99, inset 20, `--card-divider`.
- Center icon: 48 circle at 76, 76, in the deck card color. Icon 24, white.
- Rings, on hover: inner radius 33.5, outer radius 49.5, stroke 13. Divider lines 2 in `--card-face`. Arrow triangles about 6 wide, in `--card-face`.
- Combined-card dot: 16 circle at 92, 130, `--deck-modifier`, border 2 `--card-face`.
- Lock on a full card: 30 circle, 10 from the top and right, fill `--bg`, icon 15. Lock on a tucked strip: icon 13, 12 from the right, 30 from the bottom, in the deck card color.
- Selected card: outline 2 `--accent`, offset 3.
- Card strip menu: 56 above the card. Padding 4, radius 10, border 1, gap 2 to 4. Buttons 44 tall, padding 0 10 to 12, radius 7, 13/500. Discard uses `--danger-text`.

### Stack and Hook Card

- Tuck: each lower card's top is 56 below the card above it, so 56 of it shows.
- Hook Card: 240 x 200, radius 14, border 2 `--accent`, fill `--hook-bg`, padding 14 16 16, gap 10.
  - Header: 24 dot with icon 13. Label "Hook" Display 12/600, 0.08em, uppercase.
  - Sentence: 14, line height 1.45.
  - Stack cards sit 20 in from the Hook Card's left edge.
- Connector badge: 22 tall, padding 0 9, radius 11, 11/600 white, shadow 0 2 6. It is centered on the lower card's left edge, with its top 11 above the seam.
- Badge word menu: 200 wide, padding 6, radius 10, items 44 tall, check icon 16 in `--accent`.

### Tuck hint and drag

- Slot: 200 x 72, starts 16 above the upper card's bottom. Border 2 dashed in the deck card color, with no top border. Radius 0 0 14 14. Fill is the card color at 18%. Label 12/600 in the deck rail color, bottom-aligned, padding-bottom 10.
- Dragged card: rotate 3°, scale 1.04, `--shadow-drag`.

### Modifier combine

- Over a plain card: the whole card is the zone, with a dashed border 2 in `--deck-modifier`, fill at 16%, and a label 12/700 in `--zone-text`.
- Over a combined card: a top band 52 tall (fill 32%) for "Add on top", and a center circle 96 wide at 52, 70 for "Swap".

### Note

- 300 wide. Padding 16 18. Radius 12. Gap 8. Fill `--note-bg`.
- Label: Display 12/600, uppercase. Text: 15, line height 1.5.

### Board list

- Content: max 1180 wide, centered. Padding 40 24 64. Gap 28.
- Title: Display 28/700.
- Grid: columns at least 300 wide, gap 16.
- Board card: padding 18, radius 12, gap 12.
  - Name: Display 17/600. Meta: 12.
  - Hook preview: 13, line height 1.5, padding 10 12, radius 8, fill `--bg`.
  - Deck dots: 10, gap 4. More button: 44.
- Board menu: 200 wide, padding 6, radius 10, items 44.
- New Board dialog: max 420 wide, padding 22, radius 12, gap 14. Field 44 tall.
- No boards: dashed box, padding 40 28, radius 12, icon tile 52.

### Empty board

- Guide panel: max 460 wide, centered on the canvas. Padding 28, radius 14, gap 18. Title Display 22/700. Step circles 26.
- "Start here" tag: 16 from the left, 14 from the top. Padding 8 12, radius 8, 13/600.

### Genres panel

- Scrim `--scrim` over the board. Dialog: 1040 wide, radius 14, `--shadow-dialog`.
- Header: padding 24 28 8. Title Display 22/700.
- Top chips: 36 tall, padding 0 12, radius 18, 13. On: border `--accent`, fill accent at 18%.
- Deck row: padding 14 0, top border 1, name column 170. Chips: 32 tall, padding 0 10, 12.
- Footer: padding 18 28 22, top border 1. Done button 44.

### Settings

- Dialog: 760 wide, padding 24 28 22, radius 14.
- Section: padding 18 0, top border 1, gap 4. Row: min 52 tall.
- Setting name: 14/600. Description: 13, line height 1.4, muted.
- Switch: 44 x 26, radius 13, knob 20.
- Segmented choice: padding 3, radius 9. Buttons 36 tall, padding 0 12, radius 7, 13. Color dot 14.
- Key list: 2 columns, the first 150 wide. Keys 12, padding 2 7, radius 5.

### Notices and menus

- Banner: padding 14 16, radius 10, gap 14, icon 20, button 44.
- Dialog: padding 20, radius 12.
- Export menu: 340 wide, padding 6, radius 12. Item padding 12, gap 12, icon 20. Title 14/600, description 12/1.4, file name 12.

### Redraw All

- New card outline: 2 `--new-card-outline`, offset -2, for 1 second.

## Details the plan does not state

The mockups show these details. Confirm or remove each one.

- The start guide on an empty board goes away when the first card is on the board.
- After a Redraw All, a green outline marks each new card for 1 second.
- A board name cannot be empty.
- After Copy, the menu item shows "Copied" for 2 seconds.
- Snap to grid: hold Alt while you drag to place a card freely.
- The Hook Card menu has Discard.

## Not mocked up

- A note while the user edits its title or text.
- A stack with optional cards (Setting, Mood, Twist, Progression, Constraint) and their badges.
- 2 same-deck cards joined by an "and" badge on a stack.
