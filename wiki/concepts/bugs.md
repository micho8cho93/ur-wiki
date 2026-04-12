# Bug Registry — Royal Game of Ur

> **Last updated:** 2026-04-11 — Codex medium/low fix pass verified; A02 and A04 confirmed unfixed  
> **Sources:** claude-bugs.md (client/shared scan), codex-bugs.md (backend/infra scan), verification pass 2026-04-11, Codex fix pass + re-verification 2026-04-11  
> **Statuses:** `confirmed` | `open` | `needs-investigation` | `low-priority` | `not-a-bug` | `fixed`

---

## Quick Reference

| ID | Severity | Area | Title | Status |
|----|----------|------|-------|--------|
| [BUG-A01](#bug-a01) | 🔴 Critical | Backend auth | Default admin bootstrapping allows full takeover | `confirmed` |
| [BUG-A02](#bug-a02) | 🔴 Critical | Backend auth | `requireCompletedUsernameOnboarding` inverted guard | `confirmed` ⚠️ NOT FIXED |
| [BUG-A03](#bug-a03) | 🔴 Critical | Infra/security | Nakama console exposed via Caddy + default credentials | `open` |
| [BUG-A04](#bug-a04) | 🔴 High | Functional | Presence RPC payload unparsed — online count always throws | `confirmed` ⚠️ NOT FIXED |
| [BUG-A05](#bug-a05) | 🔴 High | Infra/security | Secrets committed in `nakama.yml` (rotate ASAP) | `open` |
| [BUG-A06](#bug-a06) | 🟡 Medium | Backend reliability | Private match orphaned if code record write fails | `fixed` |
| [BUG-A07](#bug-a07) | 🟡 Medium | Backend reliability | Rematch private match has same ordering hazard as A06 | `fixed` |
| [BUG-A08](#bug-a08) | 🟡 Medium | Backend reliability | Bare `JSON.parse(payload)` crashes on malformed RPC input | `fixed` |
| [BUG-A09](#bug-a09) | 🟡 Medium | Client reliability | `connectSocket()` can return stale/dead socket | `fixed` |
| [BUG-A10](#bug-a10) | 🟡 Medium | Infra/security | Dev docker-compose exposes Postgres + unsafe default keys | `fixed` |
| [BUG-A11](#bug-a11) | 🟡 Medium | Client security | Admin session tokens stored in `localStorage` | `fixed` |
| [BUG-A12](#bug-a12) | 🟡 Medium | Game fairness | Authoritative dice rolls use `Math.random()` (not CSPRNG) | `fixed` |
| [BUG-A13](#bug-a13) | 🟡 Medium | UI/React | `CinematicXpRewardModal` cleanup effect has spurious deps | `fixed` |
| [BUG-A14](#bug-a14) | 🟡 Medium | UI/React | `FloatingEmojiReactions` unstable `onComplete` in dep array | `fixed` |
| [BUG-A15](#bug-a15) | 🟡 Medium | Scripts | `reset-project.js` moves its own `scripts/` directory | `fixed` |
| [BUG-A16](#bug-a16) | 🟡 Medium | Shared protocol | `isTournamentMatchRewardSummaryPayload` allows floats for int fields | `fixed` |
| [BUG-A17](#bug-a17) | 🟡 Medium | Backend | `appendNumericSuffix` uses wrong floor in max-length trim | `fixed` |
| [BUG-A18](#bug-a18) | 🟡 Medium | Backend auth | Admin role normalization rejects non-lowercase object-stored roles | `fixed` |
| [BUG-A19](#bug-a19) | 🟡 Medium | Client auth | Session restore silently re-persists stale session on revoked refresh token | `fixed` |
| [BUG-A20](#bug-a20) | 🟡 Medium | UI/React | `xpValue` Animated.Value in listener dep array (stable ref, spurious) | `fixed` |
| [BUG-A21](#bug-a21) | 🟢 Low | Shared protocol | `isNullableRollDisplayValue` missing parentheses (fragile precedence) | `fixed` |
| [BUG-A22](#bug-a22) | 🟢 Low | Shared protocol | `rankTitle` type/validator mismatch (typed string, validated nullable) | `fixed` |
| [BUG-A23](#bug-a23) | 🟢 Low | iOS | Entitlements file is empty — may silently break capabilities | `needs-investigation` |
| [BUG-A24](#bug-a24) | 🟢 Low | UI/React | `Board.tsx` animation effect re-fires on re-render, causing duplicate move/capture animations | `fixed` |

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

> ⚠️ **NOT FIXED by Codex** — Code still reads `if (!object || profile.onboardingComplete) return;`. The missing `!` before `onboardingComplete` is still absent. A user with no stored profile still passes through without completing onboarding.

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

> ⚠️ **NOT FIXED by Codex** — `parseOnlineCount` still casts `payload` directly as `PresenceRpcPayload` without `JSON.parse`. The Nakama JS client delivers `response.payload` as a **string**, so `rpcPayload.onlineCount` is always `undefined`, causing every heartbeat/player-count call to throw.

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
**Status:** `fixed`  

> ✅ **FIXED** — commit `54b3a797`. "Reserve first" pattern implemented. `reservePrivateMatchCodeRecord` writes a placeholder record (`matchId: null`) before `nk.matchCreate`. After `matchCreate` succeeds, `createPrivateMatchCodeRecord` updates it with the real `matchId` using a retry loop (up to `PRIVATE_MATCH_CODE_WRITE_ATTEMPTS`). If `matchCreate` fails, the reservation is cleaned up via `deletePrivateMatchCodeRecord`. If the final publish fails, a clear error is surfaced to the caller.

**File:** `backend/modules/index.ts`

**Original issue:** `rpcCreatePrivateMatch` called `nk.matchCreate(...)` before `createPrivateMatchCodeRecord(...)`. If the storage write failed, the match had no discoverable join code → orphaned match until timeout.

---

### BUG-A07

**🟡 Medium — Reliability | Backend rematch**  
**Title:** Rematch private match has same ordering hazard as BUG-A06  
**Status:** `fixed`  

> ✅ **FIXED** — commit `54b3a797`. Same "reserve first" pattern applied to the rematch path. `reservePrivateMatchCodeRecord` is called before `nk.matchCreate`. On `matchCreate` failure, the reservation is cleaned up. On code publish failure, a warning is logged (rematch can still proceed via the match ID stored in match state).

**File:** `backend/modules/index.ts`

**Original issue:** Same ordering hazard as A06 in the separate rematch code path.

---

### BUG-A08

**🟡 Medium — Reliability | Backend RPCs**  
**Title:** Bare `JSON.parse(payload)` in multiple RPC handlers crashes on malformed input  
**Status:** `fixed`  

> ✅ **FIXED** — commit `54b3a797`. All RPC handlers now call `parseRpcPayload(payload)`. No bare `JSON.parse` calls remain in `index.ts`.

**File:** `backend/modules/index.ts`

**Original issue:** `rpcAuthLinkCustom` and `rpcMatchmakerAdd` used bare `JSON.parse(payload)` — malformed input caused unhandled 500 errors.

---

### BUG-A09

**🟡 Medium — Reliability | Client socket**  
**Title:** `connectSocket()` returns cached socket without checking if it's still connected  
**Status:** `fixed`  

> ✅ **FIXED** — commit `eddbabca`. `connectSocket()` now checks `this.socket && this.socketConnected && this.isSocketOpen(this.socket)` before reusing. `isSocketOpen()` inspects the underlying WebSocket adapter's `isOpen()` method if available, falling back to `socketConnected`. `handleSocketDisconnected()` nulls `this.socket` and clears `socketConnected`; it is registered on the socket's disconnect and heartbeat timeout events.

**File:** `services/nakama.ts`

**Original issue:** `connectSocket()` returned a stale socket reference after network drops — no connectivity check, no auto-null on disconnect.

---

### BUG-A10

**🟡 Medium — Security | Dev infra**  
**Title:** Dev docker-compose exposes Postgres externally with insecure defaults  
**Status:** `fixed`  

> ✅ **FIXED** — commit `eddbabca`. Postgres port now bound to `127.0.0.1:5432:5432`. All env vars use `:?` syntax (e.g., `${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in backend/.env}`) — compose fails loudly if any required var is unset, eliminating insecure fallback defaults.

**File:** `backend/docker-compose.yml`

**Original issue:** `5432:5432` was unbound (any interface); insecure `:-default` fallbacks for all secret env vars.

---

### BUG-A11

**🟡 Medium — Security | UR Internals**  
**Title:** Admin session tokens (including refresh token) stored in `localStorage`  
**Status:** `fixed`  

> ✅ **FIXED** — commit `eddbabca`. Tokens now stored in `sessionStorage` (tab-scoped, cleared on tab close). A one-time migration on first load reads any legacy `localStorage` value, migrates it to `sessionStorage`, and removes the `localStorage` entry. In-memory caching (`inMemorySession`) is also used to avoid redundant storage reads.

**Files:** `ur-internals/src/auth/sessionStorage.ts`, `ur-internals/src/auth/nakama.ts`

**Original issue:** Both tokens persisted in `window.localStorage` — exfiltrable via XSS.

---

### BUG-A12

**🟡 Medium — Fairness/Security | Game core**  
**Title:** Authoritative dice rolls use `Math.random()` — not a CSPRNG  
**Status:** `fixed`  

> ✅ **FIXED** — commit `5435613c`. `rollAuthoritativeDice()` now calls `rollDice(() => getSecureRandomUnit(nk))`. `getSecureRandomUnit` uses `crypto.getRandomValues(new Uint32Array(1))` as the primary source, with `nk.uuidv4()` hex parsing as a Nakama-specific fallback. If neither is available, it throws rather than silently falling back to `Math.random()`. Client-side `rollDice()` retains `Math.random` as its default for offline/bot play only.

**Files:** `logic/engine.ts`, `backend/modules/index.ts`

**Original issue:** Authoritative backend dice rolls used `Math.random()` — statistically biased, potentially predictable.

---

### BUG-A13

**🟡 Medium — React / UI | Progression component**  
**Title:** `CinematicXpRewardModal` cleanup effect lists stable Animated.Value refs in dep array  
**Status:** `fixed`  

> ✅ **FIXED** — commit `5435613c`. Cleanup effect dep array is now `[]` with an `// eslint-disable-line react-hooks/exhaustive-deps -- cleanup-only effect with stable refs` comment documenting intent.

**File:** `components/progression/CinematicXpRewardModal.tsx`

**Original issue:** Spurious deps in cleanup `useEffect` caused animation restarts on unrelated re-renders.

---

### BUG-A14

**🟡 Medium — React / UI | Game component**  
**Title:** `FloatingEmojiReactions` includes unstable `onComplete` prop in animation effect dep array  
**Status:** `fixed`  

> ✅ **FIXED** — commit `5435613c`. `onCompleteRef` pattern implemented: `const onCompleteRef = useRef(onComplete)` declared, a separate `useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete])` keeps the ref current, and the animation effect calls `onCompleteRef.current(reaction.id)` rather than `onComplete` directly.

**File:** `components/game/FloatingEmojiReactions.tsx`

**Original issue:** Unstable `onComplete` prop in animation `useEffect` dep array caused mid-animation restarts on parent re-renders.

---

### BUG-A15

**🟡 Medium — Scripts | Dev tooling**  
**Title:** `reset-project.js` includes `"scripts"` in the directories it moves away  
**Status:** `fixed`  

> ✅ **FIXED** — commit `243ee9d2`. `oldDirs` is now `["app", "components", "hooks", "constants"]`. `"scripts"` removed.

**File:** `scripts/reset-project.js`

**Original issue:** Script was moving its own containing directory as part of cleanup — fragile and unintentional.

---

### BUG-A16

**🟡 Medium — Shared protocol | Validation**  
**Title:** `isTournamentMatchRewardSummaryPayload` allows float values for integer fields  
**Status:** `fixed`  

> ✅ **FIXED** — commit `243ee9d2`. Both fields now use `isNonNegativeInteger`. `round` is also nullable (`isNonNegativeInteger(value.round) || value.round === null`), and `challengeCompletionCount` uses `isNonNegativeInteger` directly.

**File:** `shared/urMatchProtocol.ts`

**Original issue:** `round` and `challengeCompletionCount` accepted floats via loose `typeof === "number"` / `isFiniteNumber` validators.

---

### BUG-A17

**🟡 Medium — Backend | Username generation**  
**Title:** `appendNumericSuffix` uses `USERNAME_MIN_LENGTH` as floor in trim, obscuring intent  
**Status:** `fixed`  

> ✅ **FIXED** — commit `243ee9d2`. Now uses `Math.max(0, USERNAME_MAX_LENGTH - suffixValue.length)`. The `USERNAME_MIN_LENGTH` floor is gone; the trailing `.slice(0, USERNAME_MAX_LENGTH)` is the sole length enforcer.

**File:** `backend/modules/usernameOnboarding.ts`

**Original issue:** Wrong floor constant created semantically misleading code (though output was always valid).

---

### BUG-A18

**🟡 Medium — Backend auth | Role normalization**  
**Title:** Admin role stored as `{ role: "Admin" }` (capital A) treated as no role  
**Status:** `fixed`  

> ✅ **FIXED** — commit `243ee9d2`. `const role = readStringField(record, ["role"])?.toLowerCase()` — lowercase applied before comparison in the object-stored branch of `normalizeAdminRole`.

**File:** `backend/modules/tournaments/auth.ts`

**Original issue:** Object-stored roles with capital first letter (e.g., `"Admin"`) were not lowercased before comparison, causing unauthorized errors for legitimately-roled users.

---

### BUG-A19

**🟡 Medium — Client auth | Session management**  
**Title:** Session restore silently re-persists session when refresh token is revoked/expired  
**Status:** `fixed`  

> ✅ **FIXED** — commit `243ee9d2`. Eager refresh always attempted on restore (even when access token is still valid). A 401/403 response clears the session immediately. Transient network errors fall back gracefully to the still-valid access token session without clearing it. Expired refresh tokens are detected and cleared at the top of the restore flow before any network call.

**File:** `ur-internals/src/auth/nakama.ts`

**Original issue:** Restore only refreshed if the access token was expired — a revoked-but-not-expired refresh token went undetected until the next forced refresh.

---

### BUG-A20

**🟡 Medium — React / UI | Progression component**  
**Title:** `xpValue` Animated.Value included in listener setup dep array despite being a stable ref  
**Status:** `fixed`  

> ✅ **FIXED** — commit `243ee9d2`. Listener setup effect dep array is now `[]` with an `// eslint-disable-line react-hooks/exhaustive-deps -- xpValue is a stable ref-backed Animated.Value` comment.

**File:** `components/progression/CinematicXpRewardModal.tsx`

**Original issue:** Stable `Animated.Value` ref in dep array — spurious, misleading, and would cause listener churn if ref were ever recreated.

---

## Low Severity

---

### BUG-A21

**🟢 Low — Shared protocol | Validation**  
**Title:** `isNullableRollDisplayValue` missing parentheses around `&&` operand  
**Status:** `fixed`  

> ✅ **FIXED** — commit `243ee9d2`. Expression now reads `value === null || (isNonNegativeInteger(value) && value <= 4)`. No behavior change; precedence is now explicit.

**File:** `shared/urMatchProtocol.ts`

**Original issue:** Missing parentheses made precedence implicit — fragile against future edits.

---

### BUG-A22

**🟢 Low — Shared protocol | Types**  
**Title:** `rankTitle` typed as `string` but validated as nullable  
**Status:** `fixed`  

> ✅ **FIXED** — commit `243ee9d2`. Field now typed as `rankTitle?: string | null`, aligning the TypeScript type with the `isNullableString` validator.

**File:** `shared/urMatchProtocol.ts`

**Original issue:** Type/validator mismatch — `string` type but `isNullableString` validator allowed null through as a type error.

---

### BUG-A23

**🟢 Low — iOS | Build config**  
**Title:** iOS entitlements file is empty — may silently break capabilities  
**Status:** `needs-investigation`  
**File:** `ios/royalgameofur/royalgameofur.entitlements`

**Issue:** The file contains only an empty XML dict. If any capability is enabled in the Apple Developer portal or Xcode (push notifications, associated domains, sign-in with Apple, etc.), the required entitlement entries must be declared here or the feature will silently fail or the build will be rejected.

**Fix:** Audit Xcode → Signing & Capabilities. Add any missing entitlement keys. If no capabilities are enabled, the empty file is fine — but it should be verified and noted.

---

### BUG-A24

**🟢 Low — UI/React | Game board**  
**Title:** `Board.tsx` animation effect re-fires on re-render, causing duplicate move/capture animations  
**Status:** `fixed`  

> ✅ **FIXED** — commit `d81fd307`. Two changes combined to eliminate the duplicate:
> 1. **Signature guard:** before calling `setAnimatedMove`, a move signature string (`historyEntryCount:color:pieceId:fromPos:toPos:capturedId`) is computed and compared against `lastAnimatedMoveSignatureRef`. The animation only fires if the signature differs from the last one that ran.
> 2. **Highlight refs:** `highlightedPieceId` and `highlightedPieceColor` removed from the animation effect's dep array. They are now tracked via `highlightedPieceIdRef` / `highlightedPieceColorRef` (updated in a separate effect), so changes to those props no longer re-trigger the animation effect.
> 3. **`LayoutAnimation.configureNext` removed** from the move commit path — was causing an unwanted layout animation on every piece move.

**File:** `components/game/Board.tsx`

**Root cause:** The board animation `useEffect` included `highlightedPieceId` and `highlightedPieceColor` in its dep array. When either changed (e.g., piece selection changing after a move), the effect re-ran against the same game state, found the same "next animated move", and fired the animation a second time — producing a duplicate slide/capture sequence.

---

*End of bug registry. New bugs go in the Quick Reference table and get a full entry. IDs are permanent — don't renumber on resolution, mark `fixed` instead.*
