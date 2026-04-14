# Match Configs

> The configuration system that defines all game modes — piece counts, rules variants, XP eligibility, and path variants.

**Last updated:** 2026-04-11  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[game-engine]], [[progression-system]], [[architecture]]

---

## Location

`logic/matchConfigs.ts`

---

## `MatchConfig` Type

Every game mode is a `MatchConfig` object:

```typescript
MatchConfig {
  modeId: MatchModeId
  displayName: string
  pieceCountPerSide: number       // 3, 5, or 7
  rulesVariant: RulesVariant      // 'standard' | 'capture' | 'no-capture'
  pathVariant: PathVariant        // 'default' | 'full-path'
  allowsXp: boolean
  allowsOnline: boolean           // can be played in ranked online mode
  allowsChallenges: boolean
  allowsCoins: boolean
  allowsRankedStats: boolean      // counts toward ELO
  isPracticeMode: boolean
  offlineWinRewardSource: BotMatchXpSource
  opponentType: 'bot' | 'human'
  selectionSubtitle?: string
  rulesIntro?: { title, message } | null
}
```

---

## All Game Modes

| Mode ID | Display Name | Pieces | Rules | Online | Ranked | Notes |
|---|---|---|---|---|---|---|
| `standard` | Quick Play | 7 | standard | ✅ | ✅ | Default mode |
| `gameMode_1_piece` | Pure Luck | 3 | no-capture | ❌ | ❌ | No captures anywhere |
| `gameMode_3_pieces` | Race | 3 | standard | ❌ | ❌ | Short game, standard rules |
| `gameMode_5_pieces` | 5 Pieces | 5 | standard | ❌ | ❌ | Legacy practice mode |
| `gameMode_finkel_rules` | Finkel Rules | 7 | standard | ❌ | ❌ | Full length, protected rosette |
| `gameMode_pvp` | PvP | 7 | standard | ❌ | ❌ | Local two-player, no XP |
| `gameMode_capture` | Capture | 5 | capture | ❌ | ❌ | Rosette capturable, capture grants extra turn |
| `gameMode_full_path` | Extended Path | 7 | standard | ❌ | ❌ | Longer path variant |

Only `standard` (Quick Play) allows online play and ranked ELO stats. All others are practice/offline modes.

---

## Selection Lists

Three curated subsets control what appears in the UI:

**`MATCH_MODE_SELECTION_OPTIONS`** — shown in the mode picker (standard, Race, Capture, Finkel, PvP)

**`PRIVATE_MATCH_OPTIONS`** — modes available when creating a private match (Race, Capture, Finkel)

**`GAME_MODE_CONFIGS`** — full practice mode list (Race, Capture, Finkel, PvP)

---

## Helper Functions

| Function | Purpose |
|---|---|
| `getMatchConfig(modeId?)` | Returns config for a modeId, defaults to standard |
| `isMatchModeId(value)` | Type guard for `MatchModeId` |
| `isGameModeId(value)` | True if it's a practice mode (not standard) |
| `getPracticeModeRewardLabel(config)` | Returns XP reward label string, e.g. `+50 XP` |
| `getPracticeModeBadgeLabel(config)` | Returns badge string for practice modes |
| `getMatchRulesIntro(modeId)` | Returns the rules intro overlay content |
| `getPrivateMatchOption(modeId)` | Returns private match display option |

---

## Rules Variant Interaction

The `rulesVariant` on a `MatchConfig` is passed into [[game-engine]] functions:
- `isProtectedFromCapture(config, coord)` — `standard` and `no-capture` protect the shared rosette
- `isContestedWarTile(config, coord)` — only `capture` and `standard` allow captures (standard only off the rosette)
- `shouldGrantExtraTurn(config, ...)` — `capture` variant grants extra turn on capture
