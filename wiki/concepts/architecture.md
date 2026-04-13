# Architecture

> High-level structure of the Royal Game of Ur app: how the frontend, backend, and shared logic are layered.

**Last updated:** 2026-04-11  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[transport-layer]], [[game-engine]], [[nakama-service]], [[zustand-game-store]], [[expo-router]], [[match-protocol]]

---

## Three-Layer Design

```
┌─────────────────────────────────────────────┐
│              Expo App (Client)               │
│  app/ (screens) → components/ → src/        │
│  Zustand store ← hooks → services/          │
├─────────────────────────────────────────────┤
│         shared/  (client + server)           │
│  urMatchProtocol, progression, elo,          │
│  challenges, privateMatchCode                │
├─────────────────────────────────────────────┤
│       Nakama Backend (Docker)                │
│       backend/modules/ (TS runtime)          │
│       PostgreSQL + Nakama game server        │
└─────────────────────────────────────────────┘
```

The `logic/` folder is **pure game engine** — used by the client and importable by the backend. The `shared/` folder is the **client-server contract** — protocol types, XP rules, ELO formulas, challenge definitions. Neither layer has any React or Nakama SDK dependencies.

---

## Frontend Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK (React Native) |
| Routing | Expo Router (file-based, Stack navigator) |
| State | Zustand (`store/useGameStore.ts`) |
| Styling | NativeWind (Tailwind for RN) + `urTheme` constants |
| Auth | `src/auth/AuthProvider` + `NakamaService` |
| Feature contexts | `src/` — progression, elo, challenges, transitions |

The root layout (`app/_layout.tsx`) wraps the app in a provider stack: `AuthProvider → EloRatingProvider → ProgressionProvider → ChallengesProvider → ScreenTransitionProvider`.

---

## Backend Stack

| Layer | Technology |
|---|---|
| Game server | Nakama (open source, self-hosted) |
| Runtime language | TypeScript (compiled to JS, run inside Nakama) |
| Database | PostgreSQL (managed by Nakama) |
| Deployment | Docker Compose (dev: `backend/docker-compose.yml`, prod: `backend/deploy/docker-compose.prod.yml`) |
| TLS (prod) | Reverse proxy in the prod Docker stack |

The Nakama TypeScript runtime (`backend/modules/`) handles:
- Authoritative match state (the server runs the same game engine as the client)
- Progression awards (XP grants, idempotency via ledger)
- ELO calculation and leaderboard writes
- Challenge evaluation
- Private match creation/joining RPCs
- AFK detection and turn timers

---

## Transport Modes

The app has two hard-coded runtime modes, selected by env var `EXPO_PUBLIC_GAME_TRANSPORT`:

- **`offline`** — game runs entirely on the client. Bot plays for the `dark` side. No Nakama connection.
- **`nakama`** — client connects to Nakama WebSocket. All game actions sent to server; server responds with authoritative `STATE_SNAPSHOT`. Client state is always a reflection of server state.

The seam between modes lives in [[zustand-game-store]] (`store.roll()` and `store.makeMove()`) and [[transport-layer]].

---

## Data Flow (Online Match)

```
User taps "Roll"
  → store.roll()
  → onlineMode === 'nakama' → rollCommandSender({ type: 'roll_request' })
  → Nakama WebSocket (op 1)
  → Server validates turn, rolls dice authoritatively
  → Server broadcasts STATE_SNAPSHOT (op 100) to both players
  → store.applyServerSnapshot(snapshot)
  → React re-renders from new store state
```

---

## Key Shared Boundaries

- `logic/types.ts` — `GameState`, `Piece`, `Player`, `MoveAction` — used everywhere
- `shared/urMatchProtocol.ts` — all op codes and payload types for client↔server messages
- `shared/progression.ts` — XP amounts, rank thresholds, snapshot builder — run on both sides
- `shared/elo.ts` — ELO formula, K-factors — run on both sides
- `shared/challenges.ts` — challenge definitions — single source of truth for client and backend
