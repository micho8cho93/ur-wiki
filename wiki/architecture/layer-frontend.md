# Frontend Layer

> Expo + React Native client: screens, routing, state management, and service layer.

**Last updated:** 2026-04-14  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[architecture]], [[nakama-service]], [[zustand-game-store]], [[expo-router]], [[layer-transport]]

---

## Stack Overview

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Expo SDK (React Native) | Cross-platform iOS/Android/web |
| Routing | Expo Router (file-based) | Screen navigation and route groups |
| State | Zustand (`store/useGameStore.ts`) | Global runtime state, single source of truth |
| Styling | NativeWind (Tailwind for RN) | Consistent theming and layout |
| Auth | `src/auth/AuthProvider` | OAuth sign-in, session management |
| Services | `services/` | Nakama connection, RPC calls, WebSocket |
| Contexts | `src/` | Feature-specific providers (progression, ELO, challenges, transitions) |

---

## Provider Stack

The root layout (`app/_layout.tsx`) wraps the app in a stack of context providers, evaluated top-to-bottom:

```
AuthProvider
  ↓
EloRatingProvider
  ↓
ProgressionProvider
  ↓
ChallengesProvider
  ↓
ScreenTransitionProvider
  ↓
[App screens]
```

Each provider manages a feature domain and exposes hooks for screens and components to consume state and dispatch actions.

---

## Screens and Routing

Expo Router uses file-based routing from `app/`. Key structure:

- `app/_layout.tsx` — root provider stack
- `app/(auth)/` — login, registration, onboarding (route group, shown before sign-in)
- `app/(game)/` — main app screens (shown after sign-in)
  - `app/(game)/lobby.tsx` — match list, queue UI, spectator browse
  - `app/(game)/game.tsx` — in-match board and controls
  - `app/(game)/spectate.tsx` — live spectator view (read-only)
  - `app/(game)/profile.tsx` — user stats, ELO, progression
  - `app/(game)/tournaments.tsx` — tournament list and bracket UI
- `app/(game)/settings.tsx` — user preferences

Each screen uses hooks from the feature providers to read state and dispatch actions.

---

## State Management: Zustand Store

[[zustand-game-store]] (`store/useGameStore.ts`) is the single source of truth for all runtime state:

- Current match state (`gameState`, `currentPlayerIndex`, `displayState`)
- Online mode metadata (`onlineMode`, `matchId`, `playerId`, `sessionToken`)
- User profile data (`userId`, `username`, `eloRating`, `currentRank`)
- UI flags (`isLoading`, `error`, `selectedPiece`)

The store is subscribed to by match screens and components via Zustand selectors. [[layer-transport]] reads and updates the store, making it the seam between online and offline modes.

---

## Service Layer

### NakamaService (`services/nakama.ts`)

[[nakama-service]] is a singleton that manages:

- **Authentication** — Google OAuth sign-in, session token storage and renewal
- **WebSocket connection** — connect, disconnect, send/receive match messages
- **RPC calls** — private match creation, code verification, spectatable match listing
- **Presence tracking** — broadcast player status (in lobby, in queue, in match)
- **Error recovery** — stale socket detection and reconnection

See [[nakama-service]] for full implementation details.

### Transport Senders

[[layer-transport]] exports command senders (`rollCommandSender`, `moveCommandSender`) that are injected into the store from the match screen. They abstract whether messages go to the local engine or to Nakama.

---

## Styling and Theme

NativeWind provides Tailwind utility classes for React Native. The app defines custom constants in `urTheme` for colors, spacing, and typography.

Components use className strings like they would in web Tailwind:
```tsx
<View className="flex-1 bg-slate-900 justify-center items-center">
  <Text className="text-white text-2xl font-bold">Game Title</Text>
</View>
```

---

## Feature Contexts

Located in `src/`:

- **AuthProvider** — session state, sign-in/sign-out, token refresh
- **EloRatingProvider** — leaderboard, rating changes, provisional period tracking
- **ProgressionProvider** — XP ledger, rank progression, reward notifications
- **ChallengesProvider** — active challenges, completion tracking, unlock notifications
- **ScreenTransitionProvider** — screen animations, transition timing

Each provider reads from the Zustand store and exposes hooks for screens to subscribe to specific slices.

---

## Component Tree Pattern

Most match-related components follow this pattern:

1. **Screen component** (`game.tsx`) — reads match metadata from store, fetches or subscribes to updates
2. **Container component** (`GameBoard.tsx`) — passes data to presentational components
3. **Presentational components** (`Tile.tsx`, `Piece.tsx`, `Button.tsx`) — `React.memo` with custom comparators for performance, no side effects

See [[performance]] for optimizations applied to this tree (memoization, granular selectors, Reanimated animations).
