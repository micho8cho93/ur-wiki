# Challenge System

> How per-match challenges are defined, shared between client and server, and evaluated authoritatively at match end.

**Last updated:** 2026-04-11  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[nakama-runtime]], [[progression-system]], [[match-configs]], [[zustand-game-store]]

---

## Overview

Challenges are per-match accomplishment goals that award XP and other rewards on completion. The challenge system is designed with a **shared definition contract**: challenge evaluator logic lives in `shared/challenges.ts`, accessible to both the client (for UI preview and progress display) and the backend (for authoritative evaluation). The backend evaluation is the canonical record.

---

## Key Files

| File | Role |
|---|---|
| `shared/challenges.ts` | Challenge definitions: metadata + evaluator functions |
| `backend/modules/index.ts` | `processCompletedMatch` — authoritative evaluation at game end |
| `store/useGameStore.ts` | Challenge state in the store (active challenges, progress) |

---

## Challenge Definition Structure

Each challenge in `shared/challenges.ts` has:

```typescript
type ChallengeDefinition = {
  id: string;                     // unique identifier
  title: string;                  // display name
  description: string;            // player-facing description
  icon: string;                   // UI asset key
  category: ChallengeCategory;    // e.g., 'win', 'capture', 'rosette', 'move-based'
  evaluator: (telemetry: MatchTelemetry) => ChallengeResult;
  // ChallengeResult: { completed: boolean; progressDelta?: number }
};
```

The `evaluator` function takes `MatchTelemetry` — a snapshot of what happened in the match — and returns whether the challenge was completed in that match, plus any progress increment for multi-stage challenges.

---

## Challenge Categories

| Category | Examples |
|---|---|
| `win` | Win a match, win from behind, win without losing a piece |
| `capture` | Capture N pieces in one match |
| `rosette` | Land on a rosette N times |
| `move-based` | Win in under N moves, complete a game without using the center rosette |
| `streak` | Win N matches in a row (cross-match, tracked in storage) |
| `mode-specific` | Win a ranked match, win a bot match on hard difficulty |

---

## Match Telemetry

The telemetry payload passed to evaluators is assembled at game end from the match's history:

- Final board position and piece locations
- Move history (full sequence of moves made by each player)
- Captures made by each player
- Rosette landings by each player
- Total moves per player
- Game duration in ms
- Winner userId
- Final score (pieces home)
- Match mode (`modeId`)
- Whether the loser ever had a piece captured (for "win without being captured" challenges)

---

## Server-Side Evaluation (`processCompletedMatch`)

Called inside `matchLoop` when `matchEnd` is populated:

```
1. Assemble MatchTelemetry from completed gameState + move history
2. Load each player's active challenge set from Nakama storage
3. For each player's active challenges:
   a. Run challenge.evaluator(telemetry)
   b. If completed → mark complete, queue XP reward
   c. If progress-based → increment counter, check if total meets threshold
4. Write updated challenge records back to Nakama storage
5. Credit XP via the progression system (see [[progression-system]])
6. Include challenge results in the notification payload sent to clients
```

All writes happen atomically per-player. The evaluation is idempotent for a given `matchId` — if called twice (e.g., due to a retry), the second call is a no-op because challenges are already marked complete.

---

## Client-Side Usage

Because evaluators live in `shared/`, the client can run them locally for:

- **Progress preview**: "You're 2 captures away from completing this challenge"
- **Post-match preview**: Speculatively showing "you would have completed X" before the server confirms

However, this is display-only. The challenge is not actually marked complete until the server's evaluation writes to storage and the client receives the notification payload.

The [[zustand-game-store]] holds the player's current active challenges and progress counters. These are hydrated from storage at session start and updated when challenge notification payloads arrive after a match.

---

## Challenge Lifecycle

```
Session start
  → load active challenges from Nakama storage into store

During match
  → client may show local progress preview (read-only, not authoritative)

Match ends
  → server runs processCompletedMatch
  → evaluators run against telemetry
  → completed challenges written to storage
  → XP awarded
  → Nakama notification sent to client

Client receives notification
  → store updates challenge state
  → ProgressionProvider and ChallengesProvider re-render with new data
  → completed challenges are surfaced in post-match UI
```

---

## Relationship to Progression and XP

Challenge completion is one of several XP sources. The XP amounts per challenge are defined alongside the challenge metadata in `shared/challenges.ts` and awarded through the same server-side XP grant mechanism as match wins (see [[progression-system]]). This means challenge XP is always consistent — the server is the only place grants are applied.
