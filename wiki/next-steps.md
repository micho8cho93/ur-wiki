# Next Steps

> A living list of outstanding tasks, open questions, and planned work for the Royal Game of Ur codebase and this wiki.

**Last updated:** 2026-04-12

---

## Open Bugs (Unresolved)

| Bug | Severity | Description |
|---|---|---|
| [[bugs#BUG-A01]] | 🔴 Critical | Hardcoded admin custom ID allows privilege escalation — needs real server-side auth |
| [[bugs#BUG-A02]] | 🔴 Critical | `requireCompletedUsernameOnboarding` guard is inverted — missing `!` on `onboardingComplete` |
| [[bugs#BUG-A03]] | 🔴 Critical | Nakama console publicly exposed via Caddy with default credentials |
| [[bugs#BUG-A04]] | 🔴 High | Presence RPC payload not JSON-parsed — online count always throws |
| [[bugs#BUG-A05]] | 🔴 High | Secrets committed in `nakama.yml` — rotate immediately |
| [[bugs#BUG-A23]] | 🟢 Low | iOS entitlements file is empty — needs manual Xcode capability audit |

---

## Performance

| # | Issue | Status |
|---|---|---|
| #3 | Board `buildAnimatedMove` — `LayoutAnimation.configureNext` still present; useEffect count at 16 | ⚠️ Partial |
| #9 | TICK_RATE still 10 Hz — could drop to 5 Hz for this turn-based game | ❌ Not addressed |

See [[performance]] for full context.

---

## Test Coverage Gaps

- `ur-internals` — ~3% coverage; the entire admin app is essentially untested (see [[ur-internals]], [[test-coverage]])
- `app/` routes — ~26% coverage; no route-level integration tests
- `hooks/` — ~20%; only `useMatchmaking` is covered
- `components/` — ~42%; most UI components still lack tests

---

## Wiki Maintenance

- Ingest any new codebase commits since last session (check GitHub for commits after `0d6cc748`)
- Expand [[ur-internals]] once GitHub API access is available (fetch full `ur-internals/src/` file tree)
- Consider splitting [[bugs]] into `bugs-critical.md` and `bugs-resolved.md` once the resolved list grows further
- [[overview]] may need updating after the next significant feature addition
