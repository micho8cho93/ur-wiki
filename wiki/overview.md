# Overview

> Master synthesis of the Royal Game of Ur codebase: architecture, features, and current state.

**Last updated:** 2026-04-16 (commit `1fbf253`)
**Sources:** GitHub repo (micho8cho93/ur), [[2026-04-14-economy-monetization-spec]]  
**Related:** [[index]], [[architecture]], [[layer-frontend]], [[layer-backend]], [[decisions]], [[features/economy/economy-overview]]

---

## Domain

This wiki is a **codebase second brain** for the Royal Game of Ur — a multiplayer board game app built with **Expo (React Native)** for iOS, Android, and web, backed by a **Nakama** game server running TypeScript runtime modules in Docker.

---

## The Big Picture

The app has two runtime modes: **offline** (local bot opponent) and **online** (authoritative Nakama server). The same pure game engine runs on both sides, which is the architectural invariant everything else depends on. The switch between modes is a single seam in the [[zustand-game-store]] — `store.roll()` and `store.makeMove()` check `onlineMode` and either compute locally or delegate to the server via WebSocket.

A third participation type — **spectator** — was added to allow watching live matches. Spectators connect via the same Nakama WebSocket as players and receive live `STATE_SNAPSHOT` broadcasts, but all command senders are cleared and the backend rejects any game actions with a `READ_ONLY` error.

---

## Architecture Quick Reference

| Layer | Technology | Key Concepts |
|-------|-----------|--------------|
| **Frontend** | Expo Router + Zustand + NativeWind | Screens, routing, global state, provider stack |
| **Transport** | WebSocket (offline/nakama seam) | Command senders, snapshot flow, no optimistic UI |
| **Backend** | Nakama runtime (TypeScript in Docker) | Match loop, progression, ELO, challenges |
| **Shared** | Pure logic + contract types | Game engine, progression rules, challenge defs |

See [[architecture]] for the full three-layer design, or jump to [[layer-frontend]], [[layer-backend]], and [[layer-transport]] for detailed coverage.

---

## Key Features and Systems

**Core gameplay:**
- [[game-engine]] — types, engine functions, rules variants, path system, bot AI
- [[match-protocol]] — op codes, all payload types, type guards
- [[match-configs]] — all 8 game modes, their rules, and eligibility flags

**Online play:**
- [[matchmaking]] — ranked queue, private matches, spectatable match listing
- [[spectator-mode]] — read-only live match viewing and lobby integration
- [[nakama-runtime]] — match lifecycle handlers, tick loop, state machine

**Progression, rewards, and economy:**
- [[progression-system]] — XP sources, 15-rank ladder, server-authoritative grants
- [[elo-system]] — rating formula, K-factors, provisional period, leaderboard
- [[challenge-system]] — challenge definitions, server-side evaluation (now also awards Coins)
- [[tournament-flow]] — bracket registration, launch, in-match, results, advancement
- [[features/economy/economy-overview]] — Monetization, currency systems, cosmetic store
- [[features/economy/wallet-system]] — Dual-currency wallet: backend ledger + frontend context (NEW)
- [[features/economy/cosmetic-store]] — Store screen, rotation algorithm, theme system (IMPLEMENTED)

**Infrastructure:**
- [[nakama-service]] — singleton auth + session + socket manager
- [[zustand-game-store]] — single source of truth for all runtime state
- [[expo-router]] — screen map and provider structure
- [[ur-internals]] — admin web app for ops and testing

---

## Current State of Understanding

The codebase is **well-structured** with clear separation of concerns:

- `logic/` is pure and portable — `rollDice` accepts an injectable `DiceRandomSource` so the backend can use CSPRNG
- `shared/` is the client-server contract — types, rules, challenge definitions, protocol
- `services/` handles all network concerns — socket management is robust against stale/dropped connections
- `store/` is the runtime glue — uses `useShallow` grouped selectors to minimize re-renders
- `app/` + `components/` + `src/` are the UI layer — `Tile` and `Piece` are `React.memo` with custom comparators

**All major systems are mapped:** Nakama backend runtime, tournament system, challenge system, matchmaking, spectator mode, and progression/ELO. All 14 performance findings from the April 12 audit have been addressed or tracked (13 resolved, 1 open — tick rate). See [[performance]] and [[next-steps]] for details.

**Key architecture decisions:** See [[decisions]] for the rationale behind:
- No optimistic UI in online mode (simpler, more correct)
- Single Zustand store (single source of truth)
- Shared game engine (client-server consistency)
- Authoritative CSPRNG rolls (cheat-proof)
- Idempotent progression/ELO writes (no double-awards)
- And more.

---

## Navigation

**Learning the codebase?**
1. Start with [[architecture]] — high-level three-layer design
2. Pick a layer: [[layer-frontend]], [[layer-backend]], or [[layer-transport]]
3. Pick a feature: [[game-engine]], [[matchmaking]], [[progression-system]], etc.

**Debugging or extending?**
- **Game logic** → [[game-engine]], [[match-protocol]], [[match-configs]]
- **Online mode** → [[layer-transport]], [[nakama-runtime]], [[nakama-service]]
- **Progression/rewards** → [[progression-system]], [[elo-system]], [[challenge-system]]
- **Tournaments** → [[tournament-flow]]
- **Economy/monetization** → [[features/economy/economy-overview]], [[features/economy/progression-currency]], [[features/economy/monetization]], [[features/economy/cosmetic-store]]
- **Performance issues** → [[performance]], [[next-steps]]
- **Existing bugs** → [[bugs]]
- **Test gaps** → [[test-coverage]]

**Understanding why?**
- Architectural decisions → [[decisions]]
- Design trade-offs → individual feature pages (e.g., [[spectator-mode#design-choices]])

---

## Open Questions

- How are `rollCommandSender` and `moveCommandSender` injected into the store from the game screen hook?
- What is the complete set of challenge definitions in `shared/challenges.ts`?
- How does the private match status polling work in detail?

(See [[next-steps]] for items that are tracked but not yet investigated.)
