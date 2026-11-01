# Game Concept Card Decks

Nov 1, 2026 · @Decaf Coding

## Filters

The user sets filters before a draw. Filters remove cards that do not fit.

| Filter | Definition | Examples |
| --- | --- | --- |
| Genre | The family of games the idea belongs to. Players use genre to know what to expect. | roguelike, metroidvania, city builder, survival horror, puzzle platformer, deckbuilder |
| Format | The platform, player count, and session length. | mobile puzzle, single-player PC, local co-op, tabletop RPG, 10-minute sessions |
| Style | How the game looks and sounds. | pixel art, text-only, isometric, low-poly 3D, hand-drawn, first-person |

A roguelike is a game with random levels and permanent death. A metroidvania is a game with one large map that opens as the player gets new abilities. Isometric means a fixed view from above at an angle.

## Core decks

The user draws one card from each core deck. The card form is a short lead word that helps the user read the card.

| Deck | Definition | Card form | Examples |
| --- | --- | --- | --- |
| Player Role | Who the player is in the game. | "You are…", 1 to 3 words | retired villain, lighthouse keeper, sentient AI, ghost, child courier, reanimated corpse |
| Mechanic | The action the player does again and again. This is the core loop. | One verb, or a verb and an object | dig, trade, hide, stack, rewind, sacrifice, negotiate, cook |
| Goal | The end state that means the player wins. Actions belong in Mechanic. | "To win…" | reach the surface, keep the town alive for 30 days, find who did it, get everyone home, become king |
| Conflict | The force that stops the player. | "But…", up to 8 words | the tide rises every night, a rival guild wants the same prize, your memory fades, the gods are watching |
| Resource | The thing the player must manage and can run out of. | 1 or 2 words | sanity, fuel, trust, time, light, memories, karma, oxygen |

## Optional decks

The user adds one or two of these decks to a draw.

| Deck | Definition | Card form | Examples |
| --- | --- | --- | --- |
| Setting | Where and when the game takes place. | 1 to 3 words | underwater monastery, neon city, frozen prairie, a moving train, inside a dream |
| Mood | The feeling the game gives the player. | 1 word | cozy, tense, absurd, lonely, hopeful, oppressive |
| Twist | One fact or rule that turns an expectation around. | "Except…" | the villain is right, the treasure is a curse, helping people makes things worse, you are the monster |
| Progression | How the player or the world changes over time. | Short phrase | skill tree, new map areas, moral decay, crew grows, permanent death, items carry over between runs |
| Constraint | A design limit on the whole game. | "Only…" or "No…" | one button, no combat, no text, one room, a three-minute run |

## Stacking card: Modifier

A Modifier is an adjective that the user places on a Player Role, Resource, or Setting card. It works like the Description card in TheForge.

- Examples: cursed, borrowed, flooded, tiny, haunted, stolen.
- "Stolen" placed on "memories" gives "stolen memories" as the resource.

## Output: the Hook

A hook is one or two sentences that make a person want to play the game. The user writes it after the draw. It has four parts.

| Part | What it gives | Source decks |
| --- | --- | --- |
| Who | The player role. It gives the player a fantasy to step into. | Player Role, Modifier |
| What you do | The core action. | Mechanic |
| Stakes | What you want and what stops you. Stakes are what the player can win or lose. | Goal, Conflict, Resource |
| The angle | The one thing that makes this game different from others. | Twist, Constraint, or an unusual mix of cards |

An optional fifth part is a comparison, such as "Stardew Valley meets Dark Souls". Players and publishers use this to place a game fast.

**Template:** "You are \[who\] who must \[what you do\] to \[goal\], but \[conflict\]. \[Angle\]."

**Example from a draw:** "You are a reanimated lighthouse keeper who trades stolen memories for oil to keep the light on until the fleet comes home. But each memory you trade is one you lose."

## Open problem: genre tags

The Genre filter needs a genre tag on every card. A card such as "rewind" fits many genres, so it needs many tags. This adds work when you build the pools.

- [ ] Decide: tag each card with the genres it fits, or have the AI pick cards from a genre on each draw.
