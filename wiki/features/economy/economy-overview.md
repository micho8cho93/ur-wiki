# Economy System

> Master synthesis of Ur's progression, currency, monetization, and cosmetic marketplace.

**Last updated:** 2026-04-16 (commit `1fbf253`)
**Sources:** [[2026-04-14-economy-monetization-spec]], GitHub repo (micho8cho93/ur)
**Related:** [[progression-system]], [[progression-currency]], [[monetization]], [[tournament-economy]], [[cosmetic-store]], [[wallet-system]]

---

## Overview

The Royal Game of Ur uses a **dual-currency economy** with three parallel reward systems:

1. **Progression** — XP → rank ladder (15 ranks, cosmetic prestige)
2. **Soft Currency** — earned from matches, challenges, daily login (cosmetic purchases)
3. **Premium Currency** — optional real-money purchase (cosmetics + seasonal passes)

**Core design principle:** No pay-to-win. All monetization is cosmetic and progression-focused. Game outcomes and matchmaking fairness are never affected by purchases.

---

## The Three Systems at a Glance

### 1. Progression & Rank Ladder
See [[progression-currency]] for full details.

- **15-rank system** from Laborer (rank 1) to Immortal (rank 15)
- **XP sources:** wins, challenges, tournaments, daily bonuses
- **Server-authoritative** grants with idempotent ledger (prevents double-awards)
- **Cosmetic payoff:** prestige titles, rank badges

### 2. Soft Currency System
See [[progression-currency]] for earnings/spending details.

- **Primary earner:** match wins (15 currency), losses (5), daily login bonus (50)
- **Secondary:** daily/weekly challenges (25–300)
- **Spending:** cosmetics (300–500 soft), dice animations, emoji packs, challenge rerolls
- **Target:** 80–150 per session (sustainable without purchase)

### 3. Premium Currency System
See [[monetization]] for full pricing and strategy.

- **Optional real-money purchase:** €1.99–€19.99 packs (200–3200 premium)
- **Spending:** rare/legendary cosmetics (800–2500 premium), exclusive bundles, seasonal passes
- **Psychology:** first-purchase target €1.99–€4.99; prestige-driven, not convenience-driven

---

## Currency Lifecycle

```
[Match/Challenge/Login]
        ↓
   [Soft Currency Earned]
        ↓
   [Soft Store]  ←→  [Premium Store]
        ↓                    ↓
   [Basic Cosmetics]  [Rare/Legendary]
   [Animations]       [Seasonal Passes]
   [Emotes]           [Limited Bundles]
```

---

## Cosmetic Tiers

All cosmetics follow a **4-tier system** based on visual quality and price:

| Tier | Visual Quality | Price | Currency |
|------|---|---|---|
| **Common** | Simple recolors | 300–500 | Soft |
| **Rare** | Unique textures | 500–1000 | Soft or low premium |
| **Epic** | Stylized, animated | 800–1200 | Premium |
| **Legendary** | Animated + reactive | 1500–2500 | Premium |

---

## Tournament & Challenge Economics

### Tournaments
See [[tournament-economy]] for bracket/structure details.

- **Entry:** soft currency only (100–500)
- **Reward pool:** 2–5x entry fee (redistributed to winners)
- **Exclusive cosmetics:** cosmetic rewards for placement
- **Prestige titles:** cosmetic badges for tournament champions
- **Future:** sponsored tournaments, no direct cash payouts at launch

### Challenges
See [[progression-currency]] for full definitions.

- **Daily:** 3 per day, 25–75 currency + XP each
- **Weekly:** 150–300 currency reward
- **Server-side evaluation:** backend validates (win streaks, comebacks, etc.)

---

## Session Economics

**Target per 3–6 match session:**
- **XP:** 30–270 (varies by outcome and bonuses)
- **Soft Currency:** 80–150 (baseline + daily bonus)
- **Cosmetics:** 1–2 afforded per day at baseline earn rate

**Spending patterns:**
- Free player: cosmetics every 1–2 days
- Whales: can afford cosmetics + premium pass + seasonal exclusives
- No progression slowdown from spending

---

## Store & Rotation

See [[cosmetic-store]] for UI/UX, rotation mechanics, and preview system.

**Three rotation types:**

1. **Daily Rotation** — 6–8 common/rare cosmetics, refreshes every 24h
2. **Featured Rotation** — 1–2 epic/legendary items, refreshes every 3–7 days
3. **Limited-Time Events** — exclusive cosmetics, 3–14 day windows

**Preview system is critical:** Users must see cosmetics on a live board before purchase (essential for conversion).

---

## Retention Targets

Before scaling monetization aggressively, the game must hit these benchmarks:

| Metric | Target |
|---|---|
| **D1 Retention** | 35–45% |
| **D7 Retention** | 15–25% |
| **D30 Retention** | 5–10% |

Once retention is healthy, monetization (premium currency offers, battle pass, seasonal passes) can be tuned without harming engagement.

---

## Design Constraints

**Hard constraints (non-negotiable):**
- No purchasable advantage in Elo, match outcomes, or tournament placement
- Monetization never creates grind walls or incentivizes unbalanced gameplay
- Progression always feels earned, not farmed
- All rewards are server-authoritative (cheat-proof)

**Soft constraints (strategic):**
- Cosmetics must be visible in gameplay (prestige-driven)
- First purchase should feel low-risk (€1.99–€4.99)
- Store should feel fresh (daily/weekly rotation)

---

## Related Systems

- **[[progression-system]]** — how XP sources are defined in code
- **[[elo-system]]** — rating system (independent of cosmetics/currency)
- **[[challenge-system]]** — challenge evaluation and rewards
- **[[tournament-flow]]** — tournament structure and advancement
- **[[cosmetic-store]]** — store UI/UX and rotation mechanics

---

## Implementation Status (2026-04-16)

As of commit `1fbf253`, the core economy systems are **fully implemented** in the codebase:

| System | Status |
|---|---|
| Soft currency wallet | ✅ Implemented (`backend/modules/wallet.ts`, `shared/wallet.ts`, `src/wallet/WalletContext.tsx`) |
| Challenge → currency rewards | ✅ Implemented (`calculateChallengeSoftCurrencyReward`, rate = XP × 0.1) |
| Cosmetic catalog & storage | ✅ Implemented (`backend/modules/cosmeticCatalog.ts`) |
| Store rotation algorithm | ✅ Implemented (`backend/modules/storeRotation.ts`) |
| Storefront + purchase RPCs | ✅ Implemented (14 RPCs in `cosmeticStore.ts`) |
| Cosmetic theme system | ✅ Implemented (`shared/cosmeticTheme.ts`, `src/store/CosmeticThemeContext.tsx`) |
| Store screen | ✅ Implemented (`app/(game)/store.tsx`) |
| Purchase analytics | ✅ Implemented (`cosmetic_purchase` event) |
| Admin store management | ✅ Implemented (ur-internals StoreCatalog, StoreRotation, StoreStats) |
| Premium currency IAP | 🔲 Not yet implemented (spec only) |
| Battle pass / seasonal passes | 🔲 Not yet implemented |
| Tournament cosmetic rewards | 🔲 Not yet wired up |

See [[wallet-system]] for wallet implementation details. See [[cosmetic-store]] for store/rotation implementation.

## Remaining Next Steps

1. **Premium currency IAP** — real-money purchase flow (App Store / Google Play)
2. **Tournament cosmetic prizes** — wire up `tournament_reward` source in owned cosmetics
3. **A/B testing** — price points, rotation frequency, featured cosmetics
4. **Retention campaigns** — double XP events, challenge events, seasonal passes
