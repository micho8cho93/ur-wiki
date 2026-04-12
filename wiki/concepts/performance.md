# Performance Analysis

> Frontend and backend performance findings, bottlenecks, and optimization opportunities across the Royal Game of Ur codebase.

**Last updated:** 2026-04-12 (commits `c79284cb`, `a1e996f4`, `014062358`)  
**Sources:** [[wiki/sources/2026-04-11-ur-codebase]]  
**Related:** [[wiki/concepts/architecture]], [[wiki/concepts/transport-layer]], [[wiki/entities/zustand-game-store]], [[wiki/entities/nakama-service]], [[wiki/concepts/nakama-runtime]], [[wiki/concepts/tournament-flow]]

---

## Summary

The codebase is in reasonable shape but has several compounding performance concerns: the match screen subscribes to the Zustand store with ~28 granular selectors causing many per-update renders; the Board component is a monolith with 10+ `useEffect` hooks and no `React.memo` on its heaviest sub-components; the backend match-end path executes 6+ sequential storage reads per player before broadcasting; and the analytics subsystem writes events synchronously inside the match tick loop. None of these are show-stoppers in isolation, but together they add latency at the two highest-stakes moments: every server snapshot delivery and the match-end finalization sequence.

**2026-04-12 Fix Audit:** 13 of 14 issues resolved by Codex. Remaining: #3 (LayoutAnimation still present in Board, though dependency chain fixed) and #9 (TICK_RATE still 10 Hz). See status badges on each issue below.

**2026-04-12 Confirmed Applied (commits `c79284cb`, `a1e996f4`, `014062358`):** Issues #1 (Zustand `useShallow`), #2 (Tile/Piece `React.memo`), #4 (`useGameLoop` narrow selectors), #7 (FloatingEmoji Reanimated), #8 (AmbientEffects `paused` prop), #12 (analytics write buffer) are all verified in the new code — see individual issues below.

---

## Frontend

### 1. Match Screen — 28 Granular Zustand Selectors ✅ FIXED

**File:** `app/match/[id].tsx`

The match screen previously called `useGameStore(state => state.X)` 28 separate times at the top level of one component, causing 28 independent subscriptions and potential re-renders on every snapshot.

**Applied fix (commit `c79284cb`):** All 28 individual selectors were replaced with grouped `useShallow` selectors. `import { useShallow } from 'zustand/react/shallow'` was added and related fields are now batched together:

```ts
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

Zustand's `useShallow` prevents re-subscription churn when multiple related fields change together.

---

### 2. Board Component — Missing `React.memo` on Tile and Piece ✅ FIXED

**Files:** `components/game/Tile.tsx`, `components/game/Piece.tsx`

**Applied fix (commits `c79284cb`, `014062358`):** Both components are now wrapped with `React.memo` using custom deep-equality comparators.

`Tile` has `areTilePropsEqual` — compares all props including a custom `areTilePiecesEqual` that checks `piece.id` and `piece.color` only (not reference equality). The `onPress`/`onHoverIn`/`onHoverOut` signatures were also changed from `() => void` to `(row, col) => void` so the Board can pass stable `useCallback` handlers without needing per-tile closures, allowing `onPress === next.onPress` to remain stable.

`Piece` has `arePiecePropsEqual` — compares all 11 props by value.

Additionally (commit `014062358`), both light and dark tokens now share the same `PIECE_ART_VISUAL_CENTER_OFFSET_Y_RATIO = -0.031` so pieces from both sides land on the same gameplay center point.

```ts
export const Tile = React.memo(TileComponent, areTilePropsEqual);
export const Piece = React.memo(PieceComponent, arePiecePropsEqual);
```

---

### 3. Board Component — 10+ `useEffect` Hooks and `LayoutAnimation` ⚠️ PARTIAL

**File:** `components/game/Board.tsx` (lines 883–1196)

The Board has at minimum 10 `useEffect` blocks. Several of these trigger `LayoutAnimation.configureNext()` (line 888, 1196), which schedules a native layout animation for the *next* layout pass. This is a blunt instrument: `LayoutAnimation` animates *all* layout changes in the tree during the next frame, not just the targeted elements. On a complex board view, this can cause unintended animated layout shifts across unrelated elements.

Additionally, the animation effect at line 988–1064 builds an `AnimatedBoardMove` object and dispatches it via `setAnimatedMove`, which then drives a Reanimated worklet sequence. This path is triggered by `historyCount` changes — but the dependency array at line 1064 includes `buildAnimatedMove` (a `useCallback`), whose own dependency `gameState` changes on every snapshot. This creates a potential chain where any snapshot change re-creates `buildAnimatedMove`, which triggers the animation effect, even when the history hasn't changed.

**Recommendation:** Audit the `buildAnimatedMove` callback dependency chain. Consider comparing `historyEntryCount` with a ref before setting animated move state, and replace `LayoutAnimation` with explicit Reanimated-driven layout transitions for targeted elements.

---

### 4. `useGameLoop` — Full `gameState` in Dependency Array ✅ FIXED

**File:** `hooks/useGameLoop.ts`

**Applied fix (commit `a1e996f4`):** `gameState` was removed from the dependency array and replaced with four granular selectors:

```ts
const phase = useGameStore(state => state.gameState.phase);
const currentTurn = useGameStore(state => state.gameState.currentTurn);
const winner = useGameStore(state => state.gameState.winner);
const rollValue = useGameStore(state => state.gameState.rollValue);
```

The effect dependency array is now `[botDifficulty, currentTurn, enabled, makeMove, onBotSelectPiece, phase, roll, rollValue, winner]`. When the bot actually needs to read full state inside the effect, it uses `useGameStore.getState().gameState` (a one-time read, not a subscription).

---

### 5. Tournament Polling — Redundant Intervals When Socket Is Active ✅ FIXED

**Files:** `src/tournaments/useTournamentDetail.ts`, `src/tournaments/useTournamentList.ts`

**Applied fix (commit `a1e996f4`):** Both hooks now gate the polling interval on `isSocketNotificationAvailable`. When the socket connection succeeds, `isSocketNotificationAvailable` is `true` and the polling interval is skipped. When the socket is unavailable (fails to connect or disconnects), `isSocketNotificationAvailable` falls to `false` and the interval re-activates as a fallback.

`useTournamentList` now additionally attaches a socket notification listener for `tournament_bracket_ready` events and calls `refresh()` immediately on receipt. The hook chains previous `socket.onnotification` and `socket.ondisconnect` handlers correctly, and cleans up on unmount. Socket connection uses `connectSocketWithRetry` with 2 attempts and an 800ms retry delay.

---

### 6. Asset Preloading — Not Awaited Before First Render ✅ FIXED

**File:** `app/match/[id].tsx`

**Applied fix (commit `a1e996f4`):** The full match `GameRoom` render is now gated behind `arePresentationAssetsReady`. If assets are not ready, an `ActivityIndicator` is shown instead (unless `SHOULD_BYPASS_CINEMATIC_INTROS` is set for dev). This prevents the board and piece images from flashing blank on first mount.

---

### 7. `FloatingEmojiReactions` — Uses Legacy `Animated` API, Not Reanimated ✅ FIXED

**File:** `components/game/FloatingEmojiReactions.tsx`

**Applied fix (commits `a1e996f4`, `5435613c`):** Migrated to Reanimated `useSharedValue`/`withTiming`/`withSequence` for emoji float/fade animations, removing the legacy `Animated.timing` with `useNativeDriver`. The component was substantially refactored (~82 lines changed) for consistency with the rest of the animation layer.

---

### 8. `AmbientBackgroundEffects` — Runs During Active Gameplay ✅ FIXED

**File:** `components/game/AmbientBackgroundEffects.tsx`

**Applied fix (commit `a1e996f4`):** `AmbientBackgroundEffects` now accepts a `paused` prop. In `app/match/[id].tsx`, a `pauseAmbientEffects` boolean is computed as `rollingVisual || hasActiveBoardMoveAnimation` and passed as `paused={pauseAmbientEffects}`. The `hasActiveBoardMoveAnimation` state is driven by a new `onAnimatedMoveStateChange` callback on `Board`, which fires when the animated move worklet sequence starts and ends. This means ambient animations pause precisely during the two highest-activity phases.

---

## Backend (Nakama Runtime)

### 9. Match Tick Rate — 10 Hz with No Work Batching ❌ NOT FIXED

**File:** `backend/modules/index.ts` (line 337)

```ts
const TICK_RATE = 10;
```

The match runs at 10 ticks/second (100ms interval). The `matchLoop` function performs timer sync, disconnect checks, message processing, timeout detection, result finalization, and rematch sync — all on every tick. Most of these operations are O(1) and cheap when there is nothing to do, but the match loop also calls `cacheAssignedPlayerTitle` and `cacheAssignedPlayerRankTitle` for every message sender on every tick that has a message, performing inline storage reads on each call (depending on whether the cache is warm).

**Recommendation:** Profile whether 10 Hz is necessary for a turn-based game. For the Ur board game where turns can last 30+ seconds, 5 Hz (200ms interval) would cut server-side execution by half with no perceivable latency difference for players. Alternatively, keep 10 Hz but skip expensive subsystems (analytics heartbeat, title caching) on ticks where `messages` is empty.

---

### 10. `finalizeCompletedMatch` — Sequential Storage Reads per Player ✅ FIXED

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

### 11. ELO Processing — Separate Leaderboard Write After Profile Write ✅ FIXED

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

### 12. Analytics — Synchronous Storage Writes in Match Tick ✅ FIXED

**File:** `backend/modules/analytics/tracking.ts`

**Applied fix (commit `a1e996f4`):** Analytics writes are now buffered and flushed as a single batch. The new `AnalyticsEventWriteBuffer` type holds a `writes: AnalyticsStorageWrite[]` array. Callers obtain a buffer via `createAnalyticsEventWriteBuffer()`, pass it to event-recording functions, and call `flushAnalyticsEventWriteBuffer(nk, logger, buffer)` at the end of `finalizeCompletedMatch`. The entire analytics batch for a match end (match event + XP awards + challenge completions) is flushed in one `nk.storageWrite` call inside a `try/finally` block, so the flush always fires even if processing throws.

---

### 13. Player Title Caching — Inline Storage Read on Every Message ✅ FIXED

**File:** `backend/modules/index.ts` (lines ~2460–2470, `cacheAssignedPlayerTitle` / `cacheAssignedPlayerRankTitle`)

On every message received in `matchLoop`, the code calls `cacheAssignedPlayerTitle(state, nk, senderUserId)` and `cacheAssignedPlayerRankTitle(state, nk, logger, senderUserId)`. If the title is not yet cached in `state.playerTitles`, this triggers an inline `storageRead`. For the first few messages of a match (or after reconnect), this adds a storage round-trip inside the hot message path.

**Recommendation:** Pre-populate both caches during `matchJoin` (which runs once per player join) rather than lazily on first message. The join handler already has the user ID and `nk` context available.

---

### 14. `updateRunWithRetry` — Busy-Retry Loop in Tournament Match Launch ✅ FIXED

**File:** `backend/modules/tournaments/public.ts`

The tournament match launch uses a retry loop (`updateRunWithRetry`) to handle optimistic concurrency on the run record. While the idempotency guard (added in the 2026-04-11 commit) prevents duplicate match creation, the retry loop itself performs a `storageRead` → validate → `storageWrite` cycle on each attempt, with up to `MAX_WRITE_ATTEMPTS` (4) iterations. Under high concurrency (e.g., 16-player tournament where many matches launch simultaneously), this can generate significant storage contention.

**Recommendation:** Nakama's storage write supports OCC (optimistic concurrency control) via the `version` field. Ensure the version from the initial read is threaded through each write attempt so failed writes fail fast with a version mismatch rather than proceeding to a potentially conflicting write.

---

## Priority Matrix

*Status as of 2026-04-12 audit. ✅ = resolved, ⚠️ = partial, ❌ = open.*

| Issue | Impact | Effort | Priority | Status |
|---|---|---|---|---|
| Sequential storage reads at match end (#10) | High — blocks tick loop for every completed match | Low — batch existing reads | P0 | ✅ |
| 28 Zustand selectors in match screen (#1) | High — excess re-renders on every snapshot | Medium — refactor with `useShallow` | P0 | ✅ |
| Missing `React.memo` on Tile/Piece (#2) | High — 20 tile re-renders per snapshot | Low — wrap in memo | P0 | ✅ |
| Analytics sync writes in tick loop (#12) | Medium — latency spike at match end | Medium — batch/defer writes | P1 | ✅ |
| `useGameLoop` full gameState dep (#4) | Medium — bot loop eval on every snapshot | Low — narrow selectors | P1 | ✅ |
| ELO separate leaderboard writes (#11) | Medium — 4 I/O ops per match end | Low — batch first two reads | P1 | ✅ |
| Player title caching on message (#13) | Medium — storage read on first message | Low — move to matchJoin | P1 | ✅ |
| Tick rate 10 Hz (#9) | Medium — 2× server work vs 5 Hz | Low — config change | P2 | ❌ |
| Board useEffect chain (#3) | Medium — animation stutter risk | High — audit dependencies | P2 | ⚠️ |
| Tournament polling redundancy (#5) | Low — duplicate network call | Medium — conditional interval | P2 | ✅ |
| Asset preloading (#6) | Low — visual flash on first render | Low — await loadAsync | P2 | ✅ |
| FloatingEmoji legacy API (#7) | Low — inconsistency only | Medium — migrate API | P3 | ✅ |
| Ambient effects during gameplay (#8) | Low — capped at 1 bug/leaf | Low — add pause prop | P3 | ✅ |
| Tournament OCC retry contention (#14) | Low in practice — 16-player max | Medium — thread version | P3 | ✅ |

---

## Remaining Work (as of 2026-04-12)

### #9 — Tick Rate (❌ Open)
`TICK_RATE` remains `10` Hz. Options: drop to 5 Hz, or keep 10 Hz but skip expensive subsystems (analytics heartbeat, title caching) on ticks where `messages` is empty.

### #3 — Board LayoutAnimation (⚠️ Partial)
The `buildAnimatedMove` callback dependency chain was fixed (now depends on `[buildPathPoints, pathLength]`, not full `gameState`). However `LayoutAnimation.configureNext()` is still present at line 913, and the Board now has 16 `useEffect` hooks. The highest-risk chain is resolved; the blunt layout animation call remains. Consider replacing with an explicit Reanimated-driven transition targeting only the affected elements.

**Additional Board changes (commit `014062358`):** The Board was significantly refactored for vertical alignment accuracy. Pixel-precise row boundary data (`VERTICAL_BOARD_ART_ROW_BOUNDARIES_PX`) now drives non-uniform row height ratios (`VERTICAL_BOARD_DISPLAY_ROW_HEIGHT_RATIOS`) so hitboxes and piece positions follow the actual visual wood faces rather than uniform cell divisions. A new `buildRowMetrics` function computes `rowHeights` + `rowTops` and stores them in `BoardRenderLayout`. Tile now accepts a `cellHeight` prop (separate from `cellSize`) enabling non-square cells in the vertical board layout. Exported constants `VERTICAL_BOARD_ART_INSETS` and `getVerticalBoardDisplayRowCenterRatio` are consumed by `app/match/[id].tsx` for the dice-drop overlay positioning, eliminating the previous magic-number duplication.
