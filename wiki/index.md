# Wiki Index

**Last updated:** 2026-04-12  
**Total pages:** 20  
**Total sources ingested:** 1 (+ 4 git updates, commits `e6c9c06b`, `94debe5`, 8×commits `d81fd307`→`014062358`, `0d6cc748`)

---

## Overview

- [[wiki/overview]] — Master synthesis of the entire wiki

## Sources

- [[wiki/sources/2026-04-11-ur-codebase]] — Full Expo + Nakama codebase for the Royal Game of Ur (2026-04-11)
- [[wiki/sources/2026-04-11-190351-ur-codebase]] — Auto-generated snapshot after "Fix test coverage snapshot generation" (2026-04-11)

## Concepts

- [[wiki/concepts/architecture]] — Three-layer design, data flow, frontend and backend stacks
- [[wiki/concepts/game-engine]] — Pure game logic: types, engine, rules, path system, bot
- [[wiki/concepts/transport-layer]] — Offline vs. Nakama mode seam, command senders, snapshot flow, no optimistic UI
- [[wiki/concepts/nakama-runtime]] — Match lifecycle handlers, tick loop, AFK/disconnect/timer state machine
- [[wiki/concepts/tournament-flow]] — Full tournament lifecycle: registration → bracket → launch → in-match → result → next round
- [[wiki/concepts/challenge-system]] — Shared evaluator definitions, server-side evaluation at match end
- [[wiki/concepts/matchmaking]] — Ranked queue, private matches, socket vs HTTP
- [[wiki/concepts/match-protocol]] — Op codes, all payload types, type guards
- [[wiki/concepts/match-configs]] — All 8 game modes, rules variants, eligibility flags
- [[wiki/concepts/progression-system]] — XP sources, 15-rank ladder, server-authoritative grants
- [[wiki/concepts/elo-system]] — Rating formula, K-factors, provisional period, leaderboard
- [[wiki/concepts/performance]] — Frontend and backend performance findings, bottlenecks, and optimization opportunities
- [[wiki/concepts/spectator-mode]] — Read-only live match viewing: browse screen, route param, backend presence segregation (NEW)

## Entities

- [[wiki/entities/nakama-service]] — Singleton auth + session + socket manager (`services/nakama.ts`)
- [[wiki/entities/zustand-game-store]] — Single source of truth for all runtime state (`store/useGameStore.ts`)
- [[wiki/entities/expo-router]] — Screen map, route groups, provider stack (`app/`)

## Queries

- [[wiki/queries/q-tournament-bugs]] — Root causes and fixes for 3 bugs observed in 16-player tournament (2026-04-11)
