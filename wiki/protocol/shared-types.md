# Shared Types

> Cross-cutting types and enums used by both client and server. Single source of truth for game rules, progression, and matchmaking.

**Last updated:** 2026-04-14  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[match-protocol]], [[match-configs]], [[architecture]]

---

## Type Locations

Shared types live in two directories:

- **`logic/`** — pure game engine types (no React, no Nakama SDK)
  - `logic/types.ts` — `GameState`, `Piece`, `Player`, `MoveAction`, board rules
  - `logic/engine.ts` — game engine functions (deterministic, injectable RNG source)
- **`shared/`** — client-server contract types
  - `shared/urMatchProtocol.ts` — [[match-protocol]] op codes and payloads
  - `shared/progression.ts` — XP rules, rank thresholds, award calculations
  - `shared/elo.ts` — ELO formula, K-factors, leaderboard definitions
  - `shared/challenges.ts` — challenge definitions and evaluators
  - `shared/privateMatchCode.ts` — code generation and validation

---

## Core Game Types (`logic/types.ts`)

### GameState

```typescript
type GameState = {
  light: Player;
  dark: Player;
  board: Board;
  currentPlayer: 'light' | 'dark';
  diceResult: number | null;
  phase: 'roll' | 'move' | 'end';
  moveHistory: MoveAction[];
};
```

Represents the complete game state at any moment. Both client and server instantiate and update this type identically via `logic/engine.ts`.

### Player

```typescript
type Player = {
  side: 'light' | 'dark';
  pieces: Piece[];
  capturedBy: boolean;
  score: number;
};
```

Tracks a player's pieces and capture status.

### Board

```typescript
type Board = {
  tiles: Tile[];
  rosettes: Set<number>;
};
```

Tiles are indexed 0–14. Rosettes (safe squares) are at indices 0, 3, 7, 11, 14. Landing on a rosette grants another roll.

### MoveAction

```typescript
type MoveAction = {
  pieceIndex: number;
  source: number;
  destination: number;
  captured: boolean;
  timestamp: number;
};
```

Records every move in the match for analytics and match replay.

---

## Progression Types (`shared/progression.ts`)

### Rank System

```typescript
const RANK_THRESHOLDS = [
  0,       // Rank 1: 0 XP
  100,     // Rank 2: 100 XP
  250,     // Rank 3: 250 XP
  450,     // Rank 4: 450 XP
  700,     // ... (15 ranks total)
  // ...
];
```

Players progress through 15 ranks by accumulating XP. Each rank unlock grants a cosmetic reward (badge, title, etc.).

### XP Awards

```typescript
const XP_AWARDS = {
  RANKED_WIN: 100,
  RANKED_LOSS: 50,
  CASUAL_WIN: 75,
  CASUAL_LOSS: 25,
  TOURNAMENT_WIN: 150,
};
```

Awarded at match end based on match type and outcome. Progression provider evaluates awards server-side via `shared/progression.ts:evaluateProgression()`.

### Ledger Entry

```typescript
type LedgerEntry = {
  matchId: string;
  timestamp: number;
  xpAmount: number;
  reason: 'win' | 'loss' | 'challenge';
};
```

Written to player storage on match end. Idempotent by `matchId` to prevent double-awards on replay.

---

## ELO Types (`shared/elo.ts`)

### Rating

```typescript
type Rating = {
  playerId: string;
  eloScore: number;
  provisional: boolean;
  matchesPlayed: number;
  gamesAtCurrentRating: number;
};
```

Stored in player profile. `provisional` is true for first 20 ranked matches (K=32); becomes false at match 21 (K=24).

### ELO Formula

```typescript
expectedScore = 1 / (1 + Math.pow(10, (opponentRating - myRating) / 400));
newRating = currentRating + K * (actualScore - expectedScore);
```

Where:
- `actualScore` = 1 for win, 0 for loss, 0.5 for draw (not applicable in Ur)
- `K` = 32 (provisional) or 24 (established)
- Rating floor = 100, cap = 2400

---

## Challenge Types (`shared/challenges.ts`)

### Challenge Definition

```typescript
type Challenge = {
  id: string;
  name: string;
  description: string;
  evaluator: (match: MatchResult) => boolean;
  reward: { xp: number; badge?: string };
};
```

Challenges are evaluated at match end. If a player's active challenge evaluator returns true, the challenge is marked complete and the reward is granted.

Example challenges:

- **"Win with all pieces on board"** — `pieces.every(p => p.active)`
- **"Win without opponent capturing"** — `opponent.captured === 0`
- **"Win in under 10 turns"** — `match.turnCount < 10`

All challenges are stored in `shared/challenges.ts` as a single source of truth. The backend imports and evaluates them; the client imports and displays them in the UI.

---

## Match Protocol Types (`shared/urMatchProtocol.ts`)

See [[match-protocol]] for full op code and payload definitions.

Key types:

- **Op codes** — numbers (1 = roll, 2 = move, 100 = state snapshot, etc.)
- **Payloads** — typed JSON messages sent over WebSocket
- **Type guards** — runtime validators (`isRollRequest()`, `isMoveRequest()`, etc.)

---

## Private Match Code (`shared/privateMatchCode.ts`)

```typescript
function generatePrivateMatchCode(): string {
  // 6-character alphanumeric code
  // Letters: A-Z (26), numbers: 0-9 (10) = 36 possibilities
  // 36^6 ≈ 2.17 billion unique codes
}

function validatePrivateMatchCode(code: string): boolean {
  // Valid format: exactly 6 alphanumeric chars
}
```

Used by the private match flow. Code is shared verbally or via chat; player enters it on the `JoinPrivateMatch` screen.

---

## Integration Pattern

A typical feature flow:

1. **Client** reads shared types and calls a function from `logic/` or `shared/`
2. **Client** sends a command via [[match-protocol]] (op code + typed payload)
3. **Server** receives and parses the payload using type guards
4. **Server** processes using the same shared logic (game engine, progression, ELO)
5. **Server** broadcasts updated state using shared types

This ensures client and server are always in sync on the game rules, progression rules, and ELO formula.
