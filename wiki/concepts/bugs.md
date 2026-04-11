# Bug Registry — Royal Game of Ur

> **Last updated:** 2026-04-11  
> **Sources:** claude-bugs.md (client/shared scan), codex-bugs.md (backend/infra scan), verification pass 2026-04-11  
> **Statuses:** `confirmed` | `open` | `needs-investigation` | `low-priority` | `not-a-bug`

---

## Quick Reference

| ID | Severity | Area | Title | Status |
|----|----------|------|-------|--------|
| [BUG-A01](#bug-a01) | 🔴 Critical | Backend auth | Default admin bootstrapping allows full takeover | `confirmed` |
| [BUG-A02](#bug-a02) | 🔴 Critical | Backend auth | `requireCompletedUsernameOnboarding` inverted guard | `confirmed` |
| [BUG-A03](#bug-a03) | 🔴 Critical | Infra/security | Nakama console exposed via Caddy + default credentials | `open` |
| [BUG-A04](#bug-a04) | 🔴 High | Functional | Presence RPC payload unparsed — online count always throws | `confirmed` |
| [BUG-A05](#bug-a05) | 🔴 High | Infra/security | Secrets committed in `nakama.yml` (rotate ASAP) | `open` |
| [BUG-A06](#bug-a06) | 🟡 Medium | Backend reliability | Private match orphaned if code record write fails | `open` |
| [BUG-A07](#bug-a07) | 🟡 Medium | Backend reliability | Rematch private match has same ordering hazard as A06 | `open` |
| [BUG-A08](#bug-a08) | 🟡 Medium | Backend reliability | Bare `JSON.parse(payload)` crashes on malformed RPC input | `open` |
| [BUG-A09](#bug-a09) | 🟡 Medium | Client reliability | `connectSocket()` can return stale/dead socket | `open` |
| [BUG-A10](#bug-a10) | 🟡 Medium | Infra/security | Dev docker-compose exposes Postgres + unsafe default keys | `open` |
| [BUG-A11](#bug-a11) | 🟡 Medium | Client security | Admin session tokens stored in `localStorage` | `open` |
| [BUG-A12](#bug-a12) | 🟡 Medium | Game fairness | Authoritative dice rolls use `Math.random()` (not CSPRNG) | `open` |
| [BUG-A13](#bug-a13) | 🟡 Medium | UI/React | `CinematicXpRewardModal` cleanup effect has spurious deps | `confirmed` |
| [BUG-A14](#bug-a14) | 🟡 Medium | UI/React | `FloatingEmojiReactions` unstable `onComplete` in dep array | `confirmed` |
| [BUG-A15](#bug-a15) | 🟡 Medium | Scripts | `reset-project.js` moves its own `scripts/` directory | `confirmed` |
| [BUG-A16](#bug-a16) | 🟡 Medium | Shared protocol | `isTournamentMatchRewardSummaryPayload` allows floats for int fields | `low-priority` |
| [BUG-A17](#bug-a17) | 🟡 Medium | Backend | `appendNumericSuffix` uses wrong floor in max-length trim | `needs-investigation` |
| [BUG-A18](#bug-a18) | 🟡 Medium | Backend auth | Admin role normalization rejects non-lowercase object-stored roles | `open` |
| [BUG-A19](#bug-a19) | 🟡 Medium | Client auth | Session restore silently re-persists stale session on revoked refresh token | `open` |
| [BUG-A20](#bug-a20) | 🟡 Medium | UI/React | `xpValue` Animated.Value in listener dep array (stable ref, spurious) | `confirmed` |
| [BUG-A21](#bug-a21) | 🟢 Low | Shared protocol | `isNullableRollDisplayValue` missing parentheses (fragile precedence) | `needs-investigation` |
| [BUG-A22](#bug-a22) | 🟢 Low | Shared protocol | `rankTitle` type/validator mismatch (typed string, validated nullable) | `low-priority` |
| [BUG-A23](#bug-a23) | 🟢 Low | iOS | Entitlements file is empty — may silently break capabilities | `needs-investigation` |

---

## Critical & High Severity

---

### BUG-A01

**🔴 Critical — Security | Backend admin auth**  
**Title:** Default admin bootstrapping allows full privilege escalation  
**Status:** `confirmed`  
**Files:** `backend/modules/tournaments/auth.ts`, `ur-internals/src/auth/nakama.ts`

**Issue:** Two interconnected problems create an exploitable admin takeover path:

1. The backend auto-grants the `admin` role to any Nakama user whose username is `"admin"` via `maybeBootstrapTestAdminRole`. No server-side secret required.
2. `ur-internals` authenticates by calling `authenticateCustom("ur-internals-admin", create=true, username="admin")` — the custom ID and username are hardcoded and public. The password check (`"admin"/"password"`) is client-side only. An attacker can call the Nakama API directly, skip the UI entirely, and receive admin role.

**Attack vector:** Call `authenticateCustom` with `custom_id=ur-internals-admin` → Nakama creates/finds user with username `admin` → bootstrap grants `admin` role → all admin RPCs accessible.

**Fix options:**
- Remove `maybeBootstrapTestAdminRole` entirely for production builds (recommended).
- If a break-glass admin is needed: gate behind an env flag, verify by exact `userId` (not username), or require a backend-issued short-lived HMAC token as the credential.
- Replace hardcoded custom ID + client-side password check with real operator auth (OIDC/SSO, or Nakama console-issued tokens with server-validated secret).

---

### BUG-A02

**🔴 Critical — Functional | Backend auth**  
**Title:** `requireCompletedUsernameOnboarding` guard logic is inverted  
**Status:** `confirmed`  
**File:** `backend/modules/usernameOnboarding.ts` (~line 380)

**Issue:** The guard returns (allows access) when `!object` (no stored profile), then throws only if the object exists AND `onboardingComplete` is false. A user with no stored profile passes through without completing onboarding.

```typescript
// Current (broken) — no profile = passes through
if (!object || profile.onboardingComplete) return;
throw new Error("...");

// Correct — no profile OR incomplete = blocked
if (!object || !profile.onboardingComplete) {
  throw new Error("Choose a username before accessing multiplayer or social features.");
}
```

**Fix:** Flip the condition on `onboardingComplete` — add the missing `!`.

---

### BUG-A03

**🔴 Critical — Security | Infra/deploy**  
**Title:** Nakama console exposed publicly via Caddy with default credentials  
**Status:** `open`  
**Files:** `backend/deploy/Caddyfile`, `backend/nakama.yml`

**Issue:** The Caddyfile contains a `admin-nakama.urgame.live` site that reverse-proxies directly to `nakama:7351` (the Nakama admin console) with no authentication middleware. `nakama.yml` sets `console.username: "admin"` and `console.password: "password"`. If DNS is pointed, the console is internet-accessible with default credentials — full server control.

Note: `docker-compose.prod.yml` binds port 7351 to `127.0.0.1` (partial hardening), but the Caddyfile routes around that by proxying internally.

**Fix options:**
- Remove the `admin-nakama.*` site from Caddyfile entirely (recommended). Access console via SSH tunnel.
- If remote access is required: IP allowlist + mTLS/basic-auth at Caddy layer before proxying.
- Rotate `console.signing_key` and set non-default credentials regardless.
- Align `backend/deploy/README.md` with Caddyfile (README says local-only; Caddyfile contradicts).

---

### BUG-A04

**🔴 High — Functional | Client services**  
**Title:** Presence RPC payload never parsed — online count always throws  
**Status:** `confirmed`  
**Files:** `services/presence.ts`, `backend/modules/index.ts`, `backend/modules/analytics/tracking.ts`

**Issue:** Backend returns `JSON.stringify({ onlineCount, onlineTtlMs, serverTimeMs })`, so the Nakama JS client delivers `response.payload` as a **string**. `parseOnlineCount()` in `presence.ts` casts payload to `PresenceRpcPayload` object and reads `.onlineCount` directly — this is always `undefined` on a string — causing every heartbeat and player-count call to throw `"Presence RPC payload is missing a valid onlineCount."`.

**Fix options:**
- Parse before reading: `const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;`
- Reuse the `unwrapRpcPayload` / `tryParseJsonString` pattern already used in `ur-internals/src/api/client.ts`.

---

### BUG-A05

**🔴 High — Security | Infra/config**  
**Title:** Long-lived secrets committed to `nakama.yml`  
**Status:** `open`  
**Files:** `backend/nakama.yml`, `backend/deploy/docker-compose.prod.yml`

**Issue:** `nakama.yml` contains hardcoded long-lived secrets in the repository:
- `session.encryption_key`
- `session.refresh_encryption_key`
- `console.signing_key`
- Console `username` / `password`

Any repository leak or broad access exposes these permanently (git history preserves them even after removal).

**Fix options:**
- Move all secrets to environment variables injected at deploy time (prod compose already supports this pattern for DB/socket keys — extend it).
- Add a separate `nakama.prod.yml` outside git for prod-only config.
- Rotate all keys immediately in production; invalidate existing sessions as needed.

---

## Medium Severity

---

### BUG-A06

**🟡 Medium — Reliability | Backend private match**  
**Title:** Private match can be orphaned if code record write fails  
**Status:** `open`  
**File:** `backend/modules/index.ts`

**Issue:** `rpcCreatePrivateMatch` calls `nk.matchCreate(...)` before `createPrivateMatchCodeRecord(...)`. If the storage write fails (collision, transient storage error, race condition), the match already exists but has no discoverable join code → players cannot join → orphaned match until timeout.

**Fix options:**
- "Reserve first" flow: write a pending code reservation (without `matchId`), then `matchCreate`, then update reservation with `matchId`. Join RPC tolerates "pending" state.
- Alternatively: store code as match label; join RPC uses `nk.matchList` by label, avoiding the need for a code record at creation time.
- Minimum viable: wrap code-record write in retry loop; surface a clear error rather than silently orphaning.

---

### BUG-A07

**🟡 Medium — Reliability | Backend rematch**  
**Title:** Rematch private match has same ordering hazard as BUG-A06  
**Status:** `open`  
**File:** `backend/modules/index.ts` (rematch block, ~line 1460)

**Issue:** In the rematch flow, `nk.matchCreate(...)` is called before `createReservedPrivateMatchCodeRecord(...)` in a `try` block. Same root cause as BUG-A06 — if storage write fails, the rematch match exists but is undiscoverable. Overlooked in the original scan because it's a separate code path.

**Fix options:** Apply the same "reserve first" pattern described in BUG-A06. At minimum: retry and surface error to both players.

---

### BUG-A08

**🟡 Medium — Reliability | Backend RPCs**  
**Title:** Bare `JSON.parse(payload)` in multiple RPC handlers crashes on malformed input  
**Status:** `open`  
**File:** `backend/modules/index.ts` (~lines 1939, 1968)

**Issue:** `rpcAuthLinkCustom` and `rpcMatchmakerAdd` call `JSON.parse(payload)` directly with no try/catch. Malformed JSON from any client causes an unhandled exception that surfaces as an opaque 500. The `parseRpcPayload()` helper (which handles empty/null/malformed gracefully) exists but isn't used in these handlers.

**Fix options:**
- Replace bare `JSON.parse(payload)` with `parseRpcPayload(payload)`.
- Or wrap in try/catch and throw a structured 400-class error with a human-readable message.

---

### BUG-A09

**🟡 Medium — Reliability | Client socket**  
**Title:** `connectSocket()` returns cached socket without checking if it's still connected  
**Status:** `open`  
**File:** `services/nakama.ts`

**Issue:** `connectSocket()` returns `this.socket` immediately if it exists, with no connectivity check. After a network drop, callers receive a dead socket and fail on first use. There is no disconnect handler that nulls `this.socket`, so the stale reference persists until an explicit `disconnectSocket()` call.

**Fix options:**
- Track socket connectivity state; only reuse if confirmed connected.
- Register a disconnect/close handler on the socket that sets `this.socket = null`, so `connectSocket()` will create a fresh connection.

---

### BUG-A10

**🟡 Medium — Security | Dev infra**  
**Title:** Dev docker-compose exposes Postgres externally with insecure defaults  
**Status:** `open`  
**File:** `backend/docker-compose.yml`

**Issue:** Publishes `5432:5432` unbound (any interface), and falls back to `POSTGRES_PASSWORD=nakama`, `NAKAMA_SOCKET_SERVER_KEY=defaultkey`, `NAKAMA_HTTP_KEY=changeme` when env vars are missing. Risk if run on a shared or cloud network, or if dev compose is inadvertently used as a prod shortcut.

**Fix options:**
- Bind ports to localhost: `127.0.0.1:5432:5432` (same for Nakama ports if exposed).
- Remove insecure `:-default` fallbacks; require a `.env` file with real values (fail loudly if missing).

---

### BUG-A11

**🟡 Medium — Security | UR Internals**  
**Title:** Admin session tokens (including refresh token) stored in `localStorage`  
**Status:** `open`  
**Files:** `ur-internals/src/auth/sessionStorage.ts`, `ur-internals/src/auth/nakama.ts`

**Issue:** Both the access token and refresh token are persisted in `window.localStorage`. Any XSS vulnerability in the admin dashboard origin can exfiltrate long-lived credentials and impersonate admins.

**Fix options:**
- HTTP-only secure cookies (best — inaccessible to JS).
- In-memory only + `sessionStorage` (reduces persistence; no cross-tab or post-close reuse).
- If tokens must be client-accessible: add a strict CSP (no `unsafe-inline`, no untrusted script origins) and shorten token TTLs significantly.

---

### BUG-A12

**🟡 Medium — Fairness/Security | Game core**  
**Title:** Authoritative dice rolls use `Math.random()` — not a CSPRNG  
**Status:** `open`  
**Files:** `logic/engine.ts`, `backend/modules/index.ts`

**Issue:** `rollDice()` uses `Math.random()`, which is not a cryptographically secure RNG. When called from the backend for authoritative match rolls, results may be statistically biased or predictable enough (especially with many samples) to be a cheating/fairness concern.

**Fix options:**
- On backend: replace `Math.random()` in authoritative paths with `crypto.getRandomValues()` or equivalent CSPRNG.
- Keep client-side `rollDice()` using `Math.random()` for local/offline/bot play only — never as the source of truth for online matches.

---

### BUG-A13

**🟡 Medium — React / UI | Progression component**  
**Title:** `CinematicXpRewardModal` cleanup effect lists stable Animated.Value refs in dep array  
**Status:** `confirmed`  
**File:** `components/progression/CinematicXpRewardModal.tsx` (~lines 80–95)

**Issue:** A cleanup-only `useEffect` lists all `Animated.Value` refs in its dependency array. Refs are stable across renders, so these deps are spurious — but they cause React to stop and restart animations on every render where any dep identity changes.

```typescript
// Current — spurious deps cause animation restarts
}, [backdropOpacity, badgePulse, cardOpacity, cardScale, flashOpacity, rankBurst, sweepProgress, xpValue]);

// Fix — cleanup-only, run once on unmount
}, []);
```

---

### BUG-A14

**🟡 Medium — React / UI | Game component**  
**Title:** `FloatingEmojiReactions` includes unstable `onComplete` prop in animation effect dep array  
**Status:** `confirmed`  
**File:** `components/game/FloatingEmojiReactions.tsx` (~line 51)

**Issue:** `onComplete` is a function prop in a `useEffect` dep array. If the parent re-renders without memoizing it, the animation effect restarts mid-animation on every parent render.

**Fix:**
```typescript
const onCompleteRef = useRef(onComplete);
useEffect(() => { onCompleteRef.current = onComplete; });
// call onCompleteRef.current(id) inside animation effect
// dep array: [progress, reaction.id]  ← remove onComplete
```

---

### BUG-A15

**🟡 Medium — Scripts | Dev tooling**  
**Title:** `reset-project.js` includes `"scripts"` in the directories it moves away  
**Status:** `confirmed`  
**File:** `scripts/reset-project.js` (~line 14)

**Issue:** `oldDirs` includes `"scripts"`, so the script moves the directory that contains itself as part of its own cleanup. This works if the OS keeps the file handle open mid-execution, but it is fragile, clearly unintentional, and breaks if the script path is re-resolved mid-run.

**Fix:** Remove `"scripts"` from `oldDirs`. The script's own comment describes what it's meant to move (app/components/hooks/constants) — `scripts/` is not in scope.

---

### BUG-A16

**🟡 Medium — Shared protocol | Validation**  
**Title:** `isTournamentMatchRewardSummaryPayload` allows float values for integer fields  
**Status:** `low-priority`  
**File:** `shared/urMatchProtocol.ts` (~lines 404, 415)

**Issue:** `round` is validated with `typeof value === "number"` (allows `1.5`). `challengeCompletionCount` is validated with `isFiniteNumber` (same). Both should be non-negative integers.

**Fix:** Replace with `isNonNegativeInteger(value.round)` and `isNonNegativeInteger(value.challengeCompletionCount)`.

---

### BUG-A17

**🟡 Medium — Backend | Username generation**  
**Title:** `appendNumericSuffix` uses `USERNAME_MIN_LENGTH` as floor in trim, obscuring intent  
**Status:** `needs-investigation`  
**File:** `backend/modules/usernameOnboarding.ts` (~line 286)

**Issue:** `Math.max(USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH - suffixValue.length)` means when suffix is long, the base is trimmed to min-length (3) then suffix appended — relying on a final `.slice` to enforce max length. The result is always valid, but the intermediate string can be oversized and the `USERNAME_MIN_LENGTH` floor is semantically wrong here.

**Fix:** `Math.max(0, USERNAME_MAX_LENGTH - suffixValue.length)` — let the final `.slice` enforce the limit; `0` is the correct floor.

---

### BUG-A18

**🟡 Medium — Backend auth | Role normalization**  
**Title:** Admin role stored as `{ role: "Admin" }` (capital A) treated as no role  
**Status:** `open`  
**File:** `backend/modules/tournaments/auth.ts`

**Issue:** `normalizeAdminRole()` lowercases when role is a plain string, but not when it's an object `{ role: "..." }`. `readStringField` returns the trimmed but non-lowercased value. So `{ role: "Admin" }` → `"Admin"` → `"Admin" !== "admin"` → returns `null` → user gets unauthorized despite having a role record.

**Fix:** Lowercase the result of `readStringField(record, ["role"])` before comparing:
```typescript
const role = readStringField(record, ["role"])?.toLowerCase();
```

---

### BUG-A19

**🟡 Medium — Client auth | Session management**  
**Title:** Session restore silently re-persists session when refresh token is revoked/expired  
**Status:** `open`  
**File:** `ur-internals/src/auth/nakama.ts`

**Issue:** `restoreStoredNakamaSession()` only attempts a token refresh if the access token is expired AND a refresh token exists. If the access token is still valid but the refresh token has been revoked or expired server-side, the function re-persists the stale session and returns it as valid. The bad refresh token isn't detected until the next actual refresh attempt — up to 2 hours later (access token TTL). The user appears logged in but silently fails on the next refresh.

**Fix options:**
- Proactively check refresh token TTL from the `Session` object and clear if expired.
- Or: always attempt a background refresh on restore (eager validation) to surface revocation immediately.

---

### BUG-A20

**🟡 Medium — React / UI | Progression component**  
**Title:** `xpValue` Animated.Value included in listener setup dep array despite being a stable ref  
**Status:** `confirmed`  
**File:** `components/progression/CinematicXpRewardModal.tsx` (~lines 69–78)

**Issue:** `xpValue` is an `Animated.Value` — its reference never changes. Including it in the dep array is harmless today but signals a misunderstanding of ref stability and would cause listener churn if the value were ever recreated.

**Fix:** Use `}, []);` for the listener setup — it only needs to run once.

---

## Low Severity

---

### BUG-A21

**🟢 Low — Shared protocol | Validation**  
**Title:** `isNullableRollDisplayValue` missing parentheses around `&&` operand  
**Status:** `needs-investigation`  
**File:** `shared/urMatchProtocol.ts` (~line 237)

**Issue:** `&&` binds tighter than `||`, so the expression evaluates correctly today — but the missing parentheses are misleading and could mask a future edit breaking precedence silently.

```typescript
// Current — functionally correct but fragile
value === null || isNonNegativeInteger(value) && value <= 4

// Recommended — explicit
value === null || (isNonNegativeInteger(value) && value <= 4)
```

**Fix:** Add parentheses. No behavior change; prevents future regression.

---

### BUG-A22

**🟢 Low — Shared protocol | Types**  
**Title:** `rankTitle` typed as `string` but validated as nullable  
**Status:** `low-priority`  
**File:** `shared/urMatchProtocol.ts` (~line 249)

**Issue:** Field declared as `rankTitle?: string` (no null) but the runtime validator uses `isNullableString` (allows null). Null passes validation but would be a type error if consumed as a plain string.

**Fix:** Either type as `rankTitle?: string | null` or narrow the validator to reject null: `(v): v is string => typeof v === "string"`.

---

### BUG-A23

**🟢 Low — iOS | Build config**  
**Title:** iOS entitlements file is empty — may silently break capabilities  
**Status:** `needs-investigation`  
**File:** `ios/royalgameofur/royalgameofur.entitlements`

**Issue:** The file contains only an empty XML dict. If any capability is enabled in the Apple Developer portal or Xcode (push notifications, associated domains, sign-in with Apple, etc.), the required entitlement entries must be declared here or the feature will silently fail or the build will be rejected.

**Fix:** Audit Xcode → Signing & Capabilities. Add any missing entitlement keys. If no capabilities are enabled, the empty file is fine — but it should be verified and noted.

---

*End of bug registry. New bugs go in the Quick Reference table and get a full entry. IDs are permanent — don't renumber on resolution, mark `fixed` instead.*
