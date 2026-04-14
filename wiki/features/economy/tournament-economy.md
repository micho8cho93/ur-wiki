# Tournament Economy

> Entry fees, reward pools, cosmetic prizes, and how tournaments integrate with the currency system.

**Last updated:** 2026-04-14  
**Sources:** [[2026-04-14-economy-monetization-spec]], [[tournament-flow]]  
**Related:** [[economy-overview]], [[progression-currency]], [[monetization]], [[tournament-flow]]

---

## Tournament Structure (Economic View)

Tournaments are a **revenue sink and engagement driver** — they pull soft currency from the economy and return it to winners. This creates a healthy circulation of currency without devaluing it.

### Entry Fee (Soft Currency Only)

Tournaments use **soft currency entry only** (no premium currency). This ensures free players can participate fully.

| Tournament Size | Entry Fee | Estimated Participants | Reward Pool |
|-----------------|-----------|------------------------|-------------|
| **Small** | 100 | 8–16 | 300 |
| **Medium** | 250 | 16–32 | 1,000 |
| **Large** | 500 | 32–64 | 3,000 |

**Key principle:** Entry fee is **non-refundable** (sunk cost creates commitment), but winners recoup 2–5x their entry via prize distribution.

---

## Reward Distribution Models

### Model A: Winner-Take-Most (Esports-Style)

Used for ranked/competitive tournaments:

| Placement | % of Pool | Small (300) | Medium (1000) | Large (3000) |
|-----------|-----------|-------------|---------------|-------------|
| 1st | 50% | 150 | 500 | 1500 |
| 2nd | 30% | 90 | 300 | 900 |
| 3rd–4th | 15% | 45–23 | 150–75 | 450–225 |
| 5th–8th | 5% | 15–4 | 50–13 | 150–38 |

**Psychology:** High variance rewards create excitement and drive participation ("I could 3x my investment!").

### Model B: Broad Distribution (Participation-Focused)

Used for casual/fun tournaments:

| Placement | % of Pool | Small (300) | Medium (1000) |
|-----------|-----------|-------------|---------------|
| 1st | 40% | 120 | 400 |
| 2nd | 30% | 90 | 300 |
| 3rd–4th | 20% | 60–30 | 200–100 |
| 5th–8th | 10% | 30–4 | 100–12 |

**Psychology:** Flatter distribution rewards participation ("everyone gets something"), better for retention over pure competitiveness.

---

## Cosmetic Rewards (Tournament Exclusive)

Beyond currency, tournaments award **exclusive cosmetics** to increase prestige:

### Cosmetic Prize Tiers

| Placement | Cosmetic Reward | Type |
|-----------|-----------------|------|
| **1st** | Cosmetic title + unique board skin | Legendary |
| **2nd–3rd** | Cosmetic title + piece color | Epic |
| **4th–8th** | Tournament participation badge | Rare |
| **All participants** | Tournament bracket cosmetic emote | Common |

**Design goal:** Winners feel prestige through cosmetics *and* currency. Free players can compete for free cosmetics; wealthy players can buy entry multiple times.

### Seasonal Tournament Cosmetics

Special tournaments (monthly, quarterly) award **limited-time cosmetics:**

- **Monthly champion skin:** Unique board design, available for 1 month
- **Quarterly cosmetic:** Exclusive animation or effect, time-limited
- **Annual championship:** Rarest cosmetic, only awarded to annual champion

---

## Tournament Entry & Economy Lifecycle

### Small Tournament Example (Entry: 100, Pool: 300)

**Day 1: Tournament Opens**
- 16 players register (100 currency each)
- Total pool: 1,600 currency collected
- Official pool: 300 currency (from spec)
- **Excess:** 1,300 currency "sunk" from economy

**This is intentional:** Tournament entries remove currency from circulation, creating scarcity and value. Without sinks, currency inflates.

### Why Multiple Sizes?

Three tournament tiers serve different player segments:

| Tier | Risk Appetite | Frequency | Goal |
|------|---|---|---|
| **Small (100)** | Casual | Multiple per day | Accessible, low commitment |
| **Medium (250)** | Intermediate | Weekly | Core engagement |
| **Large (500)** | Hardcore | Weekly | Competitive prestige |

A player can enter Small daily (low risk), Medium weekly (moderate commitment), Large occasionally (high stakes).

---

## Currency Economics: Entry As A Sink

**The Problem:** Without currency sinks, free players earn 80–150 per session indefinitely, eventually owning all cosmetics.

**The Solution:** Tournaments create voluntary currency sinks:

```
[Session earnings: 100 soft]
        ↓
[Player choice: save or enter tournament?]
        ↓
[If tournament: 100 sunk, 300 pool distributed to winners]
        ↓
[Winners recoup 3x, losers lose entry, currency circulates]
```

This creates a **healthy currency velocity**—cosmetics remain valuable, progression feels rewarding, and hardcore players can grind tournaments for currency + cosmetics.

---

## Fairness & No Pay-to-Win

**Tournament design is 100% skill-based:**

- ❌ No cosmetic advantage (cosmetics are visual-only, no hidden stats)
- ❌ No Elo gate (anyone can enter regardless of rank)
- ❌ No premium entry tier (soft currency only)
- ✅ Bracket seeding by current Elo (skill-matched games)
- ✅ Server-authoritative match logic (no client-side cheating)

---

## Future Tournament Expansions (Post-Launch)

### Sponsored Tournaments

Brands or community figures sponsor tournaments:
- Sponsor provides prize pool (cosmetics + currency)
- Ur takes 10–15% cut (operational cost)
- Players compete for enhanced rewards
- **No real-money payouts** (cosmetic/currency only)

### Battle Royale Tournaments

50–100 player format:
- Entry: 250 soft currency
- Pool: 2,500+ soft (distributed to final 10)
- Duration: 2–4 hours per tournament

### Weekly Leagues

Recurring tournaments with leaderboard tracks:
- Players compete weekly, earn points
- Top 10 get cosmetic title + cosmetics at season end
- Encourages consistent play

---

## Tournament Economics Summary Table

| Aspect | Design | Rationale |
|--------|--------|-----------|
| **Entry type** | Soft only | Free players can compete; no paywall |
| **Reward model** | 2–5x entry pool | Winners incentivized, non-winners feel risk |
| **Cosmetic rewards** | Exclusive to 1st–4th | Prestige signal for competitive players |
| **Frequency** | Small: daily, Medium: 2–3/week, Large: 1/week | Multiple participation tiers |
| **No real-money payouts** | By design | Regulatory simplicity; cosmetic prestige |
| **Skill-based seeding** | Elo-matched brackets | Fair matchups; no pay-to-win |

---

## Related Pages

- **[[economy-overview]]** — master synthesis of progression, currency, monetization
- **[[progression-currency]]** — soft currency earnings from matches/challenges
- **[[monetization]]** — premium currency and cosmetic pricing
- **[[tournament-flow]]** — tournament structure, brackets, and match logic
