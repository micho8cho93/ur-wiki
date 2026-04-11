# Transport Layer

> How the app switches between offline (local bot) and online (Nakama) gameplay modes, and where the seam lives in the code.

**Last updated:** 2026-04-11  
**Sources:** [[2026-04-11-ur-codebase]]  
**Related:** [[architecture]], [[zustand-game-store]], [[nakama-service]], [[match-protocol]], [[game-engine]], [[nakama-runtime]]

---

## The Two Modes

Selected at build/run time by the env var `EXPO_PUBLIC_GAME_TRANSPORT`:

| Mode | Value | What happens |
|---|---|---|
| Offline / Bot | `offline` | Game runs entirely on client. Bot plays `dark`. No network. |
| Online | `nakama` | Client connects to Nakama WebSocket. All actions sent to server; server is authoritative. |

The store field `onlineMode: 'offline' | 'nakama'` reflects this at runtime.

---

## The Seam: `store.roll()` and `store.makeMove()`

These two actions in [[zustand-game-store]] are the single point where the transport decision is made:

```typescript
roll: (options?) => {
  if (onlineMode === 'nakama') {
    // guard: must be your turn
    rollCommandSender?.(options)  // sends ROLL_REQUEST over socket
    return
  }
  // offline: compute locally
  const rollValue = rollDice()
  // compute validMoves, handle zero-move auto-skip
  set({ gameState: nextState, validMoves })
}

makeMove: (move) => {
  if (onlineMode === 'nakama') {
    // guard: must be your turn
    moveCommandSender?.(move)  // sends MOVE_REQUEST over socket
    return
  }
  // offline: apply move locally
  set({ gameState: applyMove(gameState, move), validMoves: [] })
}
```

---

## Command Senders (Nakama Mode)

`rollCommandSender` and `moveCommandSender` are **function refs stored in the Zustand store**. They are set by the game screen's Nakama hook when a match is joined, and cleared on reset. This indirection means the store doesn't import any Nakama SDK code directly — the SDK lives in `services/`.

When the user or the UI calls `store.roll()`, it becomes a WebSocket message. When the server processes it, it broadcasts a `STATE_SNAPSHOT` back to both players. The client receives this and calls `store.applyServerSnapshot(snapshot)`, which fully replaces the game state.

---

## Bot / Offline Loop

In offline mode, the bot's turn is driven by the [[game-loop]] hook (`hooks/useGameLoop.ts`):

```
useEffect on [gameState]
  if currentTurn === 'dark' (bot's turn)
    if phase === 'rolling' → setTimeout(store.roll, 800ms)
    if phase === 'moving'  → getBotMove(state, roll, difficulty)
                             → setTimeout(store.makeMove, 1500ms)
```

The bot hook calls the same `store.roll()` and `store.makeMove()` the player uses. Since `onlineMode === 'offline'`, those calls take the local computation path.

---

## Online Snapshot Flow

```
Server STATE_SNAPSHOT received
  → store.applyServerSnapshot(snapshot)
  → guards: matchId must match, revision must not be stale
  → replaces gameState wholesale
  → recomputes validMoves from new state
  → copies all authoritative fields (timer, AFK, reconnect, matchEnd, rematch)
```

The `revision` counter prevents old snapshots from overwriting newer state. The server increments revision on every state change.

---

## No Optimistic UI in Online Mode

In Nakama mode, there is **zero optimistic state update** on the client. Every interaction waits for the server:

- `roll()` in nakama mode → sends `ROLL_REQUEST` (op code 1) → returns immediately without touching local game state. No dice value is set. The board does not update.
- `makeMove()` in nakama mode → sends `MOVE_REQUEST` (op code 2) → returns immediately without moving any piece locally.

The only way game state changes locally is when `applyServerSnapshot()` processes an incoming `STATE_SNAPSHOT` message (op code 100):

```typescript
applyServerSnapshot: (snapshot) => {
  // Revision guard: stale snapshots are silently dropped
  if (snapshot.revision <= current.revision) return;
  // Full replacement — no merge, no reconciliation
  set({ gameState: snapshot.gameState, revision: snapshot.revision, ... });
}
```

This means every roll and move has a full network round-trip before the player sees any result. There is no speculative execution and no rollback reconciliation. On a LAN tournament this is imperceptible; on high-latency connections every action feels laggy.

The design is intentional: authoritative server prevents cheating and eliminates the complexity of client-side prediction + rollback. The tradeoff is pure latency sensitivity.

---

## Auth and Socket Lifecycle

In online mode, before a match can start:
1. `NakamaService.ensureAuthenticatedDevice()` — ensures a valid session
2. `NakamaService.connectSocketWithRetry()` — opens WebSocket (3 attempts, 1s delay)
3. `findMatch()` or `createPrivateMatch()` / `joinPrivateMatch()` — matchmaking
4. Game screen injects `rollCommandSender` and `moveCommandSender` into store
5. Store sets `onlineMode: 'nakama'`

On match end or disconnect: socket may be closed, store is reset, `onlineMode` reverts to `'offline'`.
