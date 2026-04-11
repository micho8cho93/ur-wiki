# Overview

> Master synthesis of the Royal Game of Ur codebase wiki.

**Last updated:** 2026-04-11 (rev 2)  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[wiki/index]]

---

## Domain

This wiki is a **codebase second brain** for the Royal Game of Ur — a multiplayer board game app built with **Expo (React Native)** for iOS, Android, and web, backed by a **Nakama** game server running TypeScript runtime modules in Docker.

---

## The Big Picture

The app has two runtime modes: **offline** (local bot opponent) and **online** (authoritative Nakama server). The same pure game engine runs on both sides, which is the architectural invariant everything else depends on. The switch between modes is a single seam in the [[zustand-game-store]] — `store.roll()` and `store.makeMove()` check `onlineMode` and either compute locally or delegate to the server via WebSocket.

---

## Architecture in One Paragraph

Expo Router handles file-based screen routing with a transparent Stack navigator. All screens share a provider stack (Auth → ELO → Progression → Challenges → ScreenTransition). The [[zustand-game-store]] is the global runtime state container — one store, all game state, all online metadata. The [[nakama-service]] singleton manages sessions, tokens, and the WebSocket. [[matchmaking]] functions handle ranked queue and private match flows. In-match messages follow the [[match-protocol]] (typed op codes, JSON payloads). After a match, progression awards and ELO changes arrive as notification payloads and update the store, which the `ProgressionProvider` and `EloRatingProvider` contexts consume.

---

## Key Concepts

- [[architecture]] — three-layer design, data flow diagrams, frontend and backend stacks
- [[game-engine]] — types, engine functions, rules variants, path system, bot
- [[transport-layer]] — the offline/nakama mode seam, command senders, snapshot flow, no optimistic UI
- [[nakama-runtime]] — match lifecycle handlers, tick loop, timer/AFK/disconnect state machine
- [[matchmaking]] — ranked queue, private matches, socket vs HTTP
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
- `logic/` is pure and portable
- `shared/` is the client-server contract
- `services/` handles all network concerns
- `store/` is the runtime glue
- `app/` + `components/` + `src/` are the UI layer

The Nakama backend runtime, tournament system, and challenge system are now fully mapped. Three tournament bugs have been diagnosed with fixes — see [[q-tournament-bugs]].

**Key findings from backend deep-dive:**
- There is no optimistic UI in online mode. Client is fully server-driven; all state changes wait for `STATE_SNAPSHOT`.
- The AFK accumulator (`accumulatedMs`) runs across the entire match lifetime and is not reset on reconnect — the primary cause of late forfeits after a refresh.
- The match launch RPC has a race condition: `nk.matchCreate` runs before the idempotency guard write, allowing two matches to be created for the same bracket entry.
- Bracket creation writes via `updateRunWithRetry` have a commit window during which polling clients see `state: "lobby"` even though the tournament is live.

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
