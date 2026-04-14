# Wiki Reorganization — 2026-04-14

This document summarizes the structural reorganization completed on 2026-04-14.

## What Changed

### Folder Structure (Before → After)

**Before:** Flat `concepts/` folder mixing layers, features, protocols, and audit findings.

```
wiki/
├── concepts/ (15 pages: architecture, game-engine, matchmaking, ...)
├── entities/ (4 pages)
├── index.md
├── overview.md
└── WIP.md
```

**After:** Semantic folders organized by purpose and audience.

```
wiki/
├── architecture/ (4 pages)
│   ├── architecture.md
│   ├── layer-frontend.md [NEW]
│   ├── layer-backend.md [NEW]
│   └── layer-transport.md
├── features/ (7 pages)
│   ├── game-engine.md
│   ├── matchmaking.md
│   ├── spectator-mode.md
│   ├── tournament-flow.md
│   ├── challenge-system.md
│   ├── progression-system.md
│   └── elo-system.md
├── protocol/ (3 pages)
│   ├── match-protocol.md
│   ├── match-configs.md
│   └── shared-types.md [NEW]
├── runtime/ (1 page)
│   └── nakama-runtime.md
├── quality/ (4 pages)
│   ├── performance.md
│   ├── test-coverage.md
│   ├── bugs.md
│   └── next-steps.md
├── knowledge/ (1 page)
│   └── decisions.md [NEW]
├── entities/ (4 pages)
├── index.md [REWRITTEN]
├── overview.md [STREAMLINED]
└── WIP.md
```

### New Pages Created

1. **`architecture/layer-frontend.md`** — Expo Router, Zustand store, provider stack, service layer
2. **`architecture/layer-backend.md`** — Nakama runtime, storage schema, match lifecycle, deployment
3. **`protocol/shared-types.md`** — GameState, Player, progression types, ELO types, challenge types
4. **`knowledge/decisions.md`** — 15 architectural decisions with trade-offs and rationale

### Pages Updated

- **`overview.md`** — Removed evolution notes, reorganized as a reference guide with navigation breadcrumbs
- **`index.md`** — Reorganized into semantic sections matching the new folder structure
- **All moved pages** — Updated wikilinks from `[[transport-layer]]` to `[[layer-transport]]`, removed path prefixes

## Rationale

### Why Reorganize?

The original flat `concepts/` folder mixed different types of information:
- **Layers** (architecture, transport-layer) — "How is the system built?"
- **Features** (matchmaking, tournament-flow, spectator-mode) — "How does X work?"
- **Protocols** (match-protocol, match-configs) — "What are the types and contracts?"
- **Runtime internals** (nakama-runtime) — "What does the server do?"
- **Audit findings** (performance, test-coverage, bugs) — "What's broken/slow/untested?"

This made it hard to navigate: you'd need to scroll through 15 pages to find what you're looking for.

### New Organization Principles

| Folder | Audience | Question |
|--------|----------|----------|
| **architecture/** | Newcomers, architects | How is the system built? |
| **features/** | Feature developers | How does feature X work? |
| **protocol/** | Integration points | What are the types? |
| **runtime/** | Backend engineers | What does the server do? |
| **quality/** | Code reviewers, QA | What's broken/slow/untested? |
| **knowledge/** | Maintainers | Why was this decision made? |
| **entities/** | Code explorers | What does module Y do? |

## Migration Guide for Links

### Old Link → New Link

```
[[transport-layer]]        → [[layer-transport]]
[[nakama-runtime]]         → [[nakama-runtime]] (no change, in runtime/ folder)
[[architecture]]           → [[architecture]] (no change, in architecture/ folder)
[[game-engine]]            → [[game-engine]] (no change, in features/ folder)
[[performance]]            → [[performance]] (no change, in quality/ folder)
[[bugs]]                   → [[bugs]] (no change, in quality/ folder)
[[test-coverage]]          → [[test-coverage]] (no change, in quality/ folder)
[[next-steps]]             → [[next-steps]] (no change, in quality/ folder)
```

Use shortest-path form (just the filename without folder prefix). Quartz's link resolver will find the page in its new location.

## What to Clean Up

### Old `concepts/` Folder

The original `concepts/` folder is no longer active but remains for safety. Once you've verified the new structure works, you can delete:

```bash
rm -rf wiki/concepts/
```

## Testing

After this reorganization:

1. ✅ Run `npm run wiki:build` to regenerate the static site
2. ✅ Check that all navigation links work (click through from index.md, overview.md)
3. ✅ Verify that Quartz is generating the correct output folder structure
4. ✅ Spot-check a few wikilinks in pages to ensure they resolve

## Future Improvements

As you add more content:

- Consider creating `architecture/data-flow.md` if the data flow diagrams grow
- Consider splitting `runtime/nakama-runtime.md` into `runtime/match-lifecycle.md` and `runtime/match-handler.md` if it gets too long
- Add more pages to `knowledge/` as design questions arise (e.g., `knowledge/monetization-decisions.md`)
- Archive old `log.md` entries to `history.md` if the log file grows too large

---

**Questions?** See [[overview]] for navigation guidance or [[index]] for the full page catalog.
