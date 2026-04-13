# NakamaService

> The singleton service class that manages Nakama auth sessions, the WebSocket, and token lifecycle.

**Last updated:** 2026-04-12 (commit `eddbabca`)  
**Sources:** GitHub repo (micho8cho93/ur)  
**Related:** [[transport-layer]], [[matchmaking]], [[architecture]]

---

## Location

`services/nakama.ts` — exports a singleton instance: `export const nakamaService = new NakamaService()`

---

## Responsibilities

1. **Client creation** — lazily creates the Nakama `Client` from config on first call to `getClient()`
2. **Authentication** — email, device, Google OAuth, or stored device fallback
3. **Session persistence** — stores token + refresh token in `AsyncStorage` under `nakama.session`
4. **Session refresh** — transparent token refresh; deduplicated via `sessionRefreshPromise` to prevent concurrent refreshes
5. **Socket management** — creates and caches the WebSocket `Socket`; retry logic via `connectSocketWithRetry`
6. **Unauthorized recovery** — `recoverSessionAfterUnauthorized` tries: current session → refresh → device fallback

---

## Auth Methods

| Method | Use case |
|---|---|
| `authenticateEmail(email, password, create?)` | Email/password auth |
| `authenticateDevice(deviceId, create?)` | Anonymous device auth |
| `authenticateStoredDevice()` | Use persisted device ID (creates if not exists) |
| `authenticateGoogle(token)` | Google OAuth token auth |
| `linkGoogle(token)` | Link Google to existing device session |
| `ensureAuthenticatedDevice()` | Load existing session or fall back to device auth |

---

## Session Lifecycle

```
loadSession()
  → in-memory session valid? → return it
  → expired + refresh_token? → refreshSession()
  → read from AsyncStorage
    → valid? → restore + return
    → expired + refresh_token? → refreshSession()
    → otherwise → clearSession(), return null
```

`refreshSession()` is deduplicated: concurrent calls share one `Promise` via `sessionRefreshPromise`. On unauthorized error, clears session entirely.

---

## Device ID

`getOrCreateDeviceId()` — generates a stable anonymous ID (`device-{timestamp}-{random}`) stored in `AsyncStorage` under `nakama.deviceId`. Used for anonymous auth when no Google account is linked.

---

## Google Auth Fallback Logic

`canFallbackToDeviceAuth()` — checks `loadStoredUser()` from `src/auth/sessionStorage`. Returns `false` if the stored user authenticated with Google (forcing a re-login instead of silently falling back to device auth, which would lose their Google-linked account).

---

## Socket

`connectSocket(createStatus?)` — creates socket, connects with session, caches in `this.socket`. Returns cached socket **only if** the socket reference is non-null, `socketConnected` is true, **and** `isSocketOpen()` confirms the adapter is still open. Previously it returned a stale closed socket if the connection had silently dropped.

`connectSocketWithRetry(options?)` — wraps `connectSocket` with retry loop: default 3 attempts, 1.2s delay.

`disconnectSocket(fireDisconnectEvent?)` — nulls `this.socket` and sets `socketConnected = false` **before** calling `socket.disconnect()`. This prevents a race where a reconnect attempt could observe a non-null socket mid-teardown.

`getSocket()` — returns cached socket or null (used by matchmaking to send messages).

### Stale socket fix (commit `eddbabca`)

Prior to this commit, `connectSocket` reused `this.socket` without checking whether the underlying WebSocket was still open. A socket that had been silently disconnected (network drop, heartbeat timeout) would be returned as "connected" and all subsequent match messages would be lost.

**Changes:**
- Added private `socketConnected: boolean` flag alongside the `socket` reference
- `registerSocketLifecycleHandlers(socket)` chains `ondisconnect`, `onerror`, and `onheartbeattimeout` to call `handleSocketDisconnected`, which nulls `this.socket` and clears `socketConnected`
- `isSocketOpen(socket)` inspects the adapter's `isOpen()` method (via `SocketWithAdapter` cast) with a fallback to `socketConnected`
- If `connectSocket` finds a stale socket, it calls `disconnectSocket(false)` to clean up before creating a new one

### Session storage hardening (`ur-internals`, commit `eddbabca`)

`ur-internals/src/auth/sessionStorage.ts` was refactored to improve security and reliability:
- Admin sessions are now stored in **`sessionStorage`** (tab-scoped, cleared on tab close) instead of `localStorage` (persistent)
- An **in-memory cache** (`inMemorySession`) avoids repeated storage reads within a session
- **One-time migration**: on first read, any session found in `localStorage` is migrated to `sessionStorage` and the `localStorage` entry is deleted (`clearLegacyLocalStorageSession`)
- All storage access is guarded with try/catch for restricted browser contexts

---

## Config

`getNakamaConfig()` from `config/nakama.ts` reads from env vars:
- `EXPO_PUBLIC_NAKAMA_HOST`
- `EXPO_PUBLIC_NAKAMA_PORT`
- `EXPO_PUBLIC_NAKAMA_USE_SSL`
- `EXPO_PUBLIC_NAKAMA_SOCKET_SERVER_KEY`
- `EXPO_PUBLIC_NAKAMA_TIMEOUT_MS`
