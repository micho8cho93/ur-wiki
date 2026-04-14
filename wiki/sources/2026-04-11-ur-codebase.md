# Source: Royal Game of Ur — Full Codebase

> Complete Expo + Nakama codebase for the Royal Game of Ur multiplayer app.

**Last updated:** 2026-04-11  
**Sources:** *(this is the primary source)*  
**Related:** [[architecture]], [[game-engine]], [[layer-transport]], [[matchmaking]], [[match-protocol]], [[match-configs]], [[progression-system]], [[elo-system]], [[nakama-service]], [[zustand-game-store]], [[expo-router]]

---

## Overview

A full-stack multiplayer board game app. The frontend is built with **Expo (React Native)** targeting iOS, Android, and web via Vercel. The backend is **Nakama** — a self-hosted, open-source game server running TypeScript modules in a Docker stack.

The app supports two runtime transport modes:
- `nakama` — online authoritative multiplayer against a Nakama server
- `offline` — local gameplay with a bot, no server connection needed

---

## Key Takeaways

**1. The game logic is pure and transport-agnostic.** All of `logic/` (engine, rules, types, pathVariants, matchConfigs) runs identically on the client and inside the Nakama server runtime. The server imports from `shared/` which is also used by the client. This is the critical invariant that makes the authoritative server model work.

**2. The Zustand store is the single source of truth, but it adapts to the mode.** `useGameStore` handles both offline (local mutation) and online (delegate to commandSenders, receive snapshots). The `applyServerSnapshot` action replaces local state wholesale when a new authoritative snapshot arrives from Nakama.

**3. The transport layer is a clean seam.** `store.roll()` and `store.makeMove()` check `onlineMode`. In offline mode, they compute locally. In nakama mode, they call `rollCommandSender`/`moveCommandSender` — function refs injected by the game screen's Nakama hook, which send messages over the WebSocket.

**4. The match protocol is a typed message bus.** `shared/urMatchProtocol.ts` defines all op codes and payload types for client↔server communication. The server sends `STATE_SNAPSHOT` (op 100) after every authoritative state change. Clients send `ROLL_REQUEST` (op 1) and `MOVE_REQUEST` (op 2).

**5. Progression and ELO are server-authoritative.** XP awards, rank calculations, and ELO rating changes are computed by the Nakama backend. The client receives them as notification payloads after a match ends. The shared `progression.ts` and `elo.ts` files contain the business logic used by both sides.

---

## Top-Level Folder Map

| Folder/File | Role |
|---|---|
| `app/` | Expo Router file-based routing (screens) |
| `logic/` | Pure game engine: types, engine, rules, matchConfigs, pathVariants, bot |
| `store/useGameStore.ts` | Zustand global store — all runtime game state |
| `hooks/useGameLoop.ts` | React hook that drives the bot's turn in offline mode |
| `services/nakama.ts` | `NakamaService` class: auth, session management, socket |
| `services/matchmaking.ts` | Matchmaking flow: ranked queue, private matches |
| `shared/` | Types and logic shared between client and Nakama backend |
| `backend/modules/` | Nakama TypeScript server runtime |
| `components/` | UI components organized by feature |
| `src/` | Feature-scoped React contexts (auth, progression, elo, challenges, etc.) |
| `config/` | Nakama connection config from env vars |
| `constants/` | Theme, board constants |
| `assets/` | Fonts, images, sounds |
