# Game Engine

> The pure, transport-agnostic logic layer that implements the Royal Game of Ur rules.

**Last updated:** 2026-04-11  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[architecture]], [[match-configs]], [[transport-layer]], [[zustand-game-store]]

---

## Location

`logic/` — five files, no React or Nakama dependencies:

| File | Role |
|---|---|
| `types.ts` | Core type definitions |
| `engine.ts` | `createInitialState`, `rollDice`, `getValidMoves`, `applyMove` |
| `rules.ts` | Capture rules, rosette protection, extra-turn logic |
| `constants.ts` | Board layout: `isRosette`, `isWarZone` tile classifiers |
| `pathVariants.ts` | Path coordinate lookup per variant |
| `matchConfigs.ts` | All `MatchConfig` definitions and helpers |
| `bot/` | Bot AI (`getBotMove`) |

---

## Core Types (`types.ts`)

```
PlayerColor: 'light' | 'dark'

Piece
  id: string          // e.g. 'light-3'
  owner: PlayerColor
  position: number    // path index: -1 = reserve, pathLength = finished
  isFinished: boolean

Player
  color: PlayerColor
  pieces: Piece[]
  capturedCount: number
  finishedCount: number

GamePhase: 'rolling' | 'moving' | 'ended'

GameState
  currentTurn: PlayerColor
  rollValue: number | null   // 0–4 (4 binary dice)
  phase: GamePhase
  matchConfig: MatchConfig
  light: Player
  dark: Player
  winner: PlayerColor | null
  history: string[]

MoveAction
  pieceId: string
  fromIndex: number
  toIndex: number

TileNode (for board rendering)
  type: 'normal' | 'rosette' | 'safe' | 'war'
  coord: { row, col }
  pathIndexLight?: number
  pathIndexDark?: number
```

---

## Engine Functions (`engine.ts`)

**`createInitialState(matchConfig?)`** — builds a fresh `GameState`. All pieces at position `-1` (reserve), `currentTurn: 'light'`, `phase: 'rolling'`.

**`rollDice()`** — rolls 4 binary "tetrahedral" dice (each 0 or 1 with equal probability). Returns sum 0–4.

**`getValidMoves(state, roll)`** — returns all legal `MoveAction[]` for the current player given a roll value. Key logic:
- Skips pieces already finished
- Deduplicates "enter from reserve" (multiple pieces at -1 treated as one choice)
- Blocks moves that overshoot the path (`targetIndex > pathLength`)
- Blocks moving onto a friendly piece
- Blocks capturing on protected war tiles (shared rosette in `standard` variant)
- Finishing (landing exactly on `pathLength`) is always legal if a piece can reach it

**`applyMove(state, move)`** — returns a new `GameState` (deep clone, no mutation). Applies the move, handles:
- Bearing off (sets `isFinished`, increments `finishedCount`)
- Capture (resets opponent piece to `-1`, increments `capturedCount`) — only on war tiles where `isContestedWarTile` is true
- Extra turn (stays `currentTurn`, resets to `phase: 'rolling'`) or switches turn
- Win condition (`finishedCount >= pieceCountPerSide → phase: 'ended'`, sets `winner`)

---

## Rules (`rules.ts`)

Three rules variants control two key behaviors:

| Variant | War tile rosette capturable? | Extra turn on capture? |
|---|---|---|
| `standard` | No (protected) | No |
| `capture` | Yes | Yes |
| `no-capture` | No captures anywhere | No |

- **`isProtectedFromCapture(config, coord)`** — true if landing there doesn't allow capture
- **`isContestedWarTile(config, coord)`** — true if capturing is allowed here
- **`shouldGrantExtraTurn(config, { didCapture, landedOnRosette })`** — extra turn if landing on any rosette, OR if `capture` variant and a capture happened

---

## Path System (`pathVariants.ts`)

Pieces move along a **variant-specific path** indexed 0 to `pathLength-1`, finishing at `pathLength`. The board has shared "war zone" tiles in the middle row. Each player has a private upper/lower lane.

Two variants exist:
- `default` — standard historical path
- `full-path` — a longer route used by the "Extended Path" game mode

`getPathCoord(variant, color, index)` maps a path index to board `{row, col}` coordinates. Used to check if two pieces from opposite sides are on the same tile (for capture detection).

---

## Bot (`logic/bot/`)

`getBotMove(gameState, rollValue, difficulty)` returns a `MoveAction | null`. The bot always plays as `dark`. Difficulty levels affect move selection strategy (random vs. heuristic-weighted). The [[zustand-game-store]] and [[game-loop]] hook orchestrate bot timing.
