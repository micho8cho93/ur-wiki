# Progression System

> XP awards, rank ladder, and how the client and server share the same progression logic.

**Last updated:** 2026-04-11  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[match-protocol]], [[architecture]], [[elo-system]], [[match-configs]]

---

## Location

`shared/progression.ts` — shared between client and Nakama backend.

---

## XP Sources

Every win source has a fixed XP amount defined in `XP_SOURCE_CONFIG`:

| Source | XP | Context |
|---|---|---|
| `pvp_win` | 100 | Authoritative ranked online win |
| `tournament_champion` | 250 | Tournament winner |
| `private_pvp_win` | 25 | Private match win |
| `bot_win` | 50 | Standard Quick Play bot win (authenticated) |
| `practice_1_piece_win` | 10 | Pure Luck bot win |
| `practice_3_pieces_win` | 20 | Race bot win |
| `practice_5_pieces_win` | 30 | Legacy 5-piece bot win |
| `practice_finkel_rules_win` | 40 | Finkel Rules bot win |
| `practice_capture_win` | 50 | Capture bot win |
| `practice_extended_path_win` | 60 | Extended Path bot win |

XP is only awarded to authenticated users. Unauthenticated offline play earns no XP.

---

## Rank Ladder

15 ranks, each with a cumulative XP threshold:

| Rank | Title | Threshold |
|---|---|---|
| 1 | Laborer | 0 |
| 2 | Servant of the Temple | 100 |
| 3 | Apprentice Scribe | 250 |
| 4 | Scribe | 475 |
| 5 | Merchant | 800 |
| 6 | Artisan | 1,275 |
| 7 | Priest | 1,975 |
| 8 | Diviner | 2,975 |
| 9 | Royal Guard | 4,375 |
| 10 | Noble of the Court | 6,375 |
| 11 | Governor | 9,175 |
| 12 | Royalty | 13,175 |
| 13 | High Priest | 19,175 |
| 14 | Emperor of Sumer & Akkad | 28,175 |
| 15 | Immortal | 40,000 |

Thresholds are **cumulative total XP**, not per-rank deltas.

---

## Key Types

**`ProgressionSnapshot`** — the client-facing state of a player's progression:
```
totalXp, currentRank, currentRankThreshold
nextRank, nextRankThreshold
xpIntoCurrentRank, xpNeededForNextRank, progressPercent
```

**`ProgressionAwardResponse`** — sent after an XP grant:
```
matchId, source, duplicate (idempotency flag)
awardedXp, previousTotalXp, newTotalXp
previousRank, newRank, rankChanged
progression: ProgressionSnapshot
```

---

## Key Functions

| Function | Purpose |
|---|---|
| `getRankForXp(totalXp)` | Returns the `RankDefinition` for a given XP total |
| `getNextRankForXp(totalXp)` | Returns the next rank above current |
| `buildProgressionSnapshot(totalXp)` | Builds the full `ProgressionSnapshot` |
| `getXpAwardAmount(source)` | Lookup XP amount for a source |
| `sanitizeTotalXp(value)` | Clamps/floors to valid non-negative integer |

---

## Server Authority

XP grants happen on the **Nakama backend**:
- The match runtime emits a completed-match summary at game end
- The backend evaluates which XP source applies
- XP is granted via an **idempotent ledger** (the `duplicate` flag prevents double-granting)
- The result is sent to the client as `PROGRESSION_AWARD` (op 102)

The client's `ProgressionProvider` (`src/progression/`) reads current progression via the `get_progression` RPC on mount and updates when a `lastProgressionAward` lands in the store.

---

## Client Contexts

`src/progression/ProgressionContext.tsx` — provides current progression data to the component tree. Reads from Nakama RPC on mount, refreshes after match rewards land in the store.
