# Wallet System

> Dual-currency wallet implementation: soft currency (Coins) and premium currency, backend ledger, and frontend context.

**Last updated:** 2026-04-16 (commit `1fbf253`)
**Sources:** GitHub repo (micho8cho93/ur)
**Related:** [[economy-overview]], [[cosmetic-store]], [[progression-currency]], [[challenge-system]], [[layer-frontend]], [[layer-backend]]

---

## Overview

The wallet system provides a dual-currency ledger (soft + premium) backed by Nakama's built-in wallet ledger. It is fully implemented as of commit `1fbf253`. Currency is used to purchase cosmetics in the [[cosmetic-store]].

---

## Currency Keys (`shared/wallet.ts`)

```typescript
export const SOFT_CURRENCY_KEY = "soft_currency";
export const PREMIUM_CURRENCY_KEY = "premium_currency";
export const COIN_REWARD_RATE = 0.1;          // XP × 0.1 = Coins from challenges
```

**Soft currency ("Coins"):** Earned through gameplay (challenge completions currently; match-end rewards planned). Spends on common/rare cosmetics.

**Premium currency:** Real-money purchase (IAP, not yet implemented). Spends on epic/legendary cosmetics.

---

## Backend (`backend/modules/wallet.ts`)

### Reading the Wallet

```typescript
export const getWalletForUser = (nk, userId): WalletBalances => {
  const account = nk.accountGetId(userId);
  return parseWalletBalances(account?.wallet);
};
```

Nakama stores the wallet as a JSON object on the account. `parseWalletBalances` sanitizes the value (handles string serialization, NaN, Infinity).

### Awarding Challenge Soft Currency

```typescript
export const awardChallengeSoftCurrency = (nk, userId, matchId, challengeId, rewardXp) => {
  const amount = calculateChallengeSoftCurrencyReward(rewardXp);  // XP × 0.1
  const changeset = { [SOFT_CURRENCY_KEY]: amount };
  const metadata = {
    source: "challenge_completion",
    currency: SOFT_CURRENCY_KEY,
    matchId,
    challengeId,
    amount,
  };
  nk.walletUpdate(userId, changeset, metadata);
};
```

Uses Nakama's `walletUpdate` which is atomic and maintains a ledger. The metadata enables audit queries by source and challenge.

### RPC: `get_wallet`

Returns a `WalletRpcResponse` with both `softCurrency` and `premiumCurrency` fields (plus the nested `wallet` object for convenience). Called by the frontend `WalletProvider` on mount and auth change.

---

## Shared Types (`shared/wallet.ts`)

```typescript
type WalletBalances = {
  soft_currency: number;
  premium_currency: number;
};

type WalletRpcResponse = {
  wallet: WalletBalances;
  softCurrency: number;    // = wallet.soft_currency
  premiumCurrency: number; // = wallet.premium_currency
};
```

Helper functions:

| Function | Purpose |
|---|---|
| `sanitizeSoftCurrencyAmount(value)` | Coerce to `Math.max(0, Math.floor(n))`; returns 0 on invalid |
| `sanitizePremiumCurrencyAmount(value)` | Same, for premium |
| `buildWalletRpcResponse(soft, premium)` | Constructs a valid `WalletRpcResponse` with sanitized values |
| `parseWalletBalances(value)` | Parses a Nakama wallet (JSON string or object) → `WalletBalances` |
| `isWalletRpcResponse(value)` | Type guard; validates structure and non-negative integers |
| `calculateChallengeSoftCurrencyReward(xp)` | `sanitizeSoftCurrencyAmount(xp * 0.1)` |

---

## Frontend Service (`services/wallet.ts`)

```typescript
export const getWallet = (): Promise<WalletRpcResponse> =>
  nakamaService.rpc(RPC_GET_WALLET, {});
```

Thin wrapper around `NakamaService.rpc`. Returns a `WalletRpcResponse` from the `get_wallet` RPC.

---

## Frontend Context (`src/wallet/WalletContext.tsx`)

`WalletProvider` wraps the app and fetches the wallet on mount and on auth change.

### Key behaviors

- **Auto-fetch on auth:** When user changes (login/logout), `activeUserIdRef` detects the change and triggers `refresh()`.
- **Guest isolation:** `canAccessWallet = user?.provider !== 'guest'`; guest users always have 0 balance, no RPC call is made.
- **Silent refresh:** `refresh({ silent: true })` does not set `status = 'loading'` if a wallet is already present (avoids UI flicker on background updates).
- **Stale request guard:** `requestIdRef` increments on each refresh; stale responses are discarded.

### Exposed via `useWallet()`

```typescript
type WalletContextValue = {
  wallet: WalletBalances | null;
  softCurrency: number;          // convenience; 0 if not loaded
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  isLoading: boolean;            // status=loading AND no wallet yet
  isRefreshing: boolean;         // status=loading AND wallet already present
  refresh: (options?: { silent?: boolean }) => Promise<WalletRpcResponse | null>;
};
```

---

## Store Integration

The [[cosmetic-store]] `purchaseItem` RPC deducts from the wallet directly on the backend via `nk.walletUpdate`. The `PurchaseItemResponse` includes `updatedWallet` so the client can update its local balance without a separate `get_wallet` call. `StoreProvider` calls `wallet.refresh({ silent: true })` after a purchase to keep `WalletProvider` in sync.

---

## Home Screen Display

`src/screens/AuthenticatedHome.tsx` renders a wallet chip in the top bar:

```tsx
const { softCurrency } = useWallet();
const displayedSoftCurrency = user?.provider === 'guest' ? 0 : softCurrency;
// renders: "{n.toLocaleString()} Coins"
```

---

## Nakama Wallet Ledger Notes

Nakama's wallet is an append-only ledger of credit/debit operations. Each `walletUpdate` call appends an entry with the changeset and caller-provided metadata. This provides a full audit trail. The current balance is the sum of all ledger entries.

There is no explicit floor enforcement in the Nakama wallet (it can go negative if not guarded). The `cosmeticStore.ts` purchase flow guards this by reading balance and validating sufficiency before calling `walletUpdate`, but there is an inherent race condition window — addressed by OCC retry on the owned cosmetics write.
