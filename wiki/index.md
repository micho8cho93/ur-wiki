# Wiki Index

**Last updated:** 2026-04-13  
**Total pages:** 22  
**Total sources ingested:** GitHub repo (micho8cho93/ur)

---

## Overview

- [[overview]] — Master synthesis of the entire wiki

## Sources

- GitHub repo: [micho8cho93/ur](https://github.com/micho8cho93/ur) — Expo + Nakama codebase (ongoing)

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
- [[WIP]] — Work-in-progress ideas: economic models, monetization, and organic user growth
