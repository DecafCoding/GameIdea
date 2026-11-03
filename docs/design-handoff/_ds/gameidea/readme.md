# GameIdea base design system

## Base

GameIdea has no separate design system. Its base is the TheForge visual design, from the TheForge mockups canvas. The MVP plan says the look carries over from TheForge.

The base gives GameIdea these parts:

- Dark canvas with a 24 px dot grid.
- Space Grotesk for display text and Inter for body text.
- Top bar 56 px tall. Left rail 232 px wide.
- Cream square cards, 200 px, radius 14.
- A ring control around the center icon. It shows on hover. A click on a ring half turns it one step.
- Tuck: a lower card shows a 56 px strip below the card above it.
- Free-text notes on cream paper.
- A card strip menu above a selected card.
- Orange `#E8742E` as the accent.
- Buttons 44 px tall.

Token values are in `styles.css` in this folder.

## Deliberate deviations from TheForge

This list is closed. Keep all of these. Add none.

1. **Rail buttons have no icon circle.** The icon is drawn in its deck rail color. Buttons are 36 px tall, not 44 px. Reason: the rail holds 13 deck buttons and must fit on one screen. Mouse-only desktop use makes 36 px acceptable.
2. **Deck colors darkened for white text.** Every card color passes 4.5:1 with white badge text. Each deck also has a lighter rail color for dark surfaces. Reason: accessibility.
3. **11 decks plus 3 Modifier decks.** These replace the TheForge story decks. The 3 Modifiers share one purple and differ by icon. They show as 3 icon buttons on 1 rail line.
4. **Dark Hook Card.** It heads a stack. It is 240 x 200 px, with a theme color border. It stays dark in light mode. Reason: it must stand apart from the cream cue cards.
5. **Hook Card actions in a strip menu.** The actions are not shown on the card itself. Reason: less clutter, and it matches the other cards.
6. **Connector badges are pills in the lower card's color.** This was TheForge's option C.
7. **Genre counts replace a genre mark.** A 15 px pill in the theme color on the 4 genre decks shows the number of genres that are on.
8. **Themes.** Dark and Light modes, and Orange, Blue and Green theme colors. Orange dark is the default. Only the base and the accent change between themes. Deck colors, cards and badges stay the same.
9. **Settings button.** It sits at the bottom of the rail and has a gear icon.

## Icons

The icons are Lucide-style stroke icons, 24 px grid, stroke 2.2. They are 18 px in the rail and 24 px in card centers.

The deck icons are listed in `../../tokens.json`.
