# NakamaService

> The singleton service class that manages Nakama auth sessions, the WebSocket, and token lifecycle.

**Last updated:** 2026-04-11  
**Sources:** [[2026-04-11-ur-codebase]]  
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

`connectSocket(createStatus?)` — creates socket, connects with session, caches in `this.socket`. Returns cached socket if already connected.

`connectSocketWithRetry(options?)` — wraps `connectSocket` with retry loop: default 3 attempts, 1.2s delay.

`disconnectSocket(fireDisconnectEvent?)` — closes socket and nulls reference.

`getSocket()` — returns cached socket or null (used by matchmaking to send messages).

---

## Config

`getNakamaConfig()` from `config/nakama.ts` reads from env vars:
- `EXPO_PUBLIC_NAKAMA_HOST`
- `EXPO_PUBLIC_NAKAMA_PORT`
- `EXPO_PUBLIC_NAKAMA_USE_SSL`
- `EXPO_PUBLIC_NAKAMA_SOCKET_SERVER_KEY`
- `EXPO_PUBLIC_NAKAMA_TIMEOUT_MS`
