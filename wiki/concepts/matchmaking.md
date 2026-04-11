# Matchmaking

> How players find each other: ranked queue, private matches, and the matchmaking service layer.

**Last updated:** 2026-04-11  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[transport-layer]], [[nakama-service]], [[match-protocol]], [[architecture]]

---

## Location

`services/matchmaking.ts` — a set of standalone async functions (not a class). Depends on [[nakama-service]] for auth and socket.

---

## Ranked Queue (`findMatch`)

The standard online flow uses Nakama's built-in matchmaker:

```
1. ensureAuthenticatedDevice()         — get/refresh session
2. connectSocketWithRetry(3 attempts)  — open WebSocket
3. socket.addMatchmaker("*", 2, 2)     — add self to pool (2 players required)
4. activeMatchmakerTicket = ticket
5. handlers?.onSearching?.()           — UI shows "Searching..."
6. waitForMatchmaker(socket, ticket, 20s) — listen for onmatchmakermatched event
7. return { matchId, session, userId, matchToken, playerColor: null }
```

Timeouts: 10s to connect, 10s to start matchmaking, 20s to find an opponent.

`activeMatchmakerTicket` is a module-level variable used by `cancelMatchmaking()` to remove the ticket if the user backs out.

**Player color assignment** (`playerColor: null` here) — the server assigns colors when the match begins. The client receives its color via the first `STATE_SNAPSHOT`.

---

## Private Matches

Three RPCs on the Nakama backend:

| Function | RPC | Flow |
|---|---|---|
| `createPrivateMatch(modeId)` | `create_private_match` | Host creates match, gets `{ matchId, modeId, code }` |
| `joinPrivateMatch(code)` | `join_private_match` | Guest joins with 4-char code, gets same fields |
| `getPrivateMatchStatus(code)` | `get_private_match_status` | Host polls to check if guest has joined |

Private match codes are validated by `isPrivateMatchCode` / `normalizePrivateMatchCodeInput` from `shared/privateMatchCode.ts`.

Private matches use a direct RPC (HTTP) call via `client.rpc()`, not the socket — no matchmaker queue involved. After joining, the socket connection and match join flow is the same as ranked.

---

## Error Handling

`normalizeMatchmakingError` wraps all errors into proper `Error` objects. It handles:
- HTTP status codes (401 → "server key invalid" message)
- JSON response bodies with `message` or `error` fields
- Raw string responses
- Default: "No opponents found. Try again later."

---

## Socket vs HTTP

| Operation | Transport |
|---|---|
| Ranked matchmaking | WebSocket (socket.addMatchmaker) |
| Private match create/join/status | HTTP RPC (client.rpc) |
| In-match messages (roll, move, emoji) | WebSocket (socket.sendMatchState) |
| State snapshots from server | WebSocket (socket.onmatchdata) |
| Post-match data (progression, ELO) | WebSocket notifications |

---

## Module-Level State

`activeMatchmakerTicket` is a module-level `let` — not in the store. This means if the module is hot-reloaded or the component unmounts without calling `cancelMatchmaking()`, the ticket reference could be lost. This is a known trade-off of the current architecture.
