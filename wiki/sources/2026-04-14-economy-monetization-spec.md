# Economy & Monetization Specification

> Comprehensive spec covering progression, currency systems, monetization strategy, and cosmetic marketplace design.

**Source ingested:** 2026-04-14  
**Related:** [[economy-overview]], [[progression-currency]], [[monetization]], [[tournament-economy]], [[cosmetic-store]]

---

## Source Overview

This spec document defines the economic model for the Royal Game of Ur as it scales to include tournaments and a cosmetic marketplace. It covers:

1. **Progression & XP system** (15-rank ladder, XP sources, bonuses)
2. **Soft currency economy** (earnings from matches/challenges/login, spending on cosmetics)
3. **Premium currency & monetization** (IAP pricing, cosmetic tiers, pricing psychology)
4. **Tournament economy** (entry fees, reward pools, cosmetic prizes)
5. **Cosmetic store UI/UX** (store structure, rotation system, preview mechanics, bundles)

---

## Key Takeaways

### 1. Dual-Currency System

- **Soft currency:** Primary earner, affordable cosmetics (300–500 range)
- **Premium currency:** Real-money purchase, rare/legendary cosmetics (800–2500 range)
- **No pay-to-win:** All cosmetics are visual-only; progression and fairness unaffected by purchase

### 2. Progression Remains Cosmetic

The existing [[progression-system]] (XP, ranks, leaderboard) is complemented by cosmetic prestige:
- Rank titles are cosmetic badges
- Tournament cosmetics reward placement prestige
- No gameplay advantage from any purchase

### 3. Soft Currency Must Not Inflate

Tournaments serve as a **currency sink** (entry fees are non-refundable), preventing free players from eventually owning everything. This maintains cosmetic value.

### 4. Store Rotation Drives Retention

- Daily rotation (6–8 common/rare cosmetics every 24h)
- Featured rotation (1–2 epic/legendary items every 3–7 days)
- Limited-time events (exclusive cosmetics, 3–14 days)

**Psychology:** Rotation creates FOMO and daily return habits.

### 5. Preview System Is Critical for Conversion

Users buy cosmetics they can see working in-context. A live board preview showing the cosmetic in gameplay is essential for converting browsers to buyers.

---

## Session Economics (Practical)

**Target per 3–6 match session:**
- 80–150 soft currency earned
- Allows 1–2 basic cosmetics affordable per day
- Free players can stay engaged without purchase

**Day 30 milestone:** Mid-rank progression + 8–12 cosmetics owned + possible first purchase (€1.99–€4.99)

---

## Monetization Psychology

- **First purchase anchor:** €1.99–€4.99 (low friction, "try premium")
- **Cosmetics must be visible:** Status symbols, not convenience buys
- **Prestige-driven pricing:** Legendary items require €9.99+ packs
- **Retention before scaling:** Hit D7 20%+ retention before aggressive monetization

---

## Implementation Notes

### Nakama Backend

- Store config (JSON/DB): Cosmetic metadata, rotation pools, availability windows
- RPCs: `get_storefront()`, `purchase_item()`, `preview_item()`
- Wallet system: Soft + premium currency ledger (server-authoritative)

### Rotation Algorithm

1. Filter items eligible for today
2. Weighted random selection (rarer items less frequent)
3. Ensure diversity (≥1 board, ≥1 pieces, ≥1 animation)
4. Anti-duplication (no repeat for 3 consecutive days)

---

## Surprises & Notable Decisions

1. **Tournament entries as currency sinks** — Non-refundable entry fees prevent currency inflation (counterintuitive for a cosmetic economy)

2. **No battle pass at launch** — Soft currency + premium cosmetics only; battle pass/seasonal passes post-launch after retention is proven

3. **Flat tournament reward distribution** — Varies by tournament type; casual tournaments favor broad distribution (all get something), competitive tournaments favor top 3 (high variance)

4. **Store rotation over "all cosmetics visible"** — Daily refresh creates urgency and reduces choice paralysis; fewer items = higher conversion

5. **Live board preview is non-negotiable** — The spec treats cosmetic preview as critical infrastructure, not a nice-to-have

---

## Integrations with Existing Systems

### [[progression-system]]

- Current system: 100 XP for `pvp_win`, variable bonuses
- Spec extends: Additional bonuses (streak, fast win, comeback)
- Both operate independently: Rank progression is cosmetic, unaffected by currency/cosmetics

### [[elo-system]]

- Unaffected by monetization
- Rating is never purchasable; matchmaking fairness is hard constraint

### [[tournament-flow]]

- Spec adds: Soft-currency entry, cosmetic rewards, limited-time tournament cosmetics
- Tournament placement unaffected by purchases (skill-based seeding)

### [[challenge-system]]

- Spec adds: Currency rewards (25–100 per daily challenge)
- Server-side evaluation already in place; currency grant mirrors XP grant flow

---

## Retention Targets (Decision Anchor)

| Metric | Target | Notes |
|--------|--------|-------|
| **D1** | 35–45% | New player session → session 2 |
| **D7** | 15–25% | Threshold to scale monetization |
| **D30** | 5–10% | Long-term engagement |

Before aggressive IAP campaigns, hit **D7 20%+**. Premature monetization without retention kills the game.

---

## Future Expansions (Post-Launch, Not Spec)

1. **Battle pass:** Soft + premium tiers, cosmetic rewards
2. **Seasonal passes:** Time-limited cosmetic passes
3. **Sponsored tournaments:** Brand-sponsored prize pools (cosmetics + currency, no real cash)
4. **Prestige ladder:** Levels beyond rank 15 (100+ ranks for hardcore)

---

## Conflicts & Ambiguities

**Minor:** Current [[progression-system]] uses different XP values (`pvp_win: 100`) than spec suggests (`win: 25 + bonuses`). Spec is aspirational for future; current codebase is canonical.

**Decision:** Integrate spec cosmetic/monetization systems with existing progression system as-is; extend rather than replace.

---

## Integration Plan

The spec has been split into 5 modular wiki pages:

1. **[[economy-overview]]** — Master synthesis linking all systems
2. **[[progression-currency]]** — XP, ranks, soft currency (extends [[progression-system]])
3. **[[monetization]]** — Premium currency, pricing, IAP
4. **[[tournament-economy]]** — Tournament entry/rewards (extends [[tournament-flow]])
5. **[[cosmetic-store]]** — Store UI, rotation, preview system

Each page is cross-linked and can stand alone, but together they form a complete economy system specification ready for implementation.
