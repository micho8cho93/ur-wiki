# Cosmetic Store & Rotation System

> Store UI/UX, cosmetic rotation mechanics, preview system, and bundle strategy.

**Last updated:** 2026-04-14  
**Sources:** [[2026-04-14-economy-monetization-spec]]  
**Related:** [[economy-overview]], [[progression-currency]], [[monetization]]

---

## Store Philosophy

The cosmetic store is **visual-first, not data-heavy**. Design priorities:

1. **Visual showcase** — cosmetics are judged by appearance
2. **Frictionless purchase** — max 2–3 taps to buy
3. **Daily freshness** — rotation keeps players returning
4. **Preview-critical** — live board preview is essential for conversion

---

## Store Structure (Main Tabs)

The store uses **modular tabs** to segment cosmetics by type:

| Tab | Contents | Use Case |
|-----|----------|----------|
| **Featured** | Hero cosmetics + limited-time + daily rotation | Landing page, FOMO |
| **Boards** | All board skins (common → legendary) | Browsing by category |
| **Pieces** | All piece colors and sets | Browsing by category |
| **Dice / Animations** | Dice animations, emotes, effects | Browsing by category |
| **Bundles** | Themed bundles (theme bundle, starter bundle, event) | Value offers |

**Default landing:** Featured tab (highest conversion potential).

---

## Featured Tab Layout (Top-to-Bottom)

### 1. Hero Banner (Rotating)

**Purpose:** Eye-catching premium cosmetic showcase.

- **Size:** Large visual card (120% of viewport width, scrollable)
- **Cosmetic shown:** Epic or Legendary item (1–2 per rotation)
- **Refresh:** Every 3–7 days (slower than daily rotation, high prestige)
- **Content:**
  - Large high-quality preview (visual-dominant)
  - Tier badge (Epic / Legendary, color-coded)
  - Price (currency icon + amount)
  - Buttons: "Preview" + "Buy"
  - Optional: Countdown timer if limited-time

**Psychology:** Hero banner creates urgency and draws eyes to premium monetization.

### 2. Limited-Time Section

**Purpose:** Create urgency without frustration.

- **Format:** Horizontal scrollable row (3–5 items max)
- **Items:** Event cosmetics, seasonal cosmetics, rare finds
- **Countdown:** "23h 12m remaining" (creates urgency)
- **Refresh:** Every 3–14 days (event-driven)
- **Content per card:** Visual + price + "Limited" tag

**Psychology:** Countdown timers subtly encourage immediate purchase ("before it's gone").

### 3. Daily Rotation Grid

**Purpose:** Keep store feeling fresh, encourage daily return.

- **Layout:** Grid (2 columns × 3–4 rows, ~6–8 items)
- **Items:** Common and Rare cosmetics (lower price point)
- **Refresh:** Exactly 24h (midnight server time)
- **Visual:** Clean card layout with tier color indicator

**Psychology:** Daily return habit formation (daily quest parallel).

### 4. Bundles Section

**Purpose:** Offer value and drive larger purchases.

- **Format:** Grid or horizontal carousel (2–3 bundles max)
- **Bundles:** Starter bundle, theme bundle, event bundle
- **Discount:** Clearly shown (e.g., "-30%", "Save €1.50")
- **Original price:** Crossed out or in parentheses
- **Call-to-action:** "Limited bundle" or "Time-limited"

---

## Item Card Design

Every cosmetic card (across all tabs) includes:

### Required Elements

1. **Large visual preview** (dominant, ~70% of card)
   - High-quality rendered image of the cosmetic in context
   - For boards: show on empty board
   - For pieces: show on board mid-game
   - For animations: short looping preview (GIF or video)

2. **Name** (short, stylized)
   - Examples: "Lapis Board", "Gold Pieces", "Lightning Dice"
   - Max 2 words; clarity over creativity

3. **Tier color indicator** (small badge, top-right)
   - Common → gray (#999)
   - Rare → blue (#4A90E2)
   - Epic → purple (#9B59B6)
   - Legendary → gold (#F39C12)

4. **Price** (bottom-right, prominent)
   - Currency icon (soft or premium) + amount
   - Font size: bold, readable at thumbnail size

5. **Hover/press animation** (subtle)
   - Slight scale (1.02x) + brightness increase
   - Tap/click opens preview or purchase flow

### Optional Elements

- **"Owned" badge** (checkmark, indicates already purchased)
- **"New" tag** (for cosmetics added in last 48h)
- **"Limited" tag** (for event/seasonal cosmetics)
- **"Coming soon" overlay** (for upcoming cosmetics with countdown)

### Anti-Patterns (Avoid)

❌ Text-heavy cards (description, stats, lore) — keeps users scrolling, hurts UX
❌ Multiple action buttons — should be max 1 tap to buy
❌ Tiny previews — cosmetics must be clearly visible
❌ Hidden pricing — always show price upfront

---

## Preview System (Critical)

The **live board preview** is the most important conversion lever. Users buy what they can see working.

### Preview Flow

1. User taps card → Preview panel opens (modal or side drawer)
2. Live board scene loads with:
   - Selected cosmetic applied
   - A game in progress (pieces moving, dice rolling)
   - Quick-cycle buttons to compare with other cosmetics
3. User can:
   - Rotate board view (3D)
   - Tap "Buy" to purchase
   - Tap X to close and continue browsing

### What Gets Previewed

| Cosmetic Type | Preview Shows |
|---|---|
| **Board skin** | Full board with selected skin, game in progress |
| **Piece color** | Pieces in play on standard board, animated movement |
| **Dice animation** | 3–5 consecutive dice rolls with animation |
| **Emote** | Animation loop (celebration, laugh, etc.) |
| **Bundle** | All items in bundle applied simultaneously on board |

### Preview UX Details

- **Load time:** <500ms (cached, fast)
- **Update speed:** Instant when cycling between cosmetics
- ** 3D rotation:** Available for board (let user spin to see detail)
- **Zoom:** Allow pinch-to-zoom (mobile) or scroll wheel (web)
- **Loop:** Continuous game simulation (pieces move, dice roll, game resets)

---

## Rotation System

Rotation drives **urgency** (FOMO) and **daily returns** (habit formation).

### Three Rotation Types

#### 1. Daily Rotation

- **Refresh time:** Every 24 hours (midnight server time)
- **Pool size:** 6–8 items
- **Sources:** Common and Rare cosmetics only
- **Rules:**
  - Item must not appear in same slot for 3 consecutive days
  - Diversity: ≥1 board, ≥1 piece set, ≥1 animation/emote
  - Avoid showing owned items (bias toward unowned)

#### 2. Featured Rotation

- **Refresh time:** Every 3–7 days (variable, less predictable)
- **Pool size:** 1–2 items
- **Sources:** Epic and Legendary cosmetics only
- **Rules:**
  - Featured item is always a "prestige" cosmetic
  - Shows in hero banner only
  - Often tied to seasonal theme or recent release

#### 3. Limited-Time Events

- **Duration:** 3–14 days (event-dependent)
- **Pool size:** 3–5 exclusive cosmetics
- **Sources:** Event-specific, often Legendary tier
- **Rules:**
  - Once event ends, cosmetics disappear (or go on rare re-rotation)
  - Creates urgency ("limited window")
  - Examples: seasonal cosmetics, tournament-themed cosmetics

---

## Rotation Logic (Backend)

### Item Metadata

Each cosmetic in the database should have:

```
{
  id: "board_lapis_001",
  name: "Lapis Board",
  tier: "rare",
  type: "board",
  rarity_weight: 0.7,           // 0.0–1.0 (higher = more likely)
  rotation_pools: ["daily", "featured"],
  availability_window: {
    start: "2026-04-01",
    end: "2026-06-30"
  },
  price: { soft: 500, premium: null },
  released_date: "2026-04-01"
}
```

### Rotation Algorithm (Daily)

**Pseudocode:**

```
function getDailyRotation() {
  // Step 1: Filter eligible items
  eligible = items.filter(i =>
    i.rotation_pools.includes("daily") &&
    i.availability_window.start <= today <=
    i.availability_window.end
  )

  // Step 2: Weighted random selection
  selected = weightedRandomSample(eligible, 8, weight=rarity_weight)

  // Step 3: Ensure diversity
  if (selected.filter(i => i.type === "board").length < 1)
    add randomBoard to selected
  if (selected.filter(i => i.type === "pieces").length < 1)
    add randomPieces to selected
  if (selected.filter(i => i.type === "animation").length < 1)
    add randomAnimation to selected

  // Step 4: Anti-duplication (skip if same item appeared last 3 days)
  previous_3_days = getLastRotations(3)
  selected = selected.filter(i => !previous_3_days.includes(i.id))

  return selected
}
```

### Anti-Duplication Rules

- **Rule 1:** Item cannot appear in daily rotation 2 days in a row
- **Rule 2:** Item cannot appear in same grid position for 3 consecutive days
- **Rule 3:** If player owns cosmetic, deprioritize from their personal view (optional, Phase 2+)

---

## Personalization (Phase 2+)

Optional enhancements post-launch:

### User Preference Tracking

Track:
- Most viewed cosmetic type (boards vs pieces vs animations)
- Time spent previewing each cosmetic
- Purchase history (cosmetic category affinity)

### Smart Rotation (Optional)

- Boost cosmetics similar to owned items
- Surface relevant category more often
- Example: If user owns 5 blue piece sets, show blue cosmetics more in daily rotation

---

## Bundles Strategy

Bundles serve multiple purposes: **value perception, simplification, and revenue boost**.

### Bundle Types

#### Starter Bundle (New Players)

- **Timing:** Offered in first week of play
- **Contents:** 
  - 1 Rare board (€3 value)
  - 1 Rare piece set (€2 value)
  - 50 soft currency
  - Total value: €5, price: €2.99
- **Psychology:** Low friction first purchase, immediate cosmetic gratification

#### Theme Bundle (Category-Focused)

- **Contents:** Matching board + pieces + animation (same visual theme)
- **Example:** "Emerald Collection" = emerald board + green pieces + sparkle animation
- **Price:** 20–30% discount vs buying individually
- **Psychology:** Cohesion; players get a "complete look"

#### Event Bundle (Limited-Time)

- **Contents:** 2–3 exclusive event cosmetics + bonus soft currency
- **Example:** "Tournament Champion Pack" = trophy board + gold pieces + celebratory emote
- **Price:** €4.99–€9.99 (€7–€15 value)
- **Psychology:** FOMO + perceived value

### Pricing Strategy

**Show original value, then discount:**

```
Emerald Collection
━━━━━━━━━━━━━━━━━━━━━━━━
Emerald Board      €3.00
Jade Pieces        €2.00
Shimmer Animation  €2.00
─────────────────────────
Total value:       €7.00
Your price:        €4.99  [−€2.01, −29%]
```

This math creates perceived value without actual cost inflation.

---

## UX Constraints (Critical)

1. **Max 2–3 taps to purchase** — frictionless checkout
2. **No excessive scrolling** — max 8 items per section (prevents analysis paralysis)
3. **Consistent card sizes** — visual rhythm, predictable layout
4. **Fast load times** — <500ms to preview a cosmetic
5. **Mobile-optimized** — thumb-reachable buttons, large previews
6. **Minimize re-renders** — rotation changes at midnight, not mid-session

---

## Visual Direction

Store design should align with Ur's visual language:

- **Clash-style cartoon aesthetic** — vibrant, bold, clean
- **Strong colors, clean silhouettes** — cosmetics shine visually
- **Minimal text on cards** — visual identity over data density
- **Consistent spacing and typography** — professional, trustworthy
- **Hover/tap feedback** — responsive, satisfying interactions

---

## Nakama Backend Implementation

### Store Configuration

**Server-side JSON or database:**

```
{
  "store_config": {
    "featured": { refresh: "3-7 days", max_items: 2 },
    "daily_rotation": { refresh: "24h", max_items: 8 },
    "limited_time": { max_items: 5 }
  },
  "cosmetics": [
    { id: "board_lapis_001", name: "Lapis Board", ... },
    ...
  ]
}
```

### RPCs (Remote Procedure Calls)

1. **`get_storefront()`**
   - Returns: Full store state (featured, daily, limited, bundles)
   - Cache: Per-user, 24-hour TTL (expires at midnight)

2. **`purchase_item(item_id)`**
   - Validates: Player has sufficient currency
   - Deducts: Soft or premium currency from wallet
   - Grants: Cosmetic to player's collection
   - Returns: Success/error response

3. **`preview_item(item_id)`**
   - Returns: Cosmetic metadata for preview system
   - Pre-renders: Server-side cosmetic on standard board (optional optimization)

### Cache Strategy

**Per-user cache (24h):**
- User A sees same daily rotation all day (midnight reset)
- User B in different timezone also resets at their midnight
- Ensures consistency while respecting player timezones

---

## Analytics & Monitoring

Track post-launch:

| Metric | Target | Action If Off |
|--------|--------|---|
| **Daily store views** | >50% of active players | Improve store discovery |
| **Cosmetic view-to-purchase** | 5–10% | Adjust pricing or preview UI |
| **Bundle purchase rate** | >20% of all purchases | Adjust bundle offers |
| **Repeat purchase rate** | >40% of users | Improve cosmetic variety |
| **Premium currency velocity** | <7 days (avg purchase → spend) | Balance cosmetic pricing |

---

## Related Pages

- **[[economy-overview]]** — master synthesis of all economy systems
- **[[progression-currency]]** — soft currency earnings
- **[[monetization]]** — premium currency and pricing
