# Wiki Log

Append-only chronological record of all wiki operations.  
Grep tip: `grep "^## \[" log.md | tail -10` → last 10 entries.

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
