# ur-internals

> The admin web application for the Royal Game of Ur — a separate package used to manage the Nakama backend from a browser UI.

**Last updated:** 2026-04-12  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[nakama-service]], [[architecture]], [[bugs]]

---

## What It Is

`ur-internals` is a standalone web app (separate from the Expo player-facing app) that provides an admin interface for the Royal Game of Ur backend. It communicates with Nakama via RPCs and is the primary tool for inspecting game state, managing users, and exercising admin-only backend functions.

It lives at the top-level `ur-internals/` folder in the monorepo alongside `app/`, `backend/`, and `shared/`.

---

## Folder Structure

| Path | Role |
|---|---|
| `ur-internals/src/auth/` | Admin authentication and session management |
| `ur-internals/src/auth/nakama.ts` | Nakama auth flow (custom ID login) |
| `ur-internals/src/auth/sessionStorage.ts` | Admin session persistence layer |
| `ur-internals/src/api/client.ts` | RPC client wrapper, `unwrapRpcPayload` / `tryParseJsonString` utilities |

---

## Authentication

Admin login is handled by `ur-internals/src/auth/nakama.ts`, which calls Nakama's `authenticateCustom` with a hardcoded custom ID (`ur-internals-admin`) and username (`admin`). The password check is client-side only — the backend does not enforce a server-side credential.

This creates a critical security vulnerability documented as [[bugs#BUG-A01]]: any attacker who calls `authenticateCustom` with `custom_id=ur-internals-admin` directly receives an admin-role session, bypassing the UI password entirely.

---

## Session Storage (commit `eddbabca`)

`ur-internals/src/auth/sessionStorage.ts` was refactored to harden session handling:

- **`sessionStorage`** (tab-scoped, cleared on tab close) replaced `localStorage` (persistent) for storing admin sessions — reducing the window where a stolen token could be reused
- An **in-memory cache** (`inMemorySession`) avoids repeated storage reads within the same tab session
- **One-time migration**: on first read, any session found in `localStorage` is automatically migrated to `sessionStorage` and the `localStorage` entry is deleted (`clearLegacyLocalStorageSession`)
- All storage access is wrapped in try/catch to handle restricted browser contexts

This fix resolved [[bugs#BUG-A11]] (admin session tokens stored in `localStorage`).

---

## API Client

`ur-internals/src/api/client.ts` provides a typed RPC client and parsing utilities:

- `unwrapRpcPayload` — safely unwraps an RPC response and throws on error shapes
- `tryParseJsonString` — parses JSON with error handling; this pattern is reused elsewhere in the codebase as the standard safe-parse idiom

---

## Test Coverage

`ur-internals` is the **least tested layer** in the codebase:

| Source files | Test files | Coverage ratio |
|---|---|---|
| ~66 | ~2 | ~3% |

The admin app is almost entirely untested. This is a known gap — see [[test-coverage]] for the full breakdown.

---

## Open Security Issues

| Bug | Severity | Status |
|---|---|---|
| [[bugs#BUG-A01]] — Hardcoded custom ID allows admin privilege escalation | 🔴 Critical | `confirmed` |
| [[bugs#BUG-A11]] — Admin tokens in `localStorage` | 🟡 Medium | `fixed` (commit `eddbabca`) |

The hardcoded auth (BUG-A01) is the most pressing concern: the admin role can be obtained by anyone who can reach the Nakama API directly, regardless of the UI password.
