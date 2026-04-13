# Nakama Runtime Internals

> The authoritative match server: how the backend tick loop, state machine, and timer system work inside `backend/modules/index.ts`.

**Last updated:** 2026-04-12 (commits `5435613c`, `54b3a797`, `a1e996f4`, `0d6cc748`)  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[transport-layer]], [[match-protocol]], [[tournament-flow]], [[matchmaking]], [[zustand-game-store]], [[spectator-mode]]

---

## Overview

The Nakama backend runs TypeScript modules that implement **authoritative match logic**. Every game state transition originates on the server. Clients only display what the server sends them — there is no optimistic UI (see [[transport-layer]]). The match system is registered at startup; Nakama calls the handler functions at the appropriate lifecycle moments.

---

## Constants

All timing constants are defined at the top of `backend/modules/index.ts`:

| Constant | Value | Meaning |
|---|---|---|
| `TICK_RATE` | `10` | Ticks per second → each tick = 100ms |
| `ONLINE_TURN_DURATION_MS` | `10,000` | Max time per turn before auto-forfeit |
| `ONLINE_AFK_FORFEIT_MS` | `30,000` | Cumulative AFK across entire match before ejection |
| `ONLINE_DISCONNECT_GRACE_MS` | `15,000` | Time to reconnect before disconnect forfeit |
| `ONLINE_RECONNECT_RESUME_MS` | `5,000` | Buffer after reconnect before turn timer resumes |
| `REMATCH_WINDOW_MS` | `10,000` | Window for both players to accept rematch |
| `BOT_TURN_DELAY_MS` | `850` | Simulated thinking delay for server-side bots |

---

## MatchState Shape

`MatchState` is the single mutable object threaded through every tick:

```typescript
type MatchState = {
  presences: { [userId: string]: nkruntime.Presence };
  spectatorPresences: Record<string, Record<string, nkruntime.Presence>>; // NEW: separate pool for spectators
  assignments: { [userId: string]: PlayerColor };   // userId → 'light' | 'dark'
  bot: BotState | null;                              // non-null in bot matches
  gameState: UrGameState;                            // the board, turn, phase, etc.
  revision: number;                                  // OCC counter, incremented on every change
  timer: MatchTimerState;                            // active turn timer
  afk: { [color in PlayerColor]: PlayerAfkState };  // per-player accumulated AFK
  disconnect: { [color in PlayerColor]: PlayerDisconnectState }; // per-player disconnect
  matchEnd: MatchEndState | null;                    // set when game is over
  rematch: RematchState | null;                      // set during rematch window
  tournamentContext: TournamentContext | null;        // non-null in tournament matches
};
```

**Spectator presences** are stored in a separate `spectatorPresences` map, completely distinct from `presences` (the player pool). This ensures that:
- Spectators can never be assigned a player color
- The match start/end logic based on player count is unaffected by spectator joins/leaves
- Game commands from spectators are rejected via the `READ_ONLY` error code (see [[match-protocol]])

---

## Lifecycle Handlers

### `matchInit`

Called once when `nk.matchCreate()` is invoked (either by the matchmaker or by `rpcLaunchTournamentMatch`). Responsibilities:

- Receives creation params: `playerIds`, `modeId`, `tournamentEntryId` (if tournament), any custom fields
- Builds initial `MatchState`: populates `assignments` (userId → PlayerColor), initializes `gameState` (empty board, first turn)
- Sets `tournamentContext` if `tournamentEntryId` is present
- Returns the initial state plus `tickRate: TICK_RATE`

### `matchJoinAttempt`

Called before a player's presence is committed. Validates:

- The joining userId is in `assignments` **OR** the join metadata indicates `role: 'spectator'`
- The match hasn't ended (`matchEnd === null`)

If rejected, the player never appears in `presences`. This is the gatekeeper that prevents uninvited players from joining.

**Spectator join path (commit `0d6cc748`):** `isSpectatorPresenceRequest()` checks the presence metadata for `{ role: 'spectator' }`. Spectators are accepted without being in `assignments`, allowing any user to watch a live match. After `matchJoinAttempt` passes, `matchJoin` routes them into `spectatorPresences` instead of `presences`. Three helper functions manage this:

- `getPresenceMetadata(presence)` — extracts metadata object from the presence
- `isSpectatorPresenceRequest(presence)` — returns `true` if metadata contains `role: 'spectator'`
- `isSpectatorPresence(state, presence)` — checks if a given presence is already stored in `spectatorPresences`

### `matchJoin`

Called after a successful join attempt. Responsibilities:

- Adds the player's presence to `presences`
- **Reconnection path**: if `disconnect[color].disconnectedAt` was set, clears the disconnect state and restores the turn timer from `pausedTurnRemainingMs`
- **AFK reset on rejoin**: if the player had no prior presence, or if a disconnect grace was just cleared, calls `resetAfkOnMeaningfulAction(state, playerColor, nowMs)` — zeroes `accumulatedMs`, `timeoutCount`, and stamps `lastMeaningfulActionAtMs`. Prevents stale AFK debt from a prior disconnected session triggering a delayed forfeit.
- Sends a full `STATE_SNAPSHOT` (op code 100) to the rejoining player, catching them up to current `gameState` and `revision`
- Applies a brief `ONLINE_RECONNECT_RESUME_MS` buffer before restarting the timer

### `matchLeave`

Called when a player's WebSocket closes. Responsibilities:

- Sets `disconnect[color].disconnectedAt = Date.now()`
- If it's the departing player's turn: pauses the turn timer, stores remaining time in `pausedTurnRemainingMs`
- The grace window (`ONLINE_DISCONNECT_GRACE_MS = 15,000ms`) begins. If the player doesn't rejoin in time, the loop will forfeit them.

### `matchLoop`

The core tick function, called 10 times per second. Each invocation, in order:

1. **Process message queue** — all incoming `ROLL_REQUEST`, `MOVE_REQUEST`, `REMATCH_REQUEST`, etc. messages since last tick
2. **Validate each message** — correct op code, sender is in `assignments`, it's their turn, move is legal per game engine
3. **Apply state transitions** — update `gameState`, increment `revision`
4. **Broadcast STATE_SNAPSHOT** — to all presences after each valid state change
5. **Run timer checks** — decrement turn timer, check AFK accumulator, check disconnect grace windows
6. **Check game end** — if `gameState` indicates a winner, populate `matchEnd`, trigger result processing
7. **Run bot turn** if applicable (waits `BOT_TURN_DELAY_MS` after the human's turn)

---

## Timer State Machine

### Turn Timer

Each turn has `ONLINE_TURN_DURATION_MS (10,000ms)` to act. `matchLoop` decrements the timer by `100ms` each tick while the timer is running. When it reaches zero:

- The active player's turn is forfeited
- The engine selects a random legal move (or skips if none)
- Turn passes to the other player
- `timer` resets for the new active player

The turn timer is **paused** when the active player disconnects (`matchLeave`) and **resumed** after `matchJoin` clears the disconnect state plus the `ONLINE_RECONNECT_RESUME_MS` buffer.

### AFK Accumulator

`afk[color].accumulatedMs` is a **running total across the entire match** — it is NOT reset per turn. Each tick where a player is the active player and has not acted, `accumulatedMs` increases by `100ms`.

When `accumulatedMs >= ONLINE_AFK_FORFEIT_MS (30,000ms)`, the player is forfeited from the match entirely (not just from the current turn). This is distinct from the per-turn timer:

- Turn timer → "you didn't act within 10s, we'll auto-move for you"
- AFK accumulator → "you've been slow across 30s total of cumulative turn time, you're ejected"

**On rejoin, AFK debt resets.** As of commit `e6c9c06b`, `matchJoin` calls `resetAfkOnMeaningfulAction` when a player reconnects after a disconnect or joins fresh. This zeroes `accumulatedMs` and `timeoutCount` so prior offline time doesn't count toward the forfeit threshold. A concurrent second session joining (without a disconnect gap) does NOT reset the debt — only a genuine rejoin does. See [[q-tournament-bugs]].

### Disconnect Grace

`disconnect[color].disconnectedAt` is set in `matchLeave`. Each tick, `matchLoop` checks:

```
if (Date.now() - disconnectedAt > ONLINE_DISCONNECT_GRACE_MS) → forfeit
```

During the grace window the turn timer is frozen. On reconnect within the window, the disconnect state is cleared and AFK debt is reset (see above).

---

## Message Processing

All client→server messages follow the [[match-protocol]] op code schema. In `matchLoop`:

| Op Code | Message | Validation | Effect |
|---|---|---|---|
| `1` | `ROLL_REQUEST` | sender's turn, phase === 'rolling' | Rolls dice, computes valid moves, sets gameState, broadcasts STATE_SNAPSHOT |
| `2` | `MOVE_REQUEST` | sender's turn, phase === 'moving', move in validMoves | Applies move, advances turn or ends game, broadcasts STATE_SNAPSHOT |
| `3` | `EMOJI_SEND` | sender is a presence | Broadcasts EMOJI_RECEIVE to all presences |
| `10` | `REMATCH_REQUEST` | matchEnd is set, within REMATCH_WINDOW_MS | If both players accepted, resets gameState and starts new game |

Op code `100` (`STATE_SNAPSHOT`) is server→client only; it is never processed as input.

---

## Tournament Context in the Match

When `tournamentContext` is non-null, the match has an additional responsibility at game end:

- Records the result against the tournament bracket entry (`tournamentEntryId`)
- Calls the bracket completion logic to advance the winner and eliminate the loser
- Writes the updated bracket to Nakama storage

This is what connects the in-match gameplay back to the [[tournament-flow]] bracket progression.

---

## Result Processing (`finalizeCompletedMatch`)

Called at match end (when `matchEnd` is populated). Returns `true` if all result processing committed, `false` if a tournament synchronization failure requires deferral:

1. `syncCompletedMatchEnd` — syncs end state
2. `processCompletedMatchRatings` — ELO update (see [[elo-system]])
3. `awardWinnerProgression` — XP/challenge awards (see [[progression-system]], [[challenge-system]])
4. `processCompletedTournamentMatch` — bracket advancement if `tournamentContext` is set
5. `processCompletedMatchSummaries` — per-player challenge summaries
6. **Tournament deferral guard:** if `tournamentContext` is present and the tournament processing step failed with a retryable failure, `resultRecorded` is set to `false` and the function returns `false` — the tick loop will retry on the next tick
7. `broadcastTournamentMatchRewardSummaries` — sends result notifications to both players
8. `recordMatchEndAnalyticsEvent` — buffered via `AnalyticsEventWriteBuffer` (see below)
9. `maybeFinalizeRecordedTournamentRun` — if this was the final match of the tournament, triggers bracket finalization

All analytics writes within this function are buffered and flushed in a single `nk.storageWrite` call inside a `try/finally` block, ensuring the flush fires even if processing throws (see [[performance]] #12).

---

## Authoritative Dice Roll — Secure RNG (commit `5435613c`)

The server-side dice roll previously used `Math.random()` via the shared `rollDice` function from `logic/engine.ts`. This was replaced with a cryptographically secure random source.

**`rollDice(randomSource?)`** now accepts an injectable `DiceRandomSource = () => number`. The default remains `Math.random` for client-side / offline use.

**`rollAuthoritativeDice(nk?)`** — used exclusively in the backend match loop — provides a secure `randomSource` via `getSecureRandomUnit(nk)`:

```
Priority 1: globalThis.crypto.getRandomValues(new Uint32Array(1)) → CSPRNG
Priority 2: nk.uuidv4() hex slice → cryptographic UUID fallback
Throws:     if neither source is available
```

This ensures tournament and ranked match dice outcomes cannot be predicted or manipulated, which is particularly important for the authoritative (server-side) roll path. Client-side rolls (local game state preview) continue to use `Math.random`.

---

## RPC Payload Hardening (commit `54b3a797`)

`backend/modules/index.ts` received a major hardening pass on all RPC payload parsing. Private match code reservation and join flows were the primary targets:

- All RPC handlers now validate payloads more strictly, failing fast with descriptive error messages rather than operating on undefined fields
- The private match code reservation flow ensures codes are reserved atomically and race conditions in concurrent reservation attempts are handled via OCC version checks
- `backend/modules/privateMatch.rpc.test.ts` expanded with 69 new lines of tests covering the reservation concurrency edge cases
