# ur-wiki

A persistent, LLM-maintained knowledge base for the **Royal Game of Ur** — a multiplayer board game built with Expo (React Native) + Nakama backend.

This wiki is the compiled, synthesized layer between the raw codebase and Michel's thinking. It accumulates knowledge across sessions so context is never lost to chat history.

---

## What's in here

| Path | What it is |
|------|------------|
| [`CLAUDE.md`](CLAUDE.md) | Schema and operating rules — the constitution of the wiki |
| [`index.md`](wiki/index.md) | Master catalog of all wiki pages |
| [`log.md`](log.md) | Append-only record of every ingest, query, and update |
| [`sources/`](sources/) | Raw, immutable source material (codebase, docs, notes) |
| [`wiki/`](wiki/) | LLM-generated content — summaries, concept pages, entity pages, query answers |

---

## Wiki sections

### [Overview](wiki/overview.md)
High-level synthesis of the entire codebase — architecture, key concepts, current state of understanding.

### Concepts
Core ideas, systems, and patterns extracted from the codebase.

| Page | What it covers |
|------|---------------|
| [Architecture](wiki/concepts/architecture.md) | Three-layer design, data flow, frontend and backend stacks |
| [Game Engine](wiki/concepts/game-engine.md) | Pure game logic: types, engine, rules, path system, bot |
| [Transport Layer](wiki/concepts/transport-layer.md) | Offline vs. Nakama mode seam, command senders, snapshot flow |
| [Nakama Runtime](wiki/concepts/nakama-runtime.md) | Match lifecycle handlers, tick loop, AFK/disconnect/timer state machine |
| [Tournament Flow](wiki/concepts/tournament-flow.md) | Registration → bracket → launch → in-match → result → next round |
| [Challenge System](wiki/concepts/challenge-system.md) | Shared evaluator definitions, server-side evaluation at match end |
| [Matchmaking](wiki/concepts/matchmaking.md) | Ranked queue, private matches, socket vs HTTP |
| [Match Protocol](wiki/concepts/match-protocol.md) | Op codes, all payload types, type guards |
| [Match Configs](wiki/concepts/match-configs.md) | All 8 game modes, rules variants, eligibility flags |
| [Progression System](wiki/concepts/progression-system.md) | XP sources, 15-rank ladder, server-authoritative grants |
| [ELO System](wiki/concepts/elo-system.md) | Rating formula, K-factors, provisional period, leaderboard |
| [Performance](wiki/concepts/performance.md) | Frontend and backend bottlenecks, optimization opportunities |

### Entities
Specific services, stores, and modules with their own pages.

| Page | What it covers |
|------|---------------|
| [Nakama Service](wiki/entities/nakama-service.md) | Singleton auth + session + socket manager (`services/nakama.ts`) |
| [Zustand Game Store](wiki/entities/zustand-game-store.md) | Single source of truth for all runtime state (`store/useGameStore.ts`) |
| [Expo Router](wiki/entities/expo-router.md) | Screen map, route groups, provider stack (`app/`) |

### Sources
One summary page per ingested source.

| Page | What it covers |
|------|---------------|
| [ur-codebase (2026-04-11)](wiki/sources/2026-04-11-ur-codebase.md) | Full Expo + Nakama codebase snapshot |

### Queries
Saved answers to significant questions.

| Page | What it covers |
|------|---------------|
| [Tournament Bugs](wiki/queries/q-tournament-bugs.md) | Root causes and fixes for 3 bugs observed in 16-player tournament |

---

## How it works

- Drop a new file or run `git pull` in `sources/ur` → next session start auto-detects changes and prompts ingest
- Tell Claude `ingest sources/<name>` to process a new source
- Ask any question — Claude reads the wiki, answers with citations, and offers to save the answer as a query page
- Say `lint` for a health check: orphans, stubs, contradictions, gaps

The schema governing all of this lives in [`CLAUDE.md`](CLAUDE.md).
