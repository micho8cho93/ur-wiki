# Progression & Currency System

> XP sources, rank ladder, soft currency earnings and spending, and session economics.

**Last updated:** 2026-04-14  
**Sources:** [[2026-04-14-economy-monetization-spec]], [[progression-system]]  
**Related:** [[economy-overview]], [[challenge-system]], [[tournament-economy]]

---

## XP System (Progression Backbone)

### XP Per Match

| Outcome | XP |
|---------|-----|
| Win | 25 XP |
| Loss | 10 XP |
| Draw (if applicable) | 15 XP |

### Performance Bonuses

| Event | Bonus XP |
|-------|----|
| Win streak (per extra win) | +5 XP |
| Fast win (<2 min) | +5 XP |
| Comeback win | +10 XP |

**Cap per match:** ~40–45 XP max

**Context:** These values are a spec proposal for future expansion. Current codebase uses different XP sources (see [[progression-system]] for actual implementation values like `pvp_win: 100`, `tournament_champion: 250`).

---

## Rank Ladder

15-rank progression system with cumulative XP thresholds. This is a **cosmetic prestige ladder** independent of Elo rating.

| Rank | Title | XP Required (Total) |
|------|-------|---------------------|
| 1 | Laborer | 0 |
| 2 | Servant | 100 |
| 3 | Apprentice Scribe | 250 |
| 4 | Scribe | 500 |
| 5 | Merchant | 900 |
| 6 | Artisan | 1,500 |
| 7 | Priest | 2,300 |
| 8 | Diviner | 3,500 |
| 9 | Royal Guard | 5,000 |
| 10 | Noble | 7,000 |
| 11 | Magistrate | 9,500 |
| 12 | Vizier | 12,500 |
| 13 | Governor | 16,000 |
| 14 | Royal Advisor | 20,000 |
| 15 | King's Champion | 25,000 |

**Note:** Current codebase uses slightly different rank titles and thresholds (see [[progression-system]] for canonical values). This spec represents a proposed future expansion.

---

## Soft Currency (Primary Economy)

### Currency Name
Placeholder options: "Coins" / "Silver" / "Shekels"

### Earnings

| Action | Soft Currency |
|--------|-------|
| Win | 15 |
| Loss | 5 |
| Daily login | 50 |
| Challenge completion | 25–100 |
| First win of day bonus | +25 |

**Target per session:** 80–150 currency (3–6 matches + daily bonus)

This rate is designed to be achievable without purchase, allowing free players to afford cosmetics every 1–2 days.

### Spending

| Item | Cost |
|------|-----|
| Basic board skin | 500 |
| Basic piece skin | 300 |
| Dice animation | 400 |
| Emoji pack | 200 |
| Challenge reroll | 50 |
| Tournament entry (soft) | 100–300 |

---

## Challenge System (Retention Engine)

Challenges are the secondary earner and a retention lever. Server evaluates outcomes after matches.

### Daily Challenges
- **Count:** 3 per day
- **Reward:** 25–75 currency + XP
- **Examples:**
  - Win 2 games (Easy) → 25 currency
  - Win without losing a piece (Medium) → 50 currency
  - Win 3 in a row (Hard) → 100 currency

### Weekly Challenges
- **Count:** 1 per week
- **Reward:** 150–300 currency

**Reroll mechanic:** Players can reroll a challenge for 50 soft currency (optional, for engagement friction).

---

## First 30-Day Player Experience

This arc shows how currency and progression compound to create retention:

### Day 1
- **Rank:** 1–3 (Laborer → Apprentice Scribe)
- **Cosmetics:** Unlock 1–2 basic cosmetics (quick wins to feel progress)
- **Soft currency:** ~100–150 (first login bonus + 3–4 matches)

### Day 7
- **Rank:** 4–5 (Scribe or Merchant)
- **Cosmetics:** Own 3–5 basic/rare skins
- **Soft currency:** Accumulated ~500–1000 (afforded 1–2 additional cosmetics)
- **Engagement:** Completing daily challenges becomes routine

### Day 30
- **Rank:** 6–8 (Artisan to Diviner)
- **Cosmetics:** 8–12 owned (mix of basic, rare, event exclusives)
- **Soft currency:** Possible first premium purchase decision (€1.99–€4.99)
- **Retention:** Daily login bonuses + challenge chasing keeps players returning

---

## Session Economics Breakdown

**Assumptions:**
- Avg match length: 3–5 minutes
- Target session: 3–6 matches
- Player skill: intermediate (50% win rate, some bonuses)

### Session A: Casual (3 matches, 1 win)
- **XP:** 25 (win) + 10 (loss) + 10 (loss) = 45 XP
- **Soft currency:** 15 (win) + 5 (loss) + 5 (loss) + 50 (daily) = 75 currency
- **Outcome:** Minimal progress, but daily bonus makes it worthwhile

### Session B: Engaged (5 matches, 3 wins, win streak)
- **XP:** 25 + 5 (streak bonus) + 25 + 5 (streak) + 25 + 10 + 10 = 105 XP
- **Soft currency:** 15 + 15 + 15 + 5 + 5 + 50 (daily) = 105 currency
- **Outcome:** Good progress toward next rank, can afford 1 basic cosmetic

### Session C: Hardcore (6 matches, 5 wins, streaks + comebacks)
- **XP:** 25 + 5 + 25 + 5 + 25 + 5 + 25 + 10 (comeback) + 25 + 10 = 160 XP
- **Soft currency:** 15×5 + 5 + 25 (first win) + 50 (daily) = 155 currency
- **Outcome:** Approaching rank up, can afford rare cosmetic + challenge reroll

---

## Server Authority & Idempotency

All XP and currency grants are **server-authoritative**:

1. Match completes on client
2. Nakama backend evaluates match result
3. Backend grants XP via **idempotent ledger** (prevents double-awards)
4. Client receives `PROGRESSION_AWARD` operation with delta
5. Client displays progression update UI

This design prevents cheating (local XP inflation) and ensures consistency in leaderboards.

---

## Cosmetic Payoff

Progression rank unlocks **cosmetic prestige, not gameplay advantage:**

- **Rank badges:** Visible on profile and leaderboard (prestige signal)
- **Seasonal titles:** Exclusive cosmetic titles for tournament/challenge winners
- **Achievement emotes:** Earned through challenge completion

No rank requirement for cosmetics—soft and premium cosmetics are purchasable at any rank. Rank is pure cosmetic achievement.

---

## Future Expansions (Post-Launch)

- **Battle pass:** Soft + premium tier tracks (cosmetics + currency rewards)
- **Seasonal passes:** Time-limited cosmetic + XP boost passes
- **Challenge events:** Double XP / currency weekends during events
- **Prestige ladder:** 100+ levels beyond rank 15 (for hardcore players)

---

## Related Pages

- **[[economy-overview]]** — master synthesis linking all economy systems
- **[[monetization]]** — premium currency, pricing, tiers
- **[[cosmetic-store]]** — store UI, rotation, preview mechanics
- **[[tournament-economy]]** — tournament entry fees and reward pools
- **[[progression-system]]** — actual codebase implementation
- **[[challenge-system]]** — challenge definitions and evaluation
