# Test Coverage Report

> Static analysis of test file presence vs. source files across frontend, backend, and shared layers.
> **Note:** This is file-level coverage (does a test file exist?), not line/branch coverage. No test runner was executed.

**Generated:** 2026-04-16 (updated after commit `1fbf253`)
**Codebase root:** GitHub repo (micho8cho93/ur)

## Summary (post commit `1fbf253`)

| Layer | Source Files | Test Files | Coverage Ratio | Notes |
|-------|-------------|------------|----------------|-------|
| **Backend** | ~36 | ~26 | ~72% | +9 new source files (wallet, cosmeticStore, cosmeticCatalog, storeRotation, matchSoftCurrency + tests) |
| **Frontend (components)** | ~63 | ~27 | ~43% | `CosmeticPreviewModal.test.tsx` (194 lines) added |
| **Logic (game engine)** | ~9 | ~8 | ~89% | `previewState.ts` + test added |
| **Shared** | ~13 | ~10 | ~77% | `cosmetics.test.ts` (70), `cosmeticTheme.test.ts` (94), `wallet` covered via shared tests |
| **Services** | ~15 | ~8 | ~53% | `cosmetics.test.ts` (116 lines), `wallet.test.ts` (56 lines) added |
| **src/ (hooks/contexts/auth)** | ~54 | ~30 | ~56% | `CosmeticThemeContext.test.tsx` (66), `StoreProvider.test.tsx` (115), `WalletContext.test.tsx` (79) added |
| **ur-internals** | ~72 | ~3 | ~4% | `routes.test.ts` expanded (+6 lines); store admin pages untested |
| **store/** | 1 | 1 | ~100% | Unchanged |
| **hooks/** | 5 | 1 | ~20% | Unchanged |
| **app/ (routes/specs)** | ~21 | ~8 | ~38% | `specs/app.store.test.tsx` (143), `specs/app.lobby.test.tsx` (+19) added |
| **tutorials/** | 3 | 1 | ~33% | Unchanged |
| **TOTAL** | ~292 | ~123* | ~42% | *Excluding node_modules and type-only files |

## New Tests Added (commit `1fbf253`)

### Backend
- **`backend/modules/cosmeticStore.test.ts`** (280 lines) — storefront query, purchase flow, duplicate prevention, admin RPCs
- **`backend/modules/storeRotation.test.ts`** (113 lines) — weighted sampling, type diversity repair, featured item selection
- **`backend/modules/wallet.test.ts`** (52 lines) — wallet read, challenge currency award, sanitization edge cases
- **`backend/modules/matchSoftCurrency.test.ts`** (119 lines) — soft currency from match end (spec coverage)
- **`backend/modules/index.rpc-registration.test.ts`** (+33 lines) — new RPC registration assertions

### Frontend
- **`components/CosmeticPreviewModal.test.tsx`** (194 lines) — preview modal rendering, cosmetic application
- **`src/store/CosmeticThemeContext.test.tsx`** (66 lines) — theme context default and override resolution
- **`src/store/StoreProvider.test.tsx`** (115 lines) — storefront loading, purchase action, error handling
- **`src/wallet/WalletContext.test.tsx`** (79 lines) — wallet loading, auth change reset, guest handling
- **`services/cosmetics.test.ts`** (116 lines) — `getStorefront`, `purchaseItem` service wrappers
- **`services/wallet.test.ts`** (56 lines) — `getWallet` service wrapper
- **`specs/app.store.test.tsx`** (143 lines) — store screen integration test
- **`specs/app.lobby.test.tsx`** (+19 lines) — updated for new lobby layout

### Shared
- **`shared/cosmetics.test.ts`** (70 lines) — type guard validation
- **`shared/cosmeticTheme.test.ts`** (94 lines) — theme resolution and asset map coverage
- **`logic/previewState.test.ts`** (27 lines) — preview state logic
- **`src/cosmetics/boardAssets.test.ts`** (92 lines) — asset registry completeness

## Previous Test Additions (2026-04-12)

- **`components/game/Tile.test.tsx`** (59 lines), **`Piece.test.tsx`** (28 lines)
- **`src/tournaments/useTournamentList.test.tsx`** (180 lines), **`useTournamentDetail.test.tsx`** (expanded)
- **`services/nakama.test.ts`** (268 lines)
- **`backend/modules/privateMatch.rpc.test.ts`** (expanded +69 lines)

## Notes

- This report is generated from file presence, not execution coverage.
- App routes are counted as uncovered unless they have direct tests under `specs/`.
- ur-internals store admin pages (StoreCatalog, StoreRotation, StoreStats) are not yet unit-tested.
