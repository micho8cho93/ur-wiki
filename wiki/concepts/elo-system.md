# ELO System

> The rating system for competitive online matches: formula, K-factors, provisional period, and leaderboard.

**Last updated:** 2026-04-11  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[progression-system]], [[match-protocol]], [[architecture]], [[match-configs]]

---

## Location

`shared/elo.ts` — shared between client and Nakama backend.

---

## Constants

| Constant | Value | Meaning |
|---|---|---|
| `DEFAULT_ELO_RATING` | 1200 | Starting rating for new players |
| `PROVISIONAL_RATED_GAMES` | 10 | Games needed to leave provisional status |
| `PROVISIONAL_K_FACTOR` | 40 | K-factor while provisional (high volatility) |
| `ESTABLISHED_K_FACTOR` | 24 | K-factor once established (lower volatility) |
| `ELO_LEADERBOARD_ID` | `"elo_global"` | Nakama leaderboard identifier |

---

## Formula

Standard ELO with variable K-factor:

```
expectedScore = 1 / (1 + 10^((opponentRating - playerRating) / 400))
newRating = oldRating + K × (actualScore - expectedScore)
```

`actualScore` is 1 for a win, 0 for a loss.

`computeEloRatingUpdate(params)` takes both players' current ratings + game counts and returns `EloComputationResult` with new ratings and deltas for both.

---

## Provisional vs. Established

- A player is **provisional** for their first 10 rated games (K=40)
- After 10 games, they become **established** (K=24)
- The `provisional` flag is included in all rating profiles and leaderboard entries
- Provisional players' ratings are more volatile by design — they converge faster

---

## Key Types

**`EloProfile`** — full stored profile: userId, display name, rating, game counts, provisional status, last rated match, timestamps.

**`EloLeaderboardEntry`** — leaderboard row: userId, name, rating, provisional flag, rank number.

**`EloRatingProfileRpcResponse`** — extends `EloLeaderboardEntry` with leaderboard ID and last rated match info.

**`EloRatingChangeNotificationPayload`** — sent as op 103 after a rated match:
```
{ type: 'elo_rating_update', leaderboardId, matchId, duplicate,
  player: EloMatchParticipantRatingView,
  opponent: EloMatchParticipantRatingView }
```

Each `EloMatchParticipantRatingView` includes: old/new rating, delta, K-factor, expected/actual scores, provisional status, game counts, leaderboard rank.

---

## Eligibility

ELO is **only updated for ranked matches**. Only `standard` (Quick Play) mode has `allowsRankedStats: true` in its [[match-configs]]. Practice modes and private matches do not affect ELO.

---

## Client Integration

`src/elo/EloContext.tsx` (`EloRatingProvider`) — provides the current player's ELO profile to the component tree. Reads via `get_elo_profile` RPC on mount. Updates when `lastEloRatingChange` lands in the Zustand store after a ranked match.

The leaderboard screen (`app/leaderboard.tsx`) reads from the `get_elo_leaderboard` and `get_elo_leaderboard_around_me` RPCs.
