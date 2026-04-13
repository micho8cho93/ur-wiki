# Tournament Flow

> End-to-end lifecycle of a public tournament: registration, bracket creation, match launch (including the race condition), in-match play, result recording, and round advancement.

**Last updated:** 2026-04-12 (commits `a1e996f4`, `eddbabca`)  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[matchmaking]], [[nakama-runtime]], [[match-protocol]], [[zustand-game-store]], [[q-tournament-bugs]]

---

## Key Files

| File | Role |
|---|---|
| `backend/modules/tournaments/public.ts` | `rpcLaunchTournamentMatch`, `maybeStartBracketForRun`, bracket notifications |
| `backend/modules/tournaments/bracket.ts` | Bracket creation, completion, participant state |
| `backend/modules/tournaments/liveStatus.ts` | Stale detection thresholds |
| `services/tournaments.ts` | Client-side RPC callers and response normalizers |
| `src/tournaments/useTournamentDetail.ts` | Tournament detail hook — polling + socket notification listener |
| `shared/tournamentNotifications.ts` | Notification constants, payload type, type guard |
| `shared/tournamentBots.ts` | Bot seeding helpers |
| `shared/tournamentLobby.ts` | Lobby state helpers |

---

## Phase 1 — Registration (`status: "scheduled"`)

Players call `tournamentJoin` RPC. The backend appends a `TournamentParticipant` to the `TournamentRecord` stored in Nakama storage. At this point `participant.status = "joined"`. Nothing else happens until the tournament transitions to "live".

---

## Phase 2 — Tournament Start (`status: "scheduled" → "live"`)

An operator calls `tournamentStatusUpdate` RPC with `status: "live"`. This triggers `maybeStartBracketForRun`. That function:

1. Calls `isPublicRunFull` — compares entrant count to `maxEntrants`
2. If full, calls `createSingleEliminationBracket` with the participants list

### `createSingleEliminationBracket`

Creates two parallel arrays and writes them to storage:

**`bracket.entries[]`** — one entry per match slot:
```
{ entryId, round, playerAUserId, playerBUserId, status: "ready", matchId: null }
```
All round-1 entries start with `status: "ready"`. Bye entries have no opponent and are automatically advanced.

**`bracket.participants[]`** — one per registered player:
```
{ userId, state: "waiting_next_round", currentRound: 1, currentEntryId: <round-1-slot>, activeMatchId: null }
```

**Critical**: All participants are set to `state: "waiting_next_round"` immediately on bracket creation — there is no intermediate "ready" state. The moment this write commits, all 16 players can launch.

The bracket is written via `updateRunWithRetry` (optimistic concurrency control). Players who poll **before** this write commits see `state: "lobby"`, `canLaunch: false`. This was Bug 1, now resolved via push notifications (see below and [[q-tournament-bugs]]).

### Bracket-Ready Push Notifications

After `maybeStartBracketForRun` commits the bracket, `sendBracketReadyNotifications` pushes a Nakama notification to every registered non-bot participant:

| Field | Value |
|---|---|
| Code | `41_001` (`TOURNAMENT_BRACKET_READY_NOTIFICATION_CODE`) |
| Subject | `tournament_bracket_ready` |
| Content | `{ type, runId, tournamentId, startedAt }` |
| Sender | System user (`00000000-0000-0000-0000-000000000000`) |

**Idempotency**: a random `bracketStartNotificationToken` is written into the run's metadata as part of the same OCC write. Notifications only send if the committed token matches the one this invocation generated — prevents duplicate blasts from concurrent `maybeStartBracketForRun` calls.

---

## Phase 3 — Client Polling and `canLaunch`

The client calls `get_public_tournament` RPC periodically (every `DETAIL_POLL_INTERVAL_MS = 4,000ms`). The server runs `buildPublicParticipationState`:

```
bracket exists?
  └─ no  → return { state: "lobby" }
  └─ yes → resolvePublicParticipantBracketState(bracket, userId)
             └─ getTournamentParticipantCanLaunch(participant, entry)
                  returns true when:
                    participant.state === "waiting_next_round"
                    AND entry.status === "ready" OR "in_match"
```

When `canLaunch: true`, the client shows the "Enter Match" button.

### Socket Notification Listeners (`useTournamentDetail` + `useTournamentList`)

Both `useTournamentDetail` and `useTournamentList` now attach socket notification listeners (commit `a1e996f4`).

**`useTournamentDetail`** (unchanged from prior commit) attaches `socket.onnotification` while mounted. On `tournament_bracket_ready` for the current `runId`, it immediately calls `refresh()`.

**`useTournamentList`** (new in `a1e996f4`) also attaches a socket listener. On any `tournament_bracket_ready` notification (regardless of runId), it calls `refresh()` — useful for the list view where the player may be registered in any tournament.

Both hooks:
- Use `connectSocketWithRetry({ attempts: 2, retryDelayMs: 800, createStatus: true })`
- Track `isSocketNotificationAvailable` state; the polling interval is only active when `isSocketNotificationAvailable === false`
- Chain previous `socket.onnotification` and `socket.ondisconnect` handlers correctly
- Set `isSocketNotificationAvailable = false` on socket disconnect, re-enabling polling fallback
- Clean up fully on unmount (restore previous handlers, set `isDisposed = true`)

This fixes the redundant polling/notification double-fetch described in [[performance]] #5.

---

## Phase 4 — Match Launch (`rpcLaunchTournamentMatch`)

Both players assigned to the same bracket entry independently call this RPC. Flow:

```
1. Validate player is in the tournament
2. Fetch their bracket entry
3. updateRunWithRetry:
   a. If entry already has matchId → return current (idempotency guard)
   b. If no matchId yet and createdMatchId is null → call nk.matchCreate (once per RPC invocation)
   c. Write matchId into bracket entry
4. Resolve final matchId: activeMatchId ?? committed entry matchId ?? createdMatchId
5. Return matchId to client
6. Client calls nk.matchJoin(matchId)
```

**Idempotent since commit `e6c9c06b`**: `nk.matchCreate` is now called **inside** `updateRunWithRetry`, behind the idempotency guard. A `createdMatchId` closure variable ensures at most one match is created per RPC invocation, even across OCC retries. If another player already committed a `matchId`, this invocation returns that one. One match per entry, guaranteed. See [[q-tournament-bugs]] for the prior race condition details.

**OCC version hardening (commit `a1e996f4`):** `updateRunWithRetry` in `backend/modules/tournaments/admin.ts` now uses `getRunObjectVersionOrThrow(runId, object)` to assert the storage version is a non-empty string before each write. If the version is missing, it throws rather than writing with an empty version (which would silently overwrite any existing document). Conflict errors are detected via `isStorageVersionConflict(error)` (checks for "version check", "version conflict", "version mismatch", "storage write rejected", "already exists" in the error message) and trigger a retry. Other errors propagate immediately.

---

## Phase 5 — In-Match Play

Once both players join via `nk.matchJoin(matchId)`, the [[nakama-runtime]] authoritative match loop takes over. The `MatchState.tournamentContext` is populated with the tournament ID, entry ID, and round number.

Play proceeds identically to a non-tournament match: ROLL_REQUEST → MOVE_REQUEST → STATE_SNAPSHOT cycle. Timer and AFK mechanics are the same as non-tournament matches (which is the source of Bug 3 — see [[q-tournament-bugs]]).

---

## Phase 6 — Result Recording

On game end in `matchLoop`, the backend:

1. Sets `matchEnd` state, sends final `STATE_SNAPSHOT`
2. Calls `completeTournamentBracketMatch`:
   - Sets winner's `participant.state = "waiting_next_round"` in the next round's entry
   - Sets loser's `participant.state = "eliminated"`
   - Advances winner's `currentRound` and `currentEntryId`
   - Checks if next round entry now has both players → if so, sets entry `status = "ready"`
3. ELO, XP, and challenge evaluation also run (see [[nakama-runtime]] → `processCompletedMatch`)

---

## Phase 7 — Subsequent Rounds

Winner polls `get_public_tournament`, sees `canLaunch: true` for round 2, calls `rpcLaunchTournamentMatch` again. Identical launch flow, identical race condition risk. This repeats until the final match.

For a 16-player bracket:
- Round 1: 8 matches → 8 winners
- Round 2: 4 matches → 4 winners
- Round 3 (semifinals): 2 matches → 2 winners
- Round 4 (final): 1 match → champion

---

## Phase 8 — Tournament Completion

When the final match completes, one participant has `state: "waiting_next_round"` with no remaining "ready" entries. The tournament status is set to `"complete"`. `buildPublicRewardPlan` calculates reward allocations based on final standings, the `rewardPoolAmount`, and `rewardCurrency` on the tournament record.

---

## Stale Entry Detection

From `liveStatus.ts`, entries stuck in a state too long are flagged for operators:

| Entry Status | Stale Threshold |
|---|---|
| `"ready"` | 10 minutes |
| `"in_match"` | 25 minutes |

This is informational only — it does not auto-resolve or auto-forfeit stale entries.

---

## Client-Side State (`services/tournaments.ts`)

`launchTournamentMatch` calls `RPC_LAUNCH_TOURNAMENT_MATCH`. `normalizeLaunchTournamentMatchResponse` parses:

| Field | Meaning |
|---|---|
| `matchId` | The Nakama match to join |
| `playerState` | Caller's current participant state |
| `queueStatus` | Match queue status |
| `canLaunch` | Whether caller is allowed to launch |

The client gates the launch button and match join on `participation.canLaunch && participation.state === "waiting_next_round"`.

---

## Participant State Machine

```
joined
  └─(bracket created)→ waiting_next_round
                          └─(match launched)→ in_match
                                                └─(won)→ waiting_next_round (next round)
                                                └─(lost)→ eliminated
```

Byes are automatically advanced: a participant with a bye entry never enters `in_match`, they go directly from `waiting_next_round` (round N) to `waiting_next_round` (round N+1).
