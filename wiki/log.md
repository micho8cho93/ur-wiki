# Wiki Log

Append-only chronological record of all wiki operations.  
Grep tip: `grep "^## \[" log.md | tail -10` → last 10 entries.

## [2026-04-12] schema-update | Wiki restructure — queries removed, ur-internals added, next-steps added

- **Removed:** `wiki/queries/` folder (manually delete `wiki/queries/q-tournament-bugs.md` — file deletion not available via tool)
  - Content preserved in `wiki/log.md` and `wiki/concepts/tournament-flow.md` / `wiki/concepts/nakama-runtime.md` which document all three bug fixes
- **Created:** `wiki/entities/ur-internals.md` — admin web app entity page covering auth flow, session storage hardening, API client, test coverage (~3%), and open security issues (BUG-A01)
- **Created:** `wiki/next-steps.md` — living task list covering open bugs, performance gaps, test coverage gaps, and wiki maintenance items
- **Updated:** `wiki/index.md` — Queries section replaced with Reference section; `ur-internals` added to Entities; page count 20→21

## [2026-04-12] schema-update | Codebase ingest path changed to GitHub API

- Added Section 13 to CLAUDE.md defining the new codebase source workflow
- `sources/ur/` is no longer the ingest path — too large (523MB with node_modules), causes Quartz watcher EMFILE errors
- Codebase changes now fetched on-demand via GitHub API raw URLs or sparse clone into /tmp
- `sources/` reserved for non-repo materials only (PDFs, design docs, notes)
- Repo URL recorded: https://github.com/micho8cho93/ur

## [2026-04-12] ingest | git pull — 8 commits (`d81fd307` → `014062358`)

- **Commits pulled:**
  - `d81fd307` — Prevent duplicate board move and capture animations
  - `54b3a797` — Harden RPC payload parsing and private match code reservation flow
  - `eddbabca` — Harden dev security and fix stale Nakama socket reuse
  - `5435613c` — Use secure RNG for authoritative rolls and stabilize animation effects
  - `243ee9d2` — Harden session restore and tighten validation across auth and protocol
  - `c79284cb` — Optimize match and board rendering with memoized selectors and tiles
  - `a1e996f4` — Refine tournament flows and expand unit test coverage
  - `014062358` — Calibrate vertical board piece alignment
- **Pages updated:**
  - `wiki/concepts/performance.md` — All confirmed-applied issues updated with actual implementation details; issues #1, #2, #4, #7, #8, #12 now describe the concrete fix (useShallow, areTilePropsEqual, granular selectors, Reanimated, paused prop, AnalyticsEventWriteBuffer). Issue #5 updated with socket-conditional polling detail. Board section (#3) expanded with vertical alignment refactor (non-uniform row heights, exported constants).
  - `wiki/entities/nakama-service.md` — Stale socket fix documented (socketConnected flag, lifecycle handlers, isSocketOpen); ur-internals session storage migration (localStorage→sessionStorage, in-memory cache) documented.
  - `wiki/concepts/nakama-runtime.md` — `finalizeCompletedMatch` flow rewritten with tournament deferral guard and analytics buffer; Authoritative Dice Roll section added (CSPRNG via `getSecureRandomUnit`, `rollAuthoritativeDice`); RPC hardening section added.
  - `wiki/concepts/tournament-flow.md` — `useTournamentList` socket notification listener documented; `updateRunWithRetry` OCC version hardening (`getRunObjectVersionOrThrow`, `isStorageVersionConflict`) documented.
  - `wiki/concepts/elo-system.md` — Backend storage refactor documented (`readRankedMatchStorageState` batching idempotency + profile reads into one `storageRead` call).
  - `wiki/concepts/game-engine.md` — `rollDice` updated with `DiceRandomSource` injectable parameter.
  - `wiki/concepts/test-coverage.md` — 8 new/expanded test files documented; totals updated (~92→~98 test files, ~35%→~38%).
  - `wiki/index.md` — git update count bumped to 3.
- **Key takeaways:**
  - Performance work from the prior audit is now fully applied and verified in code — #1, #2, #4, #5, #6, #7, #8, #12 are all confirmed
  - Server-side dice rolls are now CSPRNG-backed (cannot use Math.random in Nakama runtime)
  - NakamaService socket management is substantially more robust — stale sockets are detected and replaced
  - Analytics writes are now fully batched at match end — no synchronous per-event writes in the tick loop
  - Tournament OCC writes are hardened — version missing = throw, conflict error = retry, other = propagate
  - Test coverage jumped meaningfully: nakama.test.ts (268 lines), useTournamentList.test.tsx (180 lines), useTournamentDetail.test.tsx expanded, Tile/Piece tests added

---

## [2026-04-12] ingest | git commit `0d6cc748` — Add spectator mode entry from lobby

- **Commit:** `0d6cc7487048b7f746fee8f4b0441f1a3795ace0` (2026-04-12T19:30:42Z)
- **Summary:** Spectator mode feature — watch live matches in real time without participating as a player
- **Files changed:** 13 files (2 new, 11 modified)
- **Pages created:**
  - `wiki/concepts/spectator-mode.md` — Full spectator mode documentation: browse screen, route convention, client restrictions, backend presence segregation, service layer, analytics enhancement
- **Pages updated:**
  - `wiki/concepts/matchmaking.md` — New `listSpectatableMatches()` function, `SpectatableMatch` type, `list_spectatable_matches` RPC, updated socket vs HTTP table
  - `wiki/concepts/match-protocol.md` — New `READ_ONLY` error code for rejecting spectator game commands
  - `wiki/concepts/nakama-runtime.md` — `spectatorPresences` field in MatchState, `matchJoinAttempt` updated for spectator bypass, three new helper functions documented
  - `wiki/concepts/transport-layer.md` — Spectator as third participation type on top of `nakama` mode
  - `wiki/entities/expo-router.md` — New `/(game)/spectate` route and `?spectator=1` match route variant
  - `wiki/overview.md` — Spectator added to Big Picture, spectator-mode added to Key Concepts, evolution note added
  - `wiki/index.md` — Total pages 19→20, git update count bumped, spectator-mode link added
- **Key takeaways:**
  - Spectator mode is built entirely on top of the existing `nakama` online mode — no new store field required
  - Backend segregates spectators cleanly: `spectatorPresences` separate from `presences` (player pool)
  - Backend enforces read-only via `READ_ONLY` error code; client enforces via clearing command senders and disabling all UI controls
  - Analytics `ActiveTrackedMatch` now includes `classification` field, enabling the `list_spectatable_matches` RPC to filter match types
  - Lobby `lobby.tsx` got a minor responsive layout enhancement (4-column grid at ≥1180px width)

---

## [2026-04-12] lint | Codex performance fix verification pass

- Audited all 14 issues in `wiki/concepts/performance.md` against live codebase after Codex fix run
- Pages updated:
  - `wiki/concepts/performance.md` — status badges added to each issue heading, Priority Matrix updated with Status column, Remaining Work section added
- Results: 13 of 14 issues confirmed fixed; 1 partial; 1 not addressed
- Fixed (✅): #1 (Zustand selectors → useShallow), #2 (React.memo on Tile/Piece with custom comparators), #4 (useGameLoop narrow selectors), #5 (tournament polling conditional on socket), #6 (asset preloading gated), #7 (FloatingEmoji migrated to Reanimated), #8 (AmbientEffects paused prop), #10 (finalizeCompletedMatch batched storageRead), #11 (ELO idempotency + profile read batched), #12 (analytics buffered write), #13 (title caching moved to matchJoin), #14 (OCC version threaded through retry)
- Partially fixed (⚠️): #3 (Board — buildAnimatedMove dependency chain fixed; LayoutAnimation.configureNext still present on line 913, useEffect count grew to 16)
- Not fixed (❌): #9 (TICK_RATE still 10 Hz, no empty-tick batching added)

## [2026-04-11] schema-update | Harden snapshot/coverage scripts against node_modules bleed

- Root cause: `sources/ur/node_modules` is tracked in git (53,410 files), so `git ls-files` returns them; the EXCLUDE_PREFIXES filter was correct but had no fallback if it failed
- Fixed `claude-memory-compiler/scripts/generate_test_coverage.py`:
  - Added `get_files()` with sanity check: aborts with `RuntimeError` if >2000 `.ts/.tsx` files survive filtering (normal count is ~350)
  - Fixed `total_tests` in `render()` to use `TEST_SUFFIXES` + `EXCLUDE_SUFFIXES` constants (was using a raw inline tuple, missing `.d.ts` exclusion)
- Fixed `claude-memory-compiler/scripts/generate_ur_codebase_snapshot.py`:
  - Same sanity check added before the per-folder loop

---

## [2026-04-11] ingest | commit `94debe5` — Fix test coverage snapshot generation

- Commit touched 2 wiki files + `.obsidian/workspace.json`
- `wiki/sources/2026-04-11-190351-ur-codebase.md` — new auto-generated snapshot page added; added to `index.md`
- `wiki/concepts/test-coverage.md` — commit applied backend 27→28 (1 new module), ur-internals 65→66; TOTAL row was corrupted by script (node_modules included, showing 32,588 src / 138 tests / ~0%) — corrected to ~258 src / ~92 tests / ~36%
- Pages updated:
  - `wiki/concepts/test-coverage.md` — backend 28, ~61%; ur-internals 66; TOTAL ~258/~92/~36%
  - `wiki/index.md` — new snapshot source page added, total pages 18→19, git update count updated

---

## [2026-04-11] session-start | git pull — codebase snapshot update

- `git pull` brought in 2 changed files: `wiki/concepts/test-coverage.md`, `wiki/sources/2026-04-11-190351-ur-codebase.md`
- The auto-generated snapshot script miscounted: backend shown as 28 (actual: 27), components as 60 (actual: 56), TOTAL corrupted to ~32,588 (node_modules included)
- Pages updated:
  - `wiki/concepts/test-coverage.md` — corrected backend (27), components (56), TOTAL (~253 src / ~92 tests / ~36%)
  - `wiki/sources/2026-04-11-190351-ur-codebase.md` — corrected backend (27) and components (56) counts
- No net new source files added to `sources/ur/` in this pull (no new backend module confirmed by manual count)

---

## [2026-04-11] query | Performance analysis — frontend and backend optimization audit

- Full static analysis of the Expo + Nakama codebase for performance bottlenecks
- Frontend: analyzed `app/match/[id].tsx`, `components/game/Board.tsx`, `components/game/Tile.tsx`, `components/game/Piece.tsx`, `hooks/useGameLoop.ts`, `src/tournaments/useTournamentDetail.ts`, `components/game/FloatingEmojiReactions.tsx`, `components/game/AmbientBackgroundEffects.tsx`
- Backend: analyzed `backend/modules/index.ts` (matchLoop, tick rate, finalizeCompletedMatch), `backend/modules/elo.ts`, `backend/modules/analytics/tracking.ts`, `backend/modules/tournaments/public.ts`
- Pages created:
  - `wiki/concepts/performance.md` — 14 findings, priority matrix, quick wins section
- Key findings:
  - Match screen has 28 granular Zustand selectors causing excess re-renders on every snapshot
  - `Tile` and `Piece` components lack `React.memo`, causing full 20-tile re-render on every state update
  - `finalizeCompletedMatch` issues 6+ sequential `nk.storageRead` calls per match end (should be 1 batched read)
  - Analytics events write to storage synchronously inside the match tick loop (3+ separate writes at match end)
  - ELO idempotency check + profile reads are separate round-trips (could be combined into one batch)
  - Player title caching happens lazily on first message in matchLoop, should be pre-populated in matchJoin
  - Tick rate of 10 Hz is higher than needed for a turn-based board game; 5 Hz would halve server load

---

## [2026-04-11] ingest | GitHub pull — commit e6c9c06b "Fix tournament bracket sync and make match launch idempotent"

- Source: `sources/ur/` — 1 new commit on top of ORIG_HEAD `ce3dea5d`
- Files changed: `backend/modules/tournaments/public.ts`, `backend/modules/index.ts`, `shared/tournamentNotifications.ts` (new), `src/tournaments/useTournamentDetail.ts`, `backend/modules/authoritativeTimer.rpc.test.ts`
- All three bugs diagnosed in `q-tournament-bugs` are now fixed:
  1. **Waiting room at tournament start** — bracket-ready push notification (`tournament_bracket_ready`, code `41_001`) sent after bracket write; idempotency via `bracketStartNotificationToken` in run metadata
  2. **Orphaned match on launch** — `nk.matchCreate` moved inside `updateRunWithRetry` callback behind idempotency guard
  3. **Late forfeit after reconnect** — `resetAfkOnMeaningfulAction` called in `matchJoin` on genuine rejoin; concurrent second session does not clear debt
- Client: `useTournamentDetail` now attaches socket `onnotification` handler, chains prior handler, falls back to polling if socket unavailable; stale-update safety via `isMountedRef` + `refreshSequenceRef`
- Pages updated:
  - `wiki/queries/q-tournament-bugs.md` — all three bugs marked ✅ FIXED with implementation detail
  - `wiki/concepts/nakama-runtime.md` — `matchJoin` and AFK Accumulator sections updated; bug warning removed
  - `wiki/concepts/tournament-flow.md` — Phase 2 adds bracket notification system, Phase 3 adds socket listener, Phase 4 rewritten for idempotent launch

---

## [2026-04-11] schema-update | Initial wiki setup

- Created CLAUDE.md — master schema and operating rules for the wiki
- Created folder structure: `sources/`, `wiki/entities/`, `wiki/concepts/`, `wiki/sources/`, `wiki/queries/`
- Created `index.md` — master page catalog (currently empty)
- Created `log.md` — this file
- Created `wiki/overview.md` — high-level synthesis stub
- Wiki domain: not yet defined — Michel to specify
- Status: ready for first ingest

---

## [2026-04-11] query | Backend deep-dive — runtime, tournament, challenges, optimistic UI

- Fully mapped Nakama backend runtime internals: lifecycle handlers, tick loop, timer state machine
- Fully mapped tournament flow end-to-end: registration → bracket → launch race condition → in-match → result → next round
- Fully mapped challenge system: shared evaluator definitions, `processCompletedMatch`, client vs server authority
- Confirmed no optimistic UI in online mode: client is fully server-driven, all state waits for `STATE_SNAPSHOT`
- Diagnosed 3 tournament bugs from 16-player bot tournament run
- Pages created:
  - `wiki/concepts/nakama-runtime.md` — match lifecycle, constants, MatchState shape, AFK/disconnect state machine
  - `wiki/concepts/tournament-flow.md` — complete lifecycle with race condition detail
  - `wiki/concepts/challenge-system.md` — evaluator contract, server-side flow, client usage
  - `wiki/queries/q-tournament-bugs.md` — 3 bug diagnoses with code-level root causes and fixes
- Pages updated:
  - `wiki/concepts/transport-layer.md` — added "No Optimistic UI" section
  - `wiki/overview.md` — all first-ingest open questions answered, new open questions added
  - `index.md` — 17 pages total, 1 query saved
- Key findings:
  - AFK accumulator never resets on reconnect → root cause of late forfeits
  - `nk.matchCreate` before idempotency guard → orphaned matches on simultaneous launch
  - Bracket write has a commit window → polling gap causing stuck-in-lobby at tournament start

---

## [2026-04-11] ingest | Royal Game of Ur — Full Codebase

- Source: `sources/ur/` — full Expo + Nakama codebase
- Domain set: Expo + Nakama multiplayer codebase second brain
- Pages created (12 total):
  - `wiki/sources/2026-04-11-ur-codebase.md` — source summary, folder map, key takeaways
  - `wiki/concepts/architecture.md` — three-layer design, data flow, stack overview
  - `wiki/concepts/game-engine.md` — types, engine functions, rules, path system
  - `wiki/concepts/transport-layer.md` — offline/nakama seam, command senders, snapshot flow
  - `wiki/concepts/matchmaking.md` — ranked queue, private matches, error handling
  - `wiki/concepts/match-protocol.md` — op codes, all payload types, type guards
  - `wiki/concepts/match-configs.md` — all 8 game modes, rules/eligibility table
  - `wiki/concepts/progression-system.md` — XP sources, 15-rank ladder, server authority
  - `wiki/concepts/elo-system.md` — formula, K-factors, provisional period, types
  - `wiki/entities/nakama-service.md` — session lifecycle, auth methods, socket management
  - `wiki/entities/zustand-game-store.md` — state shape, key actions, design notes
  - `wiki/entities/expo-router.md` — screen map, route groups, provider stack
- `wiki/overview.md` updated with full synthesis
- `index.md` updated: 12 pages, 1 source
- Key takeaways documented in source summary and overview
- Open questions logged in overview

## [2026-04-11] lint | Codex bug fix verification pass

- Verified all medium and low severity bugs (A06–A23) against live codebase after Codex fix run
- Pages updated:
  - `wiki/concepts/bugs.md` — statuses updated, fix details added to each entry
- Results: 16 of 18 medium/low bugs confirmed fixed; 2 were NOT addressed by Codex
- Verified fixed (✅): A06, A07, A08, A09, A10, A11, A12, A13, A14, A15, A16, A17, A18, A19, A20, A21, A22
- Not fixed (⚠️): A02 (inverted onboarding guard — `\!` still missing), A04 (presence payload string not JSON.parsed — always throws)
- A23 (iOS entitlements) remains `needs-investigation` — empty file unchanged, needs manual Xcode capability audit

## [2026-04-11] schema-update | Auto-ingest on sources-check hook output

- Updated `CLAUDE.md` section 9 (Session Start Protocol)
- Added step 4: if session context contains a `📥 SOURCES UPDATED` block from the sources-check hook, immediately begin batch ingest for each listed source without waiting to be asked
- This makes the hook actually trigger action instead of just surfacing a report
- Michel still sees what's being ingested and why; back-and-forth discussion is skipped (batch mode) unless change set is ambiguous

## [2026-04-11] ingest | 4 commits — Codex bug fix batch (d81fd307..243ee9d2)

- Reviewed diffs for all 4 commits introduced since last wiki update
- Pages updated:
  - `wiki/concepts/bugs.md` — commit hashes added to all fixed entries; BUG-A24 added as new fixed entry
- Commits ingested:
  - `d81fd307` — Prevent duplicate board move and capture animations (`Board.tsx`): signature guard + highlight ref extraction + removed spurious `LayoutAnimation.configureNext` → **BUG-A24 (new, fixed)**
  - `54b3a797` — Harden RPC payload parsing and private match code reservation flow → **BUG-A06, A07, A08 fixed**
  - `eddbabca` — Harden dev security and fix stale Nakama socket reuse → **BUG-A09, A10, A11 fixed**
  - `5435613c` — Use secure RNG for authoritative rolls and stabilize animation effects → **BUG-A12, A13, A14 fixed**
  - `243ee9d2` — Harden session restore and tighten validation across auth and protocol → **BUG-A15, A16, A17, A18, A19, A20, A21, A22 fixed**
- Still open (not addressed): BUG-A02 (inverted onboarding guard), BUG-A04 (presence payload not JSON.parsed)
