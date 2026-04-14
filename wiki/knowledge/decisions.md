# Architectural Decisions

> Why the system is designed the way it is: key decisions, trade-offs, and constraints.

**Last updated:** 2026-04-14  
**Sources:** GitHub repo (micho8cho93/ur), [[log]]  
**Related:** [[architecture]], [[layer-frontend]], [[layer-backend]], [[layer-transport]]

---

## No Optimistic UI in Online Mode

**Decision:** Client does not speculatively update the board when the player makes a move. All state changes wait for the server's `STATE_SNAPSHOT` response.

**Why:** 
- Eliminates mismatch between client-predicted state and server-authoritative state (the primary source of online multiplayer bugs)
- Simplifies the model: client is always a pure reflection of server state, never a cache with potential stale values
- Royal Game of Ur is turn-based (not real-time), so the latency of round-trip server validation is acceptable

**Trade-off:** 
- Higher perceived latency (150–300ms round-trip on typical network)
- Simpler, more correct implementation

---

## Single Zustand Store for All State

**Decision:** One Zustand store holds all runtime state: game state, match metadata, user profile, online mode flag, UI state.

**Why:**
- Single source of truth eliminates data synchronization issues
- All components subscribe to the same store, avoiding prop drilling
- [[layer-transport]] can act as a single seam between offline and online modes by checking `onlineMode` flag

**Trade-off:**
- Store can become large and complex as features are added
- Requires disciplined selector usage to avoid unnecessary re-renders

**Mitigation:** Use Zustand's `useShallow` and granular selectors to subscribe to only the fields a component needs.

---

## Shared Game Engine Between Client and Server

**Decision:** `logic/engine.ts` is a pure, portable TypeScript module imported by both the client (Expo) and backend (Nakama runtime).

**Why:**
- Single source of truth for game rules — no risk of client and server having different logic
- Easy to test: the engine has no dependencies on React, Nakama, or any platform-specific code
- Backend can run deterministic move validation (verify a move is legal before applying it)

**Trade-off:**
- Requires the shared logic to be pure (no side effects, no platform-specific APIs)
- If the engine logic needs to change, both client and server must be updated together

---

## Authoritative Dice Rolls Use CSPRNG; Client Rolls Use Math.random

**Decision:** When a player requests a roll in online mode, the server generates the random number via `crypto.getRandomValues` (or Nakama's `nk.uuidv4` fallback for seeded randomness). Client-side offline rolls use `Math.random`.

**Why:**
- Online matches must use cryptographically secure random numbers to prevent cheating (a player could predict `Math.random` with reverse engineering)
- Offline mode (vs bot) does not require CSPRNG because the bot is not trying to cheat; it's just making reasonable moves

**Trade-off:**
- Offline and online rolls have slightly different distributions (negligible in practice)
- Online rolls may be slightly slower (CSPRNG is heavier than Math.random)

---

## Separate Spectator Presence Pool

**Decision:** Spectators are stored in a separate `spectatorPresences` list on the backend; they are not mixed with the players' `presences` list.

**Why:**
- Keeps player presence logic simple (always exactly 2 players)
- Makes it easy to broadcast only to spectators (don't send commands-and-moves streams to them, only state snapshots)
- Avoids accidental inclusion of spectators in "players present" checks

**Trade-off:**
- Backend must manage two presence lists instead of one
- Adds a new code path for join/leave/disconnect logic

---

## No Private Match Spectating (Initially)

**Decision:** Private matches cannot be spectated. Only ranked and casual (public) matches can be spectated.

**Why:**
- Private matches are invite-only; the creator may not want observers
- Simpler feature scope for the initial release
- Public matches are already discoverable via `list_spectatable_matches` RPC

**Future:** Could be extended to allow the match creator to enable/disable spectating.

---

## Progression Grants Idempotent by Match ID

**Decision:** XP ledger entries are keyed by `match_id + player_id` with OCC version checking. If progression is evaluated twice for the same match, the second evaluation is a no-op (same XP awarded, no duplicate).

**Why:**
- Prevents accidental double-awards if the `finalizeCompletedMatch` handler runs twice (e.g., if the notification is delivered twice due to a network hiccup)
- Matches are immutable once finished, so the award for a match is always the same

**Trade-off:**
- Requires read-before-write pattern (fetch the existing ledger entry, check if it exists, then decide whether to write a new one)

---

## ELO Calculation is Batched with Profile Reads

**Decision:** When processing ELO for a ranked match, the server batches the idempotency check + both players' profile reads into a single `storageRead` call, then writes both updated profiles in a single call.

**Why:**
- Reduces database round-trips from 4 (read P1, read P2, write P1, write P2) to 2 (read both, write both)
- Improves latency and throughput on the backend

**Trade-off:**
- Slightly more complex code (one call returns multiple objects)

---

## Tournament Advancement is Deferred

**Decision:** When a tournament match ends, the bracket advancement is not processed immediately in the match loop. Instead, a deferred handler runs asynchronously.

**Why:**
- Keeps the match tick loop lightweight and predictable (10 Hz)
- Tournament advancement may involve complex bracket logic and multiple storage writes; deferring prevents this from blocking the game loop

**Trade-off:**
- Tournament match results are final (winner determined) but bracket advancement may lag by a few hundred milliseconds

---

## Analytics Events Are Batched at Match End

**Decision:** Analytics (move count, game duration, piece positions, etc.) are accumulated in an `AnalyticsEventWriteBuffer` during the match and flushed in a single `storageWrite` call when the match ends.

**Why:**
- Avoids per-tick writes to storage (expensive, high latency)
- Single write is atomic and efficient

**Trade-off:**
- If the server crashes during a match, the partial analytics for that match are lost (acceptable for telemetry)

---

## Nakama Runtime Modules Are TypeScript (Not Lua)

**Decision:** Backend runtime modules are written in TypeScript, compiled to JavaScript, and run inside Nakama's TypeScript runtime.

**Why:**
- Shared types and shared logic (`logic/`, `shared/`) are in TypeScript; backend can import them directly without rewriting
- Easier to maintain consistency between client and backend when they share code
- TypeScript catches type errors at compile time

**Trade-off:**
- TypeScript → JavaScript compilation adds a build step
- Nakama's TypeScript runtime is sandboxed (limited standard library); some npm packages won't work

---

## Socket Management Uses Lifecycle Handlers

**Decision:** NakamaService detects stale or dropped sockets by registering lifecycle handlers and calling `isSocketOpen()` before sending commands.

**Why:**
- Prevents silent message loss if the socket was closed unexpectedly
- Allows automatic reconnection if the socket is lost during a match

**Trade-off:**
- Adds complexity to the service layer (tracking socket state machine)

---

## Admin Web App (ur-internals) Uses Session Storage

**Decision:** The admin app (`ur-internals/`) stores session tokens in `sessionStorage` (not `localStorage`) with in-memory caching.

**Why:**
- `sessionStorage` is cleared when the browser tab closes, improving security (no persistent auth token on disk)
- In-memory cache avoids repeated lookups

**Trade-off:**
- Admin session is lost if the browser is closed or refreshed (acceptable for an admin tool used by the team)

---

## Component Memoization Uses Custom Comparators

**Decision:** Tile and Piece components use `React.memo` with custom `arePropsEqual` comparators instead of relying on shallow equality.

**Why:**
- Some props are objects that are recreated on every render (e.g., `style` objects). Shallow equality would always return false, causing unnecessary re-renders.
- Custom comparators only check the fields that actually matter (position, piece ID, etc.)

**Trade-off:**
- Manual comparators are harder to maintain (must update if props signature changes)

**Mitigation:** Comparators are inline and well-commented.

---

## Future Decisions to Document

As new major features are added (multiplayer tournaments, cosmetics, monetization, social), document the decisions made:

- Why a particular monetization model was chosen
- Why cosmetics are client-side vs server-validated
- Why tournaments use bracket-style vs pool-play
- etc.

This section will grow as the codebase evolves.
