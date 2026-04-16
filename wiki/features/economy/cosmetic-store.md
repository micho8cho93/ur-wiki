# Cosmetic Store & Rotation System

> Store UI/UX, cosmetic rotation mechanics, preview system, and bundle strategy.

**Last updated:** 2026-04-16 (commit `1fbf253`)
**Sources:** [[2026-04-14-economy-monetization-spec]], GitHub repo (micho8cho93/ur)
**Related:** [[economy-overview]], [[progression-currency]], [[monetization]], [[wallet-system]]

---

## Implementation Status: ✅ Implemented

As of commit `1fbf253`, the cosmetic store system is fully implemented. The spec below describes design intent; the sections marked **[IMPLEMENTED]** describe the actual code.

---

## [IMPLEMENTED] Backend Architecture

### Storage Collections

| Collection | Key | Purpose |
|---|---|---|
| `cosmetics` | `owned` | Per-user list of owned cosmetics (`OwnedCosmetic[]`) |
| `store_state` | `rotation` | Global rotation record (daily IDs, featured IDs, generated timestamp, previous days, manual override flag, limited-time events) |
| Global catalog collection | — | Cosmetic definitions stored in Nakama storage via `cosmeticCatalog.ts` |

### RPCs Registered (`backend/modules/cosmeticStore.ts`)

| RPC | Purpose |
|---|---|
| `get_storefront` | Returns full store: daily rotation, featured, limited-time, bundles, owned IDs, rotation expiry |
| `get_full_catalog` | Returns all cosmetic definitions (player-facing) |
| `purchase_item` | Deducts currency, writes owned record, emits analytics event |
| `get_owned_cosmetics` | Returns player's owned cosmetic list |
| `admin_get_full_catalog` | Admin: full catalog |
| `admin_upsert_cosmetic` | Admin: create or update a cosmetic definition |
| `admin_disable_cosmetic` | Admin: disable a cosmetic |
| `admin_enable_cosmetic` | Admin: re-enable a cosmetic |
| `admin_get_rotation_state` | Admin: current rotation state |
| `admin_set_manual_rotation` | Admin: override rotation manually |
| `admin_clear_manual_rotation` | Admin: clear manual override |
| `admin_set_limited_time_event` | Admin: add a limited-time event |
| `admin_remove_limited_time_event` | Admin: remove a limited-time event |
| `admin_get_store_stats` | Admin: purchase analytics |

### Purchase Flow

1. Verify cosmetic exists in catalog (`cosmeticCatalog.loadCatalogFromStorage`)
2. Verify user does not already own it (read `cosmetics/owned`)
3. Read user wallet via `nk.accountGetId(userId).wallet`
4. Validate sufficient balance (soft or premium currency)
5. Deduct via `nk.walletUpdate` (Nakama ledger, atomic)
6. Append `OwnedCosmetic` to storage with OCC retry
7. Emit `cosmetic_purchase` analytics event
8. Return `PurchaseItemResponse` with `updatedWallet`

Error codes thrown as strings: `ITEM_NOT_FOUND`, `ALREADY_OWNED`, `INSUFFICIENT_FUNDS`.

---

## [IMPLEMENTED] Rotation Algorithm (`backend/modules/storeRotation.ts`)

### Daily Rotation (`getDailyRotation`)

Constants: `DAILY_ROTATION_SIZE = 8`

Steps:
1. Filter catalog to items in `daily` rotation pool and within their `availabilityWindow`
2. Exclude items that appeared in yesterday's rotation
3. If eligible pool < 8, fall back to all active daily items
4. **Weighted sample**: pick items by `rarityWeight`; items seen in 2–3 days ago get weight halved to reduce repetition
5. **Type diversity repair**: if selected set is missing a `board`, `pieces`, or any animation/emote type, swap out the lowest-weight selected item to add the missing type

### Featured Items (`getFeaturedItems`)

Returns epic or legendary items in the `featured` rotation pool, sorted by `rarityWeight` descending, capped at 2 items.

### Manual Override

Admin can write specific IDs to the rotation state via `admin_set_manual_rotation`. The `manualOverride` flag bypasses the algorithm.

---

## [IMPLEMENTED] Catalog (`backend/modules/cosmeticCatalog.ts`)

The cosmetic catalog is stored in Nakama storage as a JSON array of `CosmeticDefinition` objects. The catalog is read and in-memory cached per-request. Admin RPCs expose CRUD on the catalog with OCC version guards.

---

## [IMPLEMENTED] Cosmetic Types (`shared/cosmetics.ts`)

```typescript
type CosmeticTier = "common" | "rare" | "epic" | "legendary";
type CosmeticType = "board" | "pieces" | "dice_animation" | "emote" | "music" | "sound_effect";
type CurrencyType = "soft" | "premium";
type RotationPool = "daily" | "featured" | "limited";

type CosmeticDefinition = {
  id: string;                          // e.g. "board_lapis_001"
  name: string;
  tier: CosmeticTier;
  type: CosmeticType;
  price: { currency: CurrencyType; amount: number };
  rotationPools: RotationPool[];
  rarityWeight: number;                // 0–∞ (higher = more likely in rotation)
  availabilityWindow?: { start: string; end: string };
  releasedDate: string;
  assetKey: string;                    // maps to COSMETIC_ASSET_MAP in cosmeticTheme.ts
  disabled?: boolean;
};
```

---

## [IMPLEMENTED] Theme System (`shared/cosmeticTheme.ts`)

`COSMETIC_ASSET_MAP` maps asset keys to `CosmeticTheme` objects:

```typescript
type CosmeticTheme = {
  board?: Partial<BoardTheme>;         // imageAssetKey, tile asset keys, backgroundColor
  pieces?: Partial<PiecesTheme>;       // lightPieceAssetKey, darkPieceAssetKey
  dice?: Partial<DiceTheme>;           // markedDieAssetKey, unmarkedDieAssetKey
  music?: Partial<MusicTheme>;         // trackAssetKey
  soundEffects?: Partial<SoundEffectsTheme>;
};
```

Pre-defined themes: `board_cedar_001`, `board_alabaster_001`, `board_lapis_001`, `board_obsidian_001`, `board_gold_001` (and more).

---

## [IMPLEMENTED] Frontend Architecture

### Provider Stack Addition

`StoreProvider` and `WalletProvider` are added to the provider stack in `app/_layout.tsx`. `CosmeticThemeProvider` wraps the match screen with the active cosmetic theme.

### New React Contexts

| Context | File | Purpose |
|---|---|---|
| `WalletProvider` | `src/wallet/WalletContext.tsx` | Fetches and exposes wallet balance; auto-refreshes on auth change |
| `StoreProvider` | `src/store/StoreProvider.tsx` | Storefront state, purchase action, silent refresh |
| `CosmeticThemeProvider` | `src/store/CosmeticThemeContext.tsx` | Resolves owned cosmetic theme into typed asset sources |

### Store Screen (`app/(game)/store.tsx`)

New route `/(game)/store` — the full store UI screen (632 lines). Connects to `StoreProvider` to display rotation, featured items, limited-time events, and purchase flow.

### Cosmetic Asset Registries (`src/cosmetics/`)

Each cosmetic dimension has a typed asset file:
- `boardAssets.ts` — board image `require()` map
- `tileAssets.ts` — tile image map
- `pieceAssets.ts` — piece image map
- `diceAssets.ts` — dice image map
- `audioAssets.ts` — music tracks and sound effect previews

These return `ImageSourcePropType` (or audio sources) for use in components.

### Preview Modal (`components/CosmeticPreviewModal.tsx`)

587-line modal component for live cosmetic preview. Applies the cosmetic's theme to a rendered board/piece/dice preview before purchase.

### Home Screen Wallet Chip

`src/screens/AuthenticatedHome.tsx` displays a "Coins" balance chip in the top bar using `useWallet().softCurrency`. Guest users see 0.

---

## [IMPLEMENTED] ur-internals Admin Pages

Three new admin pages in the ur-internals web app:

- `StoreCatalog.tsx` — browse, create, edit cosmetic definitions
- `StoreRotation.tsx` — view current rotation, set/clear manual override, manage limited-time events
- `StoreStats.tsx` — view purchase analytics

API client: `ur-internals/src/api/store.ts` (calls admin RPCs via existing proxy).

---

## [IMPLEMENTED] Analytics

`cosmetic_purchase` event type added to `backend/modules/analytics/tracking.ts`. Fires when a purchase completes, records `cosmeticId`, timestamp, userId, and purchase source (soft vs premium).

---

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
