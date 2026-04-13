# Wiki Index

**Last updated:** 2026-04-12  
**Total pages:** 21  
**Total sources ingested:** 1 (+ 4 git updates, commits `e6c9c06b`, `94debe5`, 8×commits `d81fd307`→`014062358`, `0d6cc748`)

---

## Overview

- [[overview]] — Master synthesis of the entire wiki

## Sources

- [[2026-04-11-ur-codebase]] — Full Expo + Nakama codebase for the Royal Game of Ur (2026-04-11)
- [[2026-04-11-190351-ur-codebase]] — Auto-generated snapshot after "Fix test coverage snapshot generation" (2026-04-11)

## Concepts

- [[architecture]] — Three-layer design, data flow, frontend and backend stacks
- [[game-engine]] — Pure game logic: types, engine, rules, path system, bot
- [[transport-layer]] — Offline vs. Nakama mode seam, command senders, snapshot flow, no optimistic UI
- [[nakama-runtime]] — Match lifecycle handlers, tick loop, AFK/disconnect/timer state machine
- [[tournament-flow]] — Full tournament lifecycle: registration → bracket → launch → in-match → result → next round
- [[challenge-system]] — Shared evaluator definitions, server-side evaluation at match end
- [[matchmaking]] — Ranked queue, private matches, socket vs HTTP
- [[match-protocol]] — Op codes, all payload types, type guards
- [[match-configs]] — All 8 game modes, rules variants, eligibility flags
- [[progression-system]] — XP sources, 15-rank ladder, server-authoritative grants
- [[elo-system]] — Rating formula, K-factors, provisional period, leaderboard
- [[performance]] — Frontend and backend performance findings, bottlenecks, and optimization opportunities
- [[spectator-mode]] — Read-only live match viewing: browse screen, route param, backend presence segregation (NEW)

## Entities

- [[nakama-service]] — Singleton auth + session + socket manager (`services/nakama.ts`)
- [[zustand-game-store]] — Single source of truth for all runtime state (`store/useGameStore.ts`)
- [[expo-router]] — Screen map, route groups, provider stack (`app/`)
- [[ur-internals]] — Admin web app: auth, session storage, RPC client (`ur-internals/`)

## Reference

- [[next-steps]] — Open bugs, performance gaps, test coverage gaps, and wiki maintenance tasks
