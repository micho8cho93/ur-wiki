# Spectator Mode

> Read-only participation in a live match: watch any active game in real time without joining as a player.

**Last updated:** 2026-04-12 (commit `0d6cc748`)  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[matchmaking]], [[match-protocol]], [[nakama-runtime]], [[transport-layer]], [[expo-router]]

---

## Overview

Spectator mode lets any authenticated user watch a live match without affecting its state. The feature spans the full stack: a new browse screen, a route parameter convention, client-side restrictions in the match view, and backend presence segregation.

---

## Entry Point: `/spectate` Screen

`app/(game)/spectate.tsx` (449 lines, new in this commit) is a game-group screen that lists all currently watchable matches. For each match it shows:

- Match mode (from `modeId`)
- Player labels (up to 2, sourced from server)
- Start time

Tapping a match card navigates to `/match/[id]?modeId=...&spectator=1`. The screen fetches data via `listSpectatableMatches()` from `services/matchmaking.ts`. It supports responsive layout with a wide-screen background variant.

---

## Route Convention

Spectator mode is signalled by the `spectator=1` query parameter on the match route:

```
/match/<matchId>?modeId=<modeId>&spectator=1
```

`src/match/buildMatchRoutePath.ts` was updated to support a `spectator?: boolean` option that appends this parameter. A new unit test (`src/match/buildMatchRoutePath.test.ts`) verifies the URL construction.

---

## Client-Side Restrictions (`app/match/[id].tsx`)

When `spectator=1` is present, `isSpectatorMode` is `true` and the match screen enforces full read-only behavior:

| Feature | Player | Spectator |
|---|---|---|
| Roll dice | ✅ | ❌ — `rollCommandSender` cleared |
| Make a move | ✅ | ❌ — `moveCommandSender` cleared |
| Board interaction | ✅ | ❌ — `allowInteraction = false` |
| Valid moves displayed | ✅ | ❌ — `displayedValidMoves = []` |
| Emoji reactions | ✅ | ❌ — `shouldShowEmojiControls = false` |
| Rematch request | ✅ | ❌ — `isEligibleForRematch = false` |
| XP / progression awards | ✅ | ❌ — `shouldShowAccountRewards = false` |
| ELO ranking updates | ✅ | ❌ — `isRankedHumanMatch = false` |
| Real-time board view | ✅ | ✅ — full STATE_SNAPSHOT stream |

The status pill shows **"Spectator Mode - Watching Live"** instead of the normal connection status.

The socket join call passes metadata: `socket.joinMatch(matchId, token, { role: 'spectator' })`. This metadata is how the backend distinguishes spectators from players.

---

## Backend Presence Handling (`backend/modules/index.ts`)

**New MatchState field:** `spectatorPresences: Record<string, Record<string, nkruntime.Presence>>`

Spectators are stored completely separately from the player `presences` map. This means:
- The two-player match lifecycle (start/end conditions based on player count) is unaffected
- Game commands from spectator presences are rejected with `READ_ONLY` error code (see [[match-protocol]])
- Multiple spectators can watch simultaneously without interfering with each other or the players

**New helper functions:**

| Function | Purpose |
|---|---|
| `getPresenceMetadata(presence)` | Extracts the metadata object from a Nakama presence |
| `isSpectatorPresenceRequest(presence)` | Returns `true` if `metadata.role === 'spectator'` |
| `isSpectatorPresence(state, presence)` | Returns `true` if the presence is already in `spectatorPresences` |

**`matchJoinAttempt` update:** Spectators bypass the `assignments` check — any authenticated user is accepted as a spectator if the match is in progress and not yet ended.

**`matchJoin` update:** Routes spectators into `spectatorPresences` rather than `presences`.

Tests in `backend/modules/matchPresence.rpc.test.ts` verify:
1. A spectator joining a started public match does not become a third player
2. Spectator commands are rejected as READ_ONLY even when the user also has a player assignment

---

## Service Layer: `listSpectatableMatches()`

`services/matchmaking.ts` exports:

```typescript
async function listSpectatableMatches(): Promise<SpectatableMatch[]>

type SpectatableMatch = {
  matchId: string;
  modeId: MatchModeId;
  startedAt: string | null;
  playerLabels: string[];  // max 2, trimmed
};
```

RPC called: `list_spectatable_matches` (HTTP, via `client.rpc`)

The backend RPC is registered in `backend/modules/index.ts` as `RPC_LIST_SPECTATABLE_MATCHES`. It queries `listActiveTrackedMatches` from `backend/modules/analytics/tracking.ts` to source the list of in-progress matches, using the `classification` field (added in this commit) to filter appropriately.

Internal parsing handles both camelCase and snake_case field names from the backend, and filters entries with invalid mode IDs or missing required fields.

---

## Analytics Enhancement

`backend/modules/analytics/tracking.ts` gained a `classification: AnalyticsMatchClassification` field on the `ActiveTrackedMatch` type. This allows `list_spectatable_matches` RPC to filter match types correctly (e.g. exclude bot matches from the spectatable list). The compiled JS output (`backend/modules/build/backend/modules/index.js`) was updated accordingly.
