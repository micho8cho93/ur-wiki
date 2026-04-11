# Match Protocol

> The typed message bus between client and Nakama server: op codes, payload types, and flow.

**Last updated:** 2026-04-11  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[transport-layer]], [[architecture]], [[zustand-game-store]], [[game-engine]]

---

## Location

`shared/urMatchProtocol.ts` — shared between client and Nakama backend.

---

## Op Codes (`MatchOpCode`)

| Op Code | Value | Direction | Description |
|---|---|---|---|
| `ROLL_REQUEST` | 1 | Client → Server | Player requests a dice roll |
| `MOVE_REQUEST` | 2 | Client → Server | Player submits a piece move |
| `EMOJI_REACTION` | 3 | Client → Server | Player sends an emoji reaction |
| `PIECE_SELECTION` | 4 | Client → Server | Player hovers/selects a piece (UI hint) |
| `REMATCH_RESPONSE` | 5 | Client → Server | Player accepts/declines rematch |
| `STATE_SNAPSHOT` | 100 | Server → Client | Full authoritative game state broadcast |
| `SERVER_ERROR` | 101 | Server → Client | Server signals a bad client action |
| `PROGRESSION_AWARD` | 102 | Server → Client | XP award notification after match end |
| `ELO_RATING_UPDATE` | 103 | Server → Client | ELO rating change notification |
| `TOURNAMENT_REWARD_SUMMARY` | 104 | Server → Client | Tournament outcome summary |
| `REACTION_BROADCAST` | 105 | Server → Client | Emoji reaction broadcast to both players |
| `PIECE_SELECTION_BROADCAST` | 106 | Server → Client | Piece selection hint broadcast |

---

## Client → Server Payloads

**`RollRequestPayload`** — `{ type: 'roll_request', autoTriggered?: boolean }`  
`autoTriggered` flags bot-driven or auto-roll scenarios.

**`MoveRequestPayload`** — `{ type: 'move_request', move: MoveAction }`  
`MoveAction` has `pieceId`, `fromIndex`, `toIndex`.

**`EmojiReactionRequestPayload`** — `{ type: 'emoji_reaction', emoji: EmojiReactionKey }`  
10 supported emojis, max 10 per match per player.

**`PieceSelectionRequestPayload`** — `{ type: 'piece_selection', pieceId: string | null }`  
Broadcasts hover state to the opponent for visual feedback.

**`RematchResponsePayload`** — `{ type: 'rematch_response', accepted: boolean }`

---

## Server → Client: `STATE_SNAPSHOT` (op 100)

The most important payload. Contains the entire game state plus timing and metadata:

```typescript
StateSnapshotPayload {
  type: 'state_snapshot'
  matchId: string
  revision: number          // monotonically increasing; stale snapshots are dropped
  gameState: GameState      // full authoritative GameState
  players: StateSnapshotPlayers  // userId + title for each color
  rollDisplayValue?: number | null
  rollDisplayLabel?: string | null
  serverTimeMs?: number
  // Turn timer fields:
  turnDurationMs, turnStartedAtMs, turnDeadlineMs, turnRemainingMs
  activeTimedPlayer, activeTimedPlayerColor, activeTimedPhase
  // AFK fields:
  afkAccumulatedMs, afkRemainingMs
  // Reconnect fields:
  reconnectingPlayer, reconnectingPlayerColor
  reconnectGraceDurationMs, reconnectDeadlineMs, reconnectRemainingMs
  // End of match:
  matchEnd?: MatchEndPayload | null
  rematch: StateSnapshotRematch
}
```

**`MatchEndPayload`** — `{ reason, winnerUserId, loserUserId, forfeitingUserId, message }`  
Reasons: `'completed'` | `'forfeit_inactivity'` | `'forfeit_disconnect'`

**`StateSnapshotRematch`** — `{ status, deadlineMs, acceptedUserIds, nextMatchId, nextPrivateCode }`  
Status: `'idle'` | `'pending'` | `'matched'` | `'expired'`

---

## Server → Client: Notification Payloads

**`PROGRESSION_AWARD` (op 102)** — `ProgressionAwardNotificationPayload`  
XP awarded, rank before/after, full `ProgressionSnapshot`.

**`ELO_RATING_UPDATE` (op 103)** — `EloRatingChangeNotificationPayload`  
Old/new rating and delta for both players.

**`TOURNAMENT_REWARD_SUMMARY` (op 104)** — `TournamentMatchRewardSummaryPayload`  
Rich post-tournament summary including ELO, XP, challenge completions, and outcome (`advancing` | `eliminated` | `runner_up` | `champion`).

---

## Encoding

All payloads are JSON-encoded strings:
- `encodePayload(payload)` → `JSON.stringify(payload)`
- `decodePayload(raw)` → `JSON.parse(raw)` (returns `null` on parse failure)

The server runtime receives raw binary from Nakama and decodes it the same way.

---

## Type Guards

Every payload type has a corresponding runtime type guard (`isStateSnapshotPayload`, `isMoveRequestPayload`, etc.). These are used by both the client message handler and the server runtime to safely parse incoming messages.

`isExtendedServerMatchPayload` is the top-level union guard that covers all server→client message types.
