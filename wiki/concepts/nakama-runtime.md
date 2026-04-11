# Nakama Runtime Internals

> The authoritative match server: how the backend tick loop, state machine, and timer system work inside `backend/modules/index.ts`.

**Last updated:** 2026-04-11 (AFK rejoin fix — commit `e6c9c06b`)  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[transport-layer]], [[match-protocol]], [[tournament-flow]], [[matchmaking]], [[zustand-game-store]]

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

- The joining userId is in `assignments`
- The match hasn't ended (`matchEnd === null`)

If rejected, the player never appears in `presences`. This is the gatekeeper that prevents uninvited players from joining.

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

## Result Processing (`processCompletedMatch`)

Called at match end (when `matchEnd` is populated):

1. ELO ratings updated for both players (see [[elo-system]])
2. XP awarded for the match result (see [[progression-system]])
3. Challenge evaluators run against the match telemetry (see [[challenge-system]])
4. Nakama notifications sent to both players with the result payload, which the client's `ProgressionProvider` and `EloRatingProvider` consume
