# Monetization Strategy

> Premium currency, pricing psychology, IAP structure, and ethical constraints.

**Last updated:** 2026-04-14  
**Sources:** [[2026-04-14-economy-monetization-spec]]  
**Related:** [[economy-overview]], [[progression-currency]], [[cosmetic-store]]

---

## Core Philosophy

**No pay-to-win.** Premium currency (and all purchases) are cosmetic and progression-only. No gameplay advantage, no matchmaking bias, no tournament payouts in real money.

Monetization's job is to:
1. Sustain the game financially
2. Reward engaged players with prestige cosmetics
3. Create a healthy LTV (lifetime value) curve
4. Never harm retention or fairness

---

## Premium Currency (Hard Currency)

### What It Is

**Premium currency** is the hard currency earned only via real-money purchase. It buys:
- Rare and Legendary cosmetics (unavailable for soft currency)
- Seasonal cosmetic passes
- Exclusive limited-time bundles
- Convenience items (challenge rerolls, if premium-exclusive)

### Pricing Tiers

| Pack Name | Price (€) | Premium Currency | $/Currency |
|-----------|-----------|----------|-----------|
| Small | 1.99 | 200 | €0.995 |
| Medium | 4.99 | 600 | €0.831 |
| Large | 9.99 | 1,400 | €0.713 |
| XL | 19.99 | 3,200 | €0.624 |

**Psychology:**
- **First purchase anchor:** €1.99–€4.99 (low friction, "try premium" entry)
- **Bulk discount:** Larger packs have better €/currency ratio (encourages higher spend)
- **Psychological pricing:** All end in .99 (standard game monetization convention)

### First Purchase Incentive (Post-Launch)

Consider a **first purchase bonus** (optional, tunable):
- Small pack: +50 premium (€1.99 → 250 total)
- Medium pack: +150 premium (€4.99 → 750 total)

This reduces buyer's remorse and increases conversion on first IAP.

---

## Premium Cosmetics Pricing

### Rare & Epic Cosmetics

| Tier | Rarity | Premium Cost | Context |
|------|--------|-------|----------|
| Rare | Less common | 500–800 | Unique textures, not animated |
| Epic | Stylized | 800–1,200 | Animated, multiple colors, prestige |

**Affordability:** A €4.99 pack (600 premium) buys 1 Epic cosmetic, encouraging bigger purchases for Legendary items.

### Legendary Cosmetics

| Type | Premium Cost |
|------|--------|
| Animated board skin | 1,500–2,000 |
| Reactive piece set | 1,500–2,500 |
| Exclusive animation pack | 1,000–1,500 |
| Limited legendary bundle | 2,000–3,000 |

**Psychology:** Legendary items require €9.99+ purchases (Medium or Large pack), creating a natural spend tier.

---

## Cosmetic Tiering System

All cosmetics (soft + premium) follow a **4-tier quality ladder:**

| Tier | Visual Quality | Price Range | Availability |
|------|---|---|---|
| **Common** | Simple recolors | Soft (300–500) | Soft store, daily rotation |
| **Rare** | Unique textures, polished | Soft/Low Premium (500–1000) | Soft + Premium stores |
| **Epic** | Stylized, animated | Premium (800–1200) | Premium store, featured rotation |
| **Legendary** | Animated + reactive effects | Premium (1500–2500) | Premium store, limited-time events |

**Tier distribution in store:**
- **Daily rotation:** Mostly Common, some Rare
- **Featured rotation:** Rare + Epic + Legendary
- **Limited events:** Legendary + exclusive Epic items

---

## Retention Targets (Pre-Monetization Scaling)

Before aggressive monetization campaigns, the game must achieve baseline retention:

| Metric | Target | Notes |
|--------|--------|-------|
| **Day 1 Retention (D1)** | 35–45% | New player install → play session 1 again |
| **Day 7 Retention (D7)** | 15–25% | Install → play within 7 days |
| **Day 30 Retention (D30)** | 5–10% | Install → play within 30 days |

**Milestone:** Once D7 hits 20%+, monetization campaigns can scale (battle pass, seasonal passes, premium cosmetics).

### Why Retention First?

Low retention + aggressive monetization = negative reviews ("p2w trash") + churn. Hit retention targets, *then* monetize.

---

## Pricing Psychology Principles

### 1. Prestige-Driven, Not Convenience-Driven

Premium cosmetics should be **status symbols**, not gameplay conveniences. Examples:

✅ **Good:** Animated legendary skin (everyone sees it in matches, prestige)
❌ **Bad:** +5% XP boost (pay-to-progress, negative perception)

### 2. First Purchase Low Friction

Make the first €1.99 purchase feel safe and fun:
- Offer a cosmetic that's immediately visible (board skin or pieces)
- Include first-purchase bonus (+20–30% currency)
- Use celebratory UI (animation, trophy, "welcome to premium!")

### 3. Perceived Value Over Actual Cost

Use **bundle pricing psychology:**
- Show original individual prices (€1.99 + €1.99 + €1.99 = €5.97)
- Discount bundle to €4.99 (−€0.98, −16% "savings")
- Frame as "limited-time bundle" (urgency)

### 4. Cosmetics Must Be Visible

If a cosmetic isn't visible in gameplay, it won't sell:
- Board skins: visible every match ✅
- Piece colors: visible every match ✅
- Dice animations: visible every match ✅
- Hidden stat cosmetics: rarely purchased ❌

---

## Critical Design Constraints

### Hard Constraints (Non-Negotiable)

1. **No purchasable Elo advantage** — cosmetics never affect rating or matchmaking
2. **No tournament payouts in cash** — tournaments are soft-currency entry, cosmetic rewards only
3. **No grind walls** — progression pace same for free + paying players
4. **All cosmetics optional** — game is fully playable with common cosmetics
5. **Server-authoritative rewards** — all grants verified on backend

### Soft Constraints (Strategic)

1. **Cosmetics should feel earned** — even premium cosmetics should feel prestigious
2. **First-purchase target €1.99–€4.99** — reduce friction for conversion
3. **Store feels fresh** — daily/weekly rotation keeps it interesting
4. **Prestige > convenience** — status symbols, not shortcuts

---

## Planned Premium Features (Post-Launch)

### Battle Pass (Optional, Seasonal)

**Soft tier track:** Free challenges → soft currency + cosmetics
**Premium tier track:** Extra challenges → premium cosmetics + premium currency refund

- Duration: 10 weeks
- Cost: €9.99 (1400 premium)
- Reward: ~2000 premium back (net cost ~€7)
- Value: ~8–10 exclusive cosmetics

### Seasonal Passes

**Time-limited cosmetic collections:**
- Duration: 4 weeks
- Cost: €4.99 (600 premium)
- Reward: 5–7 exclusive cosmetics + cosmetic title

### Event Cosmetics (Limited-Time)

**Tournament-themed cosmetics:**
- Available for 7–14 days
- Premium-only, no soft-currency alternative
- Creates urgency and drives IAP

---

## Anti-Whale Safeguards

While cosmetics are optional, monitor these metrics:

| Risk | Mitigation |
|------|-----------|
| **Extreme spending** (>€100/month) | Implement spending warnings at €50+/month |
| **Cosmetic exclusivity** (only whales have cool skins) | Ensure rare soft-currency items rival premium cosmetics |
| **Cosmetic FOMO** | Limited cosmetics should repeat (rare, but not unique-ever) |
| **Pay-to-prestige** (buying rank progression) | Rank is XP-only, cosmetics are cosmetic (enforced) |

---

## Analytics & Monitoring

Track these metrics post-launch to tune monetization:

| Metric | Target | Action If Off |
|--------|--------|---|
| **First-purchase rate** | 2–5% of install base | Adjust entry-point pricing |
| **ARPPU** (avg revenue per paying user) | €15–25 LTV | Adjust cosmetic prices or frequency |
| **Cosmetic view-to-purchase** (conversion) | 5–10% | Improve preview system or pricing |
| **D7 Retention (paid vs free)** | Should match | Ensure monetization doesn't hurt engagement |

---

## Related Pages

- **[[economy-overview]]** — master synthesis of all economy systems
- **[[progression-currency]]** — soft currency earnings and cosmetic spending
- **[[cosmetic-store]]** — store UI, rotation mechanics, preview system
- **[[tournament-economy]]** — tournament structure and rewards
