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
