# Zustand Game Store

> The single source of truth for all in-match runtime state. Bridges the game engine, transport layer, and UI.

**Last updated:** 2026-04-11  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[layer-transport]], [[game-engine]], [[match-protocol]], [[architecture]]

---

## Location

`store/useGameStore.ts` — a single Zustand store exported as `useGameStore`.

---

## State Shape (Grouped)

### Core Game State
| Field | Type | Meaning |
|---|---|---|
| `gameState` | `GameState` | The current board state (from [[game-engine]]) |
| `validMoves` | `MoveAction[]` | Legal moves for the current player + roll |
| `playerColor` | `PlayerColor \| null` | Which color this client plays (null until server assigns) |
| `playerId` | `string` | Legacy field, defaults to `'light'` |

### Session & Connection
| Field | Type | Meaning |
|---|---|---|
| `onlineMode` | `'offline' \| 'nakama'` | Current transport mode |
| `nakamaSession` | `Session \| null` | Active Nakama SDK session |
| `userId` | `string \| null` | Nakama user ID |
| `matchId` | `string \| null` | Active match ID |
| `matchToken` | `string \| null` | Token for joining the match socket |
| `socketState` | `'idle' \| 'connecting' \| 'connected' \| 'disconnected' \| 'error'` | WebSocket status |
| `serverRevision` | `number` | Last accepted snapshot revision (for staleness guard) |
| `matchPresences` | `string[]` | User IDs currently in the match socket |

### Command Senders (Nakama mode)
| Field | Type | Meaning |
|---|---|---|
| `rollCommandSender` | `((options?) => void) \| null` | Injected by game screen; sends ROLL_REQUEST |
| `moveCommandSender` | `((move) => void) \| null` | Injected by game screen; sends MOVE_REQUEST |

### Bot (Offline mode)
| Field | Type | Meaning |
|---|---|---|
| `botDifficulty` | `BotDifficulty` | Bot AI difficulty level |

### Authoritative Fields (Online mode)
All prefixed `authoritative*`. Set by `applyServerSnapshot`. Examples:
- `authoritativeTurnRemainingMs` — countdown for the turn timer
- `authoritativeAfkRemainingMs` — AFK warning countdown
- `authoritativeReconnectRemainingMs` — grace period for a disconnected player
- `authoritativeMatchEnd` — match end reason + winner/loser
- `authoritativeRematch` — rematch negotiation status
- `authoritativePlayers` — userId + title for each color

### Post-Match Data
- `lastProgressionAward` — XP award notification from last match
- `lastEloRatingChange` — ELO change from last ranked match
- `lastProgressionSnapshot` — snapshot tied to a match ID
- `lastEloRatingProfileSnapshot` — ELO profile tied to a match ID
- `lastChallengeProgressSnapshot` — challenge progress tied to a match ID

---

## Key Actions

**`initGame(matchId, options?)`** — resets game state for a new match. Sets `matchConfig`, clears all authoritative fields and post-match data.

**`roll(options?)`** — the transport seam for rolling. See [[layer-transport]].

**`makeMove(move)`** — the transport seam for moves. See [[layer-transport]].

**`applyServerSnapshot(snapshot)`** — replaces all state from a `STATE_SNAPSHOT` payload. Guards: matchId must match, revision must not be stale. Recomputes `validMoves` from the new state.

**`setGameStateFromServer(state)`** — simpler version: just replaces `gameState` + `validMoves`. Used in some non-snapshot flows.

**`updateMatchPresences(event)`** — incremental presence update: adds joining user IDs, removes leaving user IDs.

**`reset()`** — full reset to initial defaults. Called when leaving a match.

---

## Design Notes

- **No Nakama SDK imports** — the store doesn't import from `@heroiclabs/nakama-js`. The SDK lives in `services/`. The connection is via the injected `rollCommandSender`/`moveCommandSender` function refs.
- **`EMPTY_AUTHORITATIVE_ONLINE_STATE`** — a const object that zeroes all `authoritative*` fields. Used in `initGame` and `reset` to ensure no stale online state leaks between matches.
- **`validMoves` is always recomputed** on any state update — never stored from user input alone, always derived from the canonical `GameState`.
