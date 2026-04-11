# Test Coverage Report

> Static analysis of test file presence vs. source files across frontend, backend, and shared layers.
> **Note:** This is file-level coverage (does a test file exist?), not line/branch coverage. No test runner was executed.

**Generated:** 2026-04-11
**Codebase root:** `sources/ur/`

## Summary

| Layer | Source Files | Test Files | Coverage Ratio | Notes |
|-------|-------------|------------|----------------|-------|
| **Backend** | 28 | 17 | ~61% | Many tournament sub-modules untested |
| **Frontend (components)** | 60 | 23 | ~38% | Game components well covered; app/ routes = 0 |
| **Logic (game engine)** | 8 | 7 | ~88% | Best-covered area; engine tested deeply |
| **Shared** | 10 | 7 | ~70% | 3 utility modules missing tests |
| **Services** | 13 | 5 | ~38% | Several services untested |
| **src/ (hooks/match/auth)** | 45 | 23 | ~51% | Decent; some auth paths covered |
| **ur-internals** | 66 | 2 | ~3% | Admin app, mostly untested |
| **store/** | 1 | 1 | ~100% | useGameStore covered |
| **hooks/** | 5 | 1 | ~20% | Only useMatchmaking tested |
| **app/ (routes)** | 19 | 5 | ~26% | Zero route-level tests |
| **tutorials/** | 3 | 1 | ~33% | Playthrough tested |
| **TOTAL** | ~32588 | ~138* | ~0% | *Excluding node_modules and type-only files |

## Notes

- This report is generated from file presence, not execution coverage.
- App routes are counted as uncovered unless they have direct tests under `specs/`.
- Backend and frontend sections are intentionally broad to keep the report stable as the codebase evolves.
