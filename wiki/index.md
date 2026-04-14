# Wiki Index

**Last updated:** 2026-04-14  
**Total pages:** 26  
**Total sources ingested:** GitHub repo (micho8cho93/ur)

---

## Overview

- [[overview]] — Master synthesis of the codebase, architecture reference, and navigation guide

---

## Architecture

- [[architecture]] — High-level three-layer design and data flow
- [[layer-frontend]] — Expo Router, Zustand store, provider stack, services
- [[layer-backend]] — Nakama runtime, match handler, RPC, storage schema
- [[layer-transport]] — Offline/online mode seam, command senders, snapshot flow

---

## Features

- [[game-engine]] — Game logic, types, rules variants, path system, bot AI
- [[matchmaking]] — Ranked queue, private matches, spectatable match listing
- [[spectator-mode]] — Read-only live match viewing and backend presence segregation
- [[tournament-flow]] — Full tournament lifecycle: registration → bracket → launch → result
- [[challenge-system]] — Challenge definitions, evaluators, server-side evaluation
- [[progression-system]] — XP sources, 15-rank ladder, server-authoritative grants
- [[elo-system]] — Rating formula, K-factors, provisional period, leaderboard

---

## Protocol

- [[match-protocol]] — Op codes, all payload types, type guards
- [[match-configs]] — All 8 game modes, their rules, and eligibility flags
- [[shared-types]] — Cross-cutting types: game state, progression, ELO, challenges

---

## Runtime

- [[nakama-runtime]] — Match lifecycle handlers, tick loop, timer/AFK/disconnect state machine

---

## Entities

- [[nakama-service]] — Singleton auth + session + socket manager
- [[zustand-game-store]] — Single source of truth for all runtime state
- [[expo-router]] — Screen map and provider structure
- [[ur-internals]] — Admin web app: auth, session storage, test coverage

---

## Quality & Tasks

- [[performance]] — Frontend and backend performance findings, bottlenecks, optimizations
- [[quality/test-coverage]] — Test file inventory and coverage status
- [[quality/bugs]] — Known bugs, status, impact
- [[quality/next-steps]] — Open bugs, performance gaps, test gaps, wiki maintenance tasks

---

## Knowledge

- [[knowledge/decisions]] — Architectural decisions, trade-offs, and design rationale
- [[WIP]] — Work-in-progress ideas: economic models, monetization, organic growth

---

## Sources

- GitHub repo: [micho8cho93/ur](https://github.com/micho8cho93/ur) — Expo + Nakama codebase (ongoing)
- [[wiki/sources/]] — Source summary pages (6 entries from 2026-04-11 to 2026-04-12)
