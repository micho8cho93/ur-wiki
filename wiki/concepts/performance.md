# Performance Analysis

> Frontend and backend performance findings, bottlenecks, and optimization opportunities across the Royal Game of Ur codebase.

**Last updated:** 2026-04-11  
**Sources:** [[wiki/sources/2026-04-11-ur-codebase]]  
**Related:** [[wiki/concepts/architecture]], [[wiki/concepts/transport-layer]], [[wiki/entities/zustand-game-store]], [[wiki/entities/nakama-service]], [[wiki/concepts/nakama-runtime]], [[wiki/concepts/tournament-flow]]

---

## Summary

The codebase is in reasonable shape but has several compounding performance concerns: the match screen subscribes to the Zustand store with ~28 granular selectors causing many per-update renders; the Board component is a 2,154-line monolith with 10+ `useEffect` hooks and no `React.memo` on its heaviest sub-components; the backend match-end path executes 6+ sequential storage reads per player before broadcasting; and the analytics subsystem writes events synchronously inside the match tick loop. None of these are show-stoppers in isolation, but together they add latency at the two highest-stakes moments: every server snapshot delivery and the match-end finalization sequence.

---

## Frontend

### 1. Match Screen — 28 Granular Zustand Selectors

**File:** `app/match/[id].tsx` (lines 879–926)

The match screen calls `useGameStore(state => state.X)` 28 separate times at the top level of one component. Each selector creates an independent subscription. Every time `applyServerSnapshot` fires, Zustand notifies all 28 subscriptions in sequence, which causes the React reconciler to schedule 28 potential re-renders of the same component tree.

**What happens:** On every snapshot from the server (which carries ~25 fields), nearly all 28 selectors flag a change. React batches these in React 18, but the sheer number of subscription callbacks adds scheduling overhead.

**Recommendation:** Group logically related fields into a single selector using a shallow-equality comparator, or split the screen into focused sub-components each owning a narrow slice of state.

```ts
// Instead of 28 individual calls:
const { gameState, validMoves, roll, makeMove, reset } = useGameStore(
  useShallow((s) => ({
    gameState: s.gameState,
    validMoves: s.validMoves,
    roll: s.roll,
    makeMove: s.makeMove,
    reset: s.reset,
  }))
);
```

Zustand's `useShallow` helper (or a custom `shallow` comparator) prevents re-subscription churn when multiple related fields change together.

---

### 2. Board Component — Missing `React.memo` on Tile and Piece

**Files:** `components/game/Board.tsx`, `components/game/Tile.tsx`, `components/game/Piece.tsx`

The `Tile` and `Piece` components are **not wrapped in `React.memo`**. The Board renders a grid of 20 tiles (BOARD_ROWS × BOARD_COLS), each potentially containing a `Piece`. On every Zustand state update — including fields entirely unrelated to the board (e.g., `socketState`, `authoritativeServerTimeMs`) — every Tile and Piece re-renders.

The Board itself does use `useMemo` extensively for layout calculations, but these memos still evaluate on every render of the parent match screen if their dependencies include frequently changing values (e.g., `gameState`).

**Recommendation:** Wrap `Tile` and `Piece` in `React.memo` with prop comparison. Since both components already derive their visual state from explicit props (piece color, highlight state, interactive flags), memoization would be straightforward.

```ts
export const Tile = React.memo(function Tile(props: TileProps) { ... });
export const Piece = React.memo(function Piece(props: PieceProps) { ... });
```

---

### 3. Board Component — 10+ `useEffect` Hooks and `LayoutAnimation`

**File:** `components/game/Board.tsx` (lines 883–1196)

The Board has at minimum 10 `useEffect` blocks. Several of these trigger `LayoutAnimation.configureNext()` (line 888, 1196), which schedules a native layout animation for the *next* layout pass. This is a blunt instrument: `LayoutAnimation` animates *all* layout changes in the tree during the next frame, not just the targeted elements. On a complex board view, this can cause unintended animated layout shifts across unrelated elements.

Additionally, the animation effect at line 988–1064 builds an `AnimatedBoardMove` object and dispatches it via `setAnimatedMove`, which then drives a Reanimated worklet sequence. This path is triggered by `historyCount` changes — but the dependency array at line 1064 includes `buildAnimatedMove` (a `useCallback`), whose own dependency `gameState` changes on every snapshot. This creates a potential chain where any snapshot change re-creates `buildAnimatedMove`, which triggers the animation effect, even when the history hasn't changed.

**Recommendation:** Audit the `buildAnimatedMove` callback dependency chain. Consider comparing `historyEntryCount` with a ref before setting animated move state, and replace `LayoutAnimation` with explicit Reanimated-driven layout transitions for targeted elements.

---

### 4. `useGameLoop` — Full `gameState` in Dependency Array

**File:** `hooks/useGameLoop.ts` (line ~31)

```ts
useEffect(() => {
  ...
}, [botDifficulty, enabled, gameState, makeMove, onBotSelectPiece, roll]);
```

`gameState` is the entire game state object, which is replaced on every server snapshot. This means the bot loop effect re-runs on *every snapshot*, even when it is the player's turn and the bot should be dormant. In practice the guard `if (currentTurn === 'dark')` prevents bot actions from firing, but the effect still evaluates, clears any pending timers, and re-queues them.

**Recommendation:** Subscribe only to the fields the bot actually needs:

```ts
const phase = useGameStore(s => s.gameState.phase);
const currentTurn = useGameStore(s => s.gameState.currentTurn);
const winner = useGameStore(s => s.gameState.winner);
const rollValue = useGameStore(s => s.gameState.rollValue);
```

This ensures the effect only re-fires when game phase or turn actually changes, not on every snapshot field update.

---

### 5. Tournament Polling — Redundant Intervals When Socket Is Active

**Files:** `src/tournaments/useTournamentDetail.ts` (line 155), `src/tournaments/useTournamentList.ts` (line 55)

Both tournament hooks fall back to `setInterval` polling as a reliability backstop. The detail hook does so even when the socket notification handler is attached (line 133 acknowledges this: "should still function through polling when socket notifications are unavailable"). The result when both are active: every bracket change triggers a socket notification *and* a poll on the next interval tick, causing a duplicate refetch and a potential extra state update.

**Recommendation:** Make the polling interval conditional on socket availability, or use a jitter/backoff approach that clears the interval once a socket notification arrives. The detail hook's `isMountedRef` / `refreshSequenceRef` guards (added in the 2026-04-11 commit) prevent stale updates but don't eliminate the redundant network round-trip.

---

### 6. Asset Preloading — Not Awaited Before First Render

**File:** `app/match/[id].tsx` (lines ~155–165, `MATCH_PRESENTATION_ASSETS`)

```ts
const MATCH_PRESENTATION_ASSETS = [
  UR_BG_IMAGE,
  BOARD_IMAGE_SOURCE,
  require('../../assets/trays/tray_light.png'),
  // ... 7 more
];
```

These assets are listed but whether they are fully preloaded via `Asset.loadAsync` before the match renders is not enforced at the component boundary. If the match screen mounts while images are still loading, the board background and piece images may flash or appear blank on first render, particularly on slow connections.

**Recommendation:** Gate the match render behind an asset-ready state using `Asset.loadAsync(MATCH_PRESENTATION_ASSETS)` in a pre-mount effect, showing a minimal loading indicator while assets resolve.

---

### 7. `FloatingEmojiReactions` — Uses Legacy `Animated` API, Not Reanimated

**File:** `components/game/FloatingEmojiReactions.tsx`

Each floating emoji bubble uses the legacy `Animated.timing` API with `useNativeDriver: true`. While `useNativeDriver` does offload the animation to the native thread, the Reanimated 2 worklet approach used elsewhere in the codebase (Board, Tile, Piece, Dice) is significantly more flexible and performant for interruptible animations. Mixing both APIs is not a correctness problem but creates inconsistency and means FloatingEmoji animations can't be interrupted cleanly by worklet-driven changes.

**Recommendation:** Migrate to Reanimated's `withTiming` + `useSharedValue` for consistency and better interruption behavior — especially since emoji reactions can stack rapidly during competitive play.

---

### 8. `AmbientBackgroundEffects` — Runs During Active Gameplay

**File:** `components/game/AmbientBackgroundEffects.tsx`

The ambient effects (bugs, dust, leaves) run continuously during the match screen. Each effect has its own Reanimated `useSharedValue` and `withTiming`/`withRepeat` animation. The match constants (`MATCH_AMBIENT_EFFECTS`) cap these (`maxVisibleBugs: 1`, `maxVisibleLeaves: 1`), keeping overhead low. However, these animations run unconditionally — they are not paused during active piece animation (the move slide) or during the dice roll phase, which is when the main thread is most loaded.

**Recommendation:** Pause ambient animations during high-activity phases (`phase === 'rolling'` with dice animation active, or `animatedMove !== null`) using a shared pause flag passed as a prop.

---

## Backend (Nakama Runtime)

### 9. Match Tick Rate — 10 Hz with No Work Batching

**File:** `backend/modules/index.ts` (line 337)

```ts
const TICK_RATE = 10;
```

The match runs at 10 ticks/second (100ms interval). The `matchLoop` function performs timer sync, disconnect checks, message processing, timeout detection, result finalization, and rematch sync — all on every tick. Most of these operations are O(1) and cheap when there is nothing to do, but the match loop also calls `cacheAssignedPlayerTitle` and `cacheAssignedPlayerRankTitle` for every message sender on every tick that has a message, performing inline storage reads on each call (depending on whether the cache is warm).

**Recommendation:** Profile whether 10 Hz is necessary for a turn-based game. For the Ur board game where turns can last 30+ seconds, 5 Hz (200ms interval) would cut server-side execution by half with no perceivable latency difference for players. Alternatively, keep 10 Hz but skip expensive subsystems (analytics heartbeat, title caching) on ticks where `messages` is empty.

---

### 10. `finalizeCompletedMatch` — Sequential Storage Reads per Player

**File:** `backend/modules/index.ts` (lines 3487–3492)

For each player at match end, the following are called sequentially and synchronously:

```ts
const progression = getProgressionForUser(nk, logger, playerUserId);
const challengeProgress = getUserChallengeProgress(nk, logger, playerUserId);
const eloProfile = getEloRatingProfileForUser(nk, logger, playerUserId);
```

Each of these calls `nk.storageRead` independently. Nakama's `storageRead` accepts an array of read requests and executes them in a single batch. By calling them separately, the finalization code issues 3+ sequential round-trips to the database per player, and since this runs in the tick loop's synchronous context, it blocks the loop for the entire duration.

**Recommendation:** Batch the storage reads for both players into a single `nk.storageRead` call at the start of finalization, then derive `progression`, `challengeProgress`, and `eloProfile` from the returned batch result. This would reduce 6+ sequential DB reads to 1–2 batched reads.

---

### 11. ELO Processing — Separate Leaderboard Write After Profile Write

**File:** `backend/modules/elo.ts` (lines ~230–415)

The ELO update path performs:
1. `nk.storageRead` — read both players' profiles
2. Compute new ratings
3. `nk.storageWrite` — write both profiles
4. `nk.leaderboardRecordWrite` × 2 — update each player's leaderboard entry separately

Step 4 makes two independent calls to `leaderboardRecordWrite`. These are sequential synchronous calls inside the match tick. Nakama does not expose a batch leaderboard write API, but the two calls could at minimum be made to fail independently rather than aborting both on first error, which the current code does not do.

Additionally, the ELO idempotency check reads `elo_match_results` collection (line ~825) as a separate `storageRead` before the profile read — so the full path is: read results → read profiles → write profiles → write leaderboard × 2, a minimum of 4 I/O operations per match end.

**Recommendation:** Combine the idempotency check read and the profile reads into a single `storageRead` batch call. This collapses the first two I/O operations into one.

---

### 12. Analytics — Synchronous Storage Writes in Match Tick

**File:** `backend/modules/analytics/tracking.ts` (line 381)

```ts
nk.storageWrite([...]);
```

Analytics events (`recordMatchStartAnalyticsEvent`, `recordMatchEndAnalyticsEvent`, `recordXpAwardAnalyticsEvent`) write directly to Nakama storage synchronously during the match tick or RPC handler. Each event is a separate `storageWrite` call. At match end, at least 3 analytics events fire (match end, XP award per player, potentially XP award for challenge completions), each blocking the tick loop.

**Recommendation:** Buffer analytics events in memory and flush them in a batched `storageWrite` at natural checkpoints (end of finalization), or use a fire-and-forget async pattern if Nakama's runtime context supports it. At minimum, combine multiple analytics writes into a single `storageWrite([event1, event2, event3])` array call.

---

### 13. Player Title Caching — Inline Storage Read on Every Message

**File:** `backend/modules/index.ts` (lines ~2460–2470, `cacheAssignedPlayerTitle` / `cacheAssignedPlayerRankTitle`)

On every message received in `matchLoop`, the code calls `cacheAssignedPlayerTitle(state, nk, senderUserId)` and `cacheAssignedPlayerRankTitle(state, nk, logger, senderUserId)`. If the title is not yet cached in `state.playerTitles`, this triggers an inline `storageRead`. For the first few messages of a match (or after reconnect), this adds a storage round-trip inside the hot message path.

**Recommendation:** Pre-populate both caches during `matchJoin` (which runs once per player join) rather than lazily on first message. The join handler already has the user ID and `nk` context available.

---

### 14. `updateRunWithRetry` — Busy-Retry Loop in Tournament Match Launch

**File:** `backend/modules/tournaments/public.ts`

The tournament match launch uses a retry loop (`updateRunWithRetry`) to handle optimistic concurrency on the run record. While the idempotency guard (added in the 2026-04-11 commit) prevents duplicate match creation, the retry loop itself performs a `storageRead` → validate → `storageWrite` cycle on each attempt, with up to `MAX_WRITE_ATTEMPTS` (4) iterations. Under high concurrency (e.g., 16-player tournament where many matches launch simultaneously), this can generate significant storage contention.

**Recommendation:** Nakama's storage write supports OCC (optimistic concurrency control) via the `version` field. Ensure the version from the initial read is threaded through each write attempt so failed writes fail fast with a version mismatch rather than proceeding to a potentially conflicting write.

---

## Priority Matrix

| Issue | Impact | Effort | Priority |
|---|---|---|---|
| Sequential storage reads at match end (#10) | High — blocks tick loop for every completed match | Low — batch existing reads | P0 |
| 28 Zustand selectors in match screen (#1) | High — excess re-renders on every snapshot | Medium — refactor with `useShallow` | P0 |
| Missing `React.memo` on Tile/Piece (#2) | High — 20 tile re-renders per snapshot | Low — wrap in memo | P0 |
| Analytics sync writes in tick loop (#12) | Medium — latency spike at match end | Medium — batch/defer writes | P1 |
| `useGameLoop` full gameState dep (#4) | Medium — bot loop eval on every snapshot | Low — narrow selectors | P1 |
| ELO separate leaderboard writes (#11) | Medium — 4 I/O ops per match end | Low — batch first two reads | P1 |
| Player title caching on message (#13) | Medium — storage read on first message | Low — move to matchJoin | P1 |
| Tick rate 10 Hz (#9) | Medium — 2× server work vs 5 Hz | Low — config change | P2 |
| Board useEffect chain (#3) | Medium — animation stutter risk | High — audit dependencies | P2 |
| Tournament polling redundancy (#5) | Low — duplicate network call | Medium — conditional interval | P2 |
| Asset preloading (#6) | Low — visual flash on first render | Low — await loadAsync | P2 |
| FloatingEmoji legacy API (#7) | Low — inconsistency only | Medium — migrate API | P3 |
| Ambient effects during gameplay (#8) | Low — capped at 1 bug/leaf | Low — add pause prop | P3 |
| Tournament OCC retry contention (#14) | Low in practice — 16-player max | Medium — thread version | P3 |

---

## Quick Wins (Low Effort, Meaningful Gain)

1. **Batch storage reads in `finalizeCompletedMatch`** — single `nk.storageRead([...all fields for both players...])` collapses 6+ sequential DB reads into 1.
2. **Wrap `Tile` and `Piece` in `React.memo`** — two-line change, eliminates 20-tile re-render cascade on every snapshot.
3. **Combine ELO idempotency + profile reads** — one `storageRead` instead of two.
4. **Move player title caching to `matchJoin`** — removes inline storage reads from the hot message path.
5. **Batch analytics writes at match end** — one `nk.storageWrite([...])` instead of 3+ separate calls.
