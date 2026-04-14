# Backend Layer

> Nakama runtime: authoritative match state, progression, ELO, challenges, and RPCs.

**Last updated:** 2026-04-14  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[architecture]], [[nakama-runtime]], [[match-protocol]], [[layer-transport]]

---

## Stack Overview

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Game Server | Nakama (open source, self-hosted) | WebSocket + RPC server, match orchestration |
| Runtime Language | TypeScript (compiled to JS) | Backend logic runs inside Nakama sandbox |
| Database | PostgreSQL | Persistent storage: users, matches, leaderboards, storage objects |
| Deployment | Docker Compose | Dev: `backend/docker-compose.yml`, Prod: `backend/deploy/docker-compose.prod.yml` |
| TLS (Prod) | Reverse proxy | HTTPS termination and load balancing |

---

## Nakama Runtime Modules

The `backend/modules/` directory contains TypeScript modules that run inside Nakama's sandbox. Key modules:

### Match Handler (`match_handler.ts`)

Manages the match lifecycle:

- **Match join** — validate players or spectators, initialize match state
- **Match loop (tick)** — 10 Hz tick loop, process user commands, emit state snapshots
- **Match leave** — cleanup when a player disconnects
- **Match terminate** — cleanup when match ends

The server runs the same pure game engine as the client (`logic/engine.ts`). All moves are authoritative — the client sends commands, the server validates and applies them, then broadcasts `STATE_SNAPSHOT` messages to all participants.

### RPC Handler (`rpc_handler.ts`)

HTTP/gRPC endpoints called by clients:

- **`private_match_create`** — create a new private match with a 6-char code
- **`private_match_code_verify`** — validate and join a private match by code
- **`list_spectatable_matches`** — fetch list of active matches that can be spectated
- **`rank_match_queue`** — enqueue for ranked matchmaking

### Progression Module (`progression.ts`)

Evaluates XP grants at match end:

- Reads match result from storage
- Evaluates XP rules (win = +100 XP, loss = +50 XP, etc.)
- Writes XP ledger entries (idempotent via `match_id + player_id` key)
- Updates player rank if XP threshold crossed

### ELO Module (`elo.ts`)

Processes rating changes after a ranked match:

- Reads both players' profiles and match result
- Applies ELO formula with K-factors (higher K for provisional players)
- Writes updated ratings to leaderboard storage
- Handles provisional period logic (first 20 matches at K=32)

### Challenge Evaluator (`challenge_evaluator.ts`)

Evaluates challenge conditions at match end:

- Reads challenge definitions from `shared/challenges.ts`
- Evaluates each active player challenge against the match result
- Writes completed challenges to player storage
- Sends challenge-complete notification to client

---

## Storage Schema

Nakama storage uses a 3-tier key structure: `collection / key / version`.

### Key Collections

| Collection | Key | Purpose |
|-----------|-----|---------|
| `user_profiles` | `{player_id}` | ELO rating, rank, leaderboard rank |
| `progression` | `{player_id}:xp_ledger` | XP entries, totals, rank progression |
| `challenges` | `{player_id}:{challenge_id}` | Active/completed challenge state |
| `matches` | `{match_id}` | Match result, analytics data, storage version for OCC |
| `analytics` | `{player_id}:{event_type}` | Batched analytics writes |

All writes use **optimistic concurrency control (OCC)** with version checking. If a write conflicts, the operation retries up to 3 times with exponential backoff.

---

## Match Lifecycle

See [[nakama-runtime]] for the full state machine. High-level flow:

1. **Player 1 joins** → match created, waiting for Player 2
2. **Player 2 joins** → match starts, both players at turn 0
3. **Tick loop runs** (10 Hz):
   - Process incoming commands (roll, move)
   - Update match state
   - Broadcast `STATE_SNAPSHOT` to both players
   - Detect AFK (no input for 5 minutes) or turn timer expiry
4. **Match ends** (one player wins):
   - Finalize match result
   - Award progression and ELO (if ranked match)
   - Evaluate challenges
   - Broadcast `MATCH_END` notification
   - Defer tournament advancement (handled asynchronously)
5. **Match cleanup** → remove from active matches, update statistics

---

## Command Processing

Clients send commands via WebSocket op codes (see [[match-protocol]]):

- **`ROLL_REQUEST`** (op 1) — request a dice roll
- **`MOVE_REQUEST`** (op 2) — request a piece move

The server validates each command:

- Is the player whose turn it is?
- Is the move legal (not blocked, destination exists)?
- If move is legal, update state and broadcast snapshot
- If move is illegal, send error code to client

No optimistic UI: client waits for `STATE_SNAPSHOT` before updating the board.

---

## Presence and Spectators

Nakama presence tracks connected users. The backend segregates players and spectators:

- **`presences`** — players in the match (max 2)
- **`spectatorPresences`** — spectators watching (unlimited)

When a spectator joins:
- Backend stores them in `spectatorPresences`
- Backend sends `STATE_SNAPSHOT` to the spectator (but clears command senders)
- Backend rejects any command from the spectator with `READ_ONLY` error

---

## Async Tasks

Some operations are deferred outside the match loop:

- **Tournament advancement** — when a tournament match ends, the bracket advancement is deferred to avoid blocking the match loop
- **Analytics batching** — analytics events are accumulated in an `AnalyticsEventWriteBuffer` and flushed once at match end, not per-tick

---

## Deployment

### Development

```bash
cd backend
docker-compose up -d
```

Starts Nakama + PostgreSQL. Runtime modules are hot-loaded from `backend/modules/` via Nakama's TypeScript loader.

### Production

See `backend/deploy/docker-compose.prod.yml`. Includes:
- Nakama game server
- PostgreSQL database
- Redis (for session caching, optional)
- Reverse proxy (TLS termination)

Modules are compiled and bundled into the Docker image at build time.

---

## Integration Points

The backend integrates with:

- **Client** — via WebSocket (op codes, payloads) and HTTP (RPC calls)
- **Shared logic** — imports from `logic/` and `shared/` (game engine, XP rules, ELO formula, challenge definitions)
- **PostgreSQL** — via Nakama's storage API (all reads/writes go through the ORM)

See [[layer-transport]] for how the frontend and backend coordinate around match state.
