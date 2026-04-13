# Overview

> Master synthesis of the Royal Game of Ur codebase wiki.

**Last updated:** 2026-04-12 (rev 4)  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[index]]

---

## Domain

This wiki is a **codebase second brain** for the Royal Game of Ur — a multiplayer board game app built with **Expo (React Native)** for iOS, Android, and web, backed by a **Nakama** game server running TypeScript runtime modules in Docker.

---

## The Big Picture

The app has two runtime modes: **offline** (local bot opponent) and **online** (authoritative Nakama server). The same pure game engine runs on both sides, which is the architectural invariant everything else depends on. The switch between modes is a single seam in the [[zustand-game-store]] — `store.roll()` and `store.makeMove()` check `onlineMode` and either compute locally or delegate to the server via WebSocket.

A third participation type — **spectator** — was added in commit `0d6cc748`. Spectators connect via the same Nakama WebSocket as players and receive live `STATE_SNAPSHOT` broadcasts, but all command senders are cleared and the backend rejects any game actions with a `READ_ONLY` error. Spectators join with `{ role: 'spectator' }` metadata and are stored in a separate `spectatorPresences` pool on the server.

---

## Architecture in One Paragraph

Expo Router handles file-based screen routing with a transparent Stack navigator. All screens share a provider stack (Auth → ELO → Progression → Challenges → ScreenTransition). The [[zustand-game-store]] is the global runtime state container — one store, all game state, all online metadata. The [[nakama-service]] singleton manages sessions, tokens, and the WebSocket. [[matchmaking]] functions handle ranked queue and private match flows. In-match messages follow the [[match-protocol]] (typed op codes, JSON payloads). After a match, progression awards and ELO changes arrive as notification payloads and update the store, which the `ProgressionProvider` and `EloRatingProvider` contexts consume.

---

## Key Concepts

- [[architecture]] — three-layer design, data flow diagrams, frontend and backend stacks
- [[game-engine]] — types, engine functions, rules variants, path system, bot
- [[transport-layer]] — the offline/nakama mode seam, command senders, snapshot flow, no optimistic UI
- [[nakama-runtime]] — match lifecycle handlers, tick loop, timer/AFK/disconnect state machine
- [[matchmaking]] — ranked queue, private matches, spectatable match listing, socket vs HTTP
- [[spectator-mode]] — read-only live match viewing: browse screen, route param, backend presence segregation
- [[tournament-flow]] — full tournament lifecycle: registration → bracket → launch → result → next round
- [[challenge-system]] — shared evaluator definitions, server-side evaluation, telemetry
- [[match-protocol]] — op codes, all payload types, type guards
- [[match-configs]] — all 8 game modes, their rules, and eligibility flags
- [[progression-system]] — XP sources, 15-rank ladder, server-authoritative grants
- [[elo-system]] — rating formula, K-factors, provisional period, leaderboard

## Key Entities

- [[nakama-service]] — singleton auth + socket manager
- [[zustand-game-store]] — single source of truth for all runtime state
- [[expo-router]] — screen map and provider structure

---

## Current State of Understanding

The codebase is well-structured with clear separation of concerns:
- `logic/` is pure and portable — `rollDice` now accepts an injectable `DiceRandomSource` so the backend can use CSPRNG
- `shared/` is the client-server contract
- `services/` handles all network concerns — NakamaService socket management is now robust against stale/dropped connections
- `store/` is the runtime glue — match screen now uses `useShallow` grouped selectors instead of 28 individual subscriptions
- `app/` + `components/` + `src/` are the UI layer — `Tile` and `Piece` are now `React.memo` with custom comparators

The Nakama backend runtime, tournament system, and challenge system are fully mapped. Previously identified tournament and race condition bugs are fixed. All 14 performance findings from the April 12 audit have been addressed or are tracked (13 resolved, 1 open — tick rate).

**Key architecture facts:**
- There is no optimistic UI in online mode. Client is fully server-driven; all state changes wait for `STATE_SNAPSHOT`.
- Authoritative dice rolls use CSPRNG (`crypto.getRandomValues` → `nk.uuidv4` fallback). Client rolls still use `Math.random`.
- Analytics at match end are fully batched — one `nk.storageWrite` call via `AnalyticsEventWriteBuffer`, not per-event writes.
- ELO processing now batches the idempotency check + both player profile reads into a single `storageRead`.
- Tournament OCC writes now validate the storage version before every write; version conflict = retry, other error = throw.
- Socket management detects stale/closed sockets via lifecycle handlers and `isSocketOpen()`, preventing silent message loss.
- Admin session storage (ur-internals) migrated from `localStorage` to `sessionStorage` with in-memory caching.

**Not yet mapped:** the full component tree, screen-level Nakama hooks (how `rollCommandSender`/`moveCommandSender` are injected), private match status polling, and the full list of challenge definitions.

---

## Open Questions

- How are `rollCommandSender` and `moveCommandSender` injected into the store from the game screen hook?
- What is the complete set of challenge definitions in `shared/challenges.ts`?
- How does the private match status polling work in detail?
- What does the full component tree look like for the game screen?

---

## Evolution Notes

- **2026-04-11** — Wiki initialized and first codebase ingest completed. 12 pages created across concepts and entities.
- **2026-04-11** — Backend deep-dive: Nakama runtime, tournament flow, challenge system, and optimistic UI question fully mapped. 4 new pages, 1 updated (transport-layer), 1 query saved. All open questions from first ingest answered.
- **2026-04-12** — 8-commit pull ingested. Performance audit issues confirmed applied. Secure RNG, socket hardening, analytics batching, ELO batching, tournament OCC hardening, and vertical board alignment refactor all documented. Test coverage updated (~92→~98 test files). 7 pages updated.
- **2026-04-12** — Spectator mode feature ingested (commit `0d6cc748`). New concept page created. 6 pages updated: matchmaking, match-protocol, nakama-runtime, transport-layer, expo-router, overview.
