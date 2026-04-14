# Test Coverage Report

> Static analysis of test file presence vs. source files across frontend, backend, and shared layers.
> **Note:** This is file-level coverage (does a test file exist?), not line/branch coverage. No test runner was executed.

**Generated:** 2026-04-12 (updated after commits `c79284cb`, `a1e996f4`, `eddbabca`)
**Codebase root:** `sources/ur/`

## Summary

| Layer | Source Files | Test Files | Coverage Ratio | Notes |
|-------|-------------|------------|----------------|-------|
| **Backend** | 27 | 18 | ~67% | `privateMatch.rpc.test.ts` expanded (+69 lines) |
| **Frontend (components)** | 60 | 25 | ~42% | `Tile.test.tsx` (new, 59 lines), `Piece.test.tsx` (new, 28 lines) |
| **Logic (game engine)** | 8 | 7 | ~88% | Best-covered area; engine tested deeply |
| **Shared** | 10 | 7 | ~70% | 3 utility modules missing tests |
| **Services** | 13 | 6 | ~46% | `nakama.test.ts` (new, 268 lines; socket lifecycle + retry) |
| **src/ (hooks/match/auth)** | 47 | 25 | ~53% | `useTournamentDetail.test.tsx` expanded (+53 lines); `useTournamentList.test.tsx` new (180 lines) |
| **ur-internals** | 66 | 2 | ~3% | Admin app, mostly untested |
| **store/** | 1 | 1 | ~100% | useGameStore covered |
| **hooks/** | 5 | 1 | ~20% | Only useMatchmaking tested |
| **app/ (routes)** | 19 | 5 | ~26% | Zero route-level tests |
| **tutorials/** | 3 | 1 | ~33% | Playthrough tested |
| **TOTAL** | ~259 | ~98* | ~38% | *Excluding node_modules and type-only files |

## New Tests Added (2026-04-12)

- **`components/game/Tile.test.tsx`** (59 lines) — new; tests the memoized `Tile` component rendering and `areTilePropsEqual` comparator
- **`components/game/Piece.test.tsx`** (28 lines) — new; tests the memoized `Piece` component rendering and `arePiecePropsEqual` comparator  
- **`src/tournaments/useTournamentList.test.tsx`** (180 lines) — new; tests the tournament list hook including socket notification handling and polling fallback
- **`src/tournaments/useTournamentDetail.test.tsx`** — expanded (+53 lines); adds socket notification and disconnect edge cases
- **`services/nakama.test.ts`** (268 lines) — new; tests socket lifecycle (stale socket detection, disconnect handlers, retry logic)
- **`backend/modules/privateMatch.rpc.test.ts`** — expanded (+69 lines); adds reservation concurrency and OCC conflict edge cases
- **`components/game/Board.renderMetrics.test.ts`** — expanded (+73 lines); adds vertical board row metrics, non-uniform row heights
- **`components/game/matchDiceStageLayout.test.ts`** — expanded (+25 lines)

## Notes

- This report is generated from file presence, not execution coverage.
- App routes are counted as uncovered unless they have direct tests under `specs/`.
- Backend and frontend sections are intentionally broad to keep the report stable as the codebase evolves.
