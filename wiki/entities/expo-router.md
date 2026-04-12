# Expo Router (Screen Structure)

> File-based routing layout of the app — all screens, groups, and provider wrapping.

**Last updated:** 2026-04-12 (commit `0d6cc748`)  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[architecture]], [[transport-layer]], [[matchmaking]], [[spectator-mode]]

---

## Root Layout (`app/_layout.tsx`)

The root layout sets up the global provider stack and the `Stack` navigator. All screens inherit these providers:

```
SafeAreaProvider
  StatusBar (light, translucent)
  AuthProvider
    EloRatingProvider
      ProgressionProvider
        ChallengesProvider
          ScreenTransitionProvider
            Stack (Expo Router)
```

Stack-level options: transparent header with parchment text, Fredoka font family, fade animation on iOS/Android.

---

## Screen Map

| Route | File | Description |
|---|---|---|
| `/` | `app/index.tsx` | Home screen / landing |
| `/challenges` | `app/challenges.tsx` | Challenges list |
| `/leaderboard` | `app/leaderboard.tsx` | ELO leaderboard |
| `/username-onboarding` | `app/username-onboarding.tsx` | Username setup flow |
| `/oauthredirect` | `app/oauthredirect.tsx` | Google OAuth redirect handler |
| `/tutorial/*` | `app/tutorial/` | Tutorial flow |
| `/match/*` | `app/match/` | In-progress match screen |
| `/match/[id]?spectator=1` | `app/match/[id].tsx` | Match viewed in spectator mode |
| `/(game)/*` | `app/(game)/` | Game mode selection group |
| `/(game)/spectate` | `app/(game)/spectate.tsx` | Browse live matches to spectate (NEW) |
| `/(auth)/*` | `app/(auth)/` | Auth screens group |

---

## Route Groups

**`(game)/`** — game flow screens (no header):
- `_layout.tsx` — layout for the group
- `bot.tsx` — bot/offline game launch
- `game-modes.tsx` — mode selection screen
- `lobby.tsx` — online lobby / waiting for match (updated for 4-column ultra-wide layout)
- `spectate.tsx` — browse spectatable live matches (NEW, 449 lines, commit `0d6cc748`)
- `tournaments/` — tournament-specific screens

**`(auth)/`** — auth screens:
- `_layout.tsx`
- `login.tsx`
- `register.tsx`

---

## Match Screen

`app/match/` — the core in-game screen. This is where:
- The Nakama socket is connected post-matchmaking
- `rollCommandSender` and `moveCommandSender` are injected into the store
- `onlineMode` is set to `'nakama'`
- Incoming `socket.onmatchdata` events are decoded and dispatched to `store.applyServerSnapshot`
- The game board and turn UI are rendered

---

## Fonts

Loaded in the root layout via `expo-font`:
- `LilitaOne-Regular.ttf` → used for both `HOME_FREDOKA_FONT_FAMILY` and `HOME_GROBOLD_FONT_FAMILY`
- `Supercell-Magic-Regular.ttf` → `HOME_SUPERCELL_FONT_FAMILY`

The app returns `null` while fonts are loading (no splash/loading screen).

---

## Animation

Fade animation (`animation: 'fade'`) is applied to the `(game)` and `match` groups on iOS and Android. Web does not get this animation (platform check in `_layout.tsx`).
