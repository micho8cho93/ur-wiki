# LLM Wiki — Schema & Operating Rules

> This file is the constitution of the wiki. Read it at the start of every session before doing anything else. It governs all operations: ingestion, querying, maintenance, and evolution.

---

## 1. What This Is

This is a **persistent, compounding knowledge base** built and maintained entirely by an LLM (you). Michel sources material; you do all the writing, cross-referencing, and maintenance. The wiki lives between raw sources and Michel's thinking — it's the compiled, synthesized layer that makes knowledge accumulate rather than evaporate.

**Core invariant:** The wiki gets richer with every source ingested and every question answered. Nothing useful should disappear into chat history.

---

## 2. Folder Structure

```
ur-wiki/
├── CLAUDE.md          ← this file (the schema)
├── index.md           ← master catalog of all wiki pages
├── log.md             ← append-only chronological record
│
├── sources/           ← raw, immutable source material
│   └── (articles, PDFs, notes, transcripts, data — never modified)
│
└── wiki/              ← LLM-generated content (you own this)
    ├── overview.md    ← high-level synthesis of the entire wiki
    ├── entities/      ← pages for specific people, orgs, places, products
    ├── concepts/      ← pages for ideas, theories, themes, frameworks
    ├── sources/       ← one summary page per ingested source
    └── queries/       ← saved answers to important questions
```

**Rules:**
- `sources/` is read-only. Never create or modify files there — only Michel does.
- `wiki/` is yours entirely. Create, update, rename, and reorganize freely.
- `index.md` and `log.md` are updated on every ingest and significant operation.
- `CLAUDE.md` evolves over time — Michel may update it; you may propose updates.

---

## 3. File Conventions

### Wiki page format (all files in `wiki/`)

```markdown
# Page Title

> One-sentence summary of this page.

**Last updated:** YYYY-MM-DD  
**Sources:** [[source-slug-1]], [[source-slug-2]]  
**Related:** [[concept-or-entity-1]], [[concept-or-entity-2]]

---

[body content]
```

### Naming conventions
- All filenames: `kebab-case.md`
- Entity pages: the entity's canonical name, e.g. `sam-altman.md`, `openai.md`
- Concept pages: the concept name, e.g. `retrieval-augmented-generation.md`
- Source summaries: `YYYY-MM-DD-short-title.md`, e.g. `2026-03-15-attention-is-all-you-need.md`
- Query pages: `q-topic-keyword.md`, e.g. `q-rag-vs-finetuning.md`

### Internal links
- Always use Obsidian wiki-links: `[[filename-without-extension]]`
- When mentioning an entity or concept that has (or should have) its own page, link it
- Prefer linking on first mention per section, not every mention

### Contradictions
- When a new source contradicts an existing claim, add a `> ⚠️ **Contradiction:** ...` callout to both pages explaining the conflict
- Do not silently overwrite — preserve the tension and note the sources on each side

---

## 4. The index.md Format

```markdown
# Wiki Index

**Last updated:** YYYY-MM-DD  
**Total pages:** N  
**Total sources ingested:** N

---

## Overview
- [[overview]] — Master synthesis of the entire wiki

## Sources
- [[wiki/sources/YYYY-MM-DD-title]] — One-line summary (date)

## Entities
- [[wiki/entities/name]] — One-line summary

## Concepts
- [[wiki/concepts/name]] — One-line summary

## Queries
- [[wiki/queries/q-topic]] — One-line summary (date answered)
```

---

## 5. The log.md Format

Append-only. Never edit past entries. Each entry:

```markdown
## [YYYY-MM-DD] operation | Title or description

- What was done
- Pages created or updated (bulleted list)
- Key takeaways or decisions
```

Operations: `ingest`, `query`, `lint`, `schema-update`, `session-start`

Grep-friendly: `grep "^## \[" log.md | tail -10` shows the last 10 entries.

---

## 6. Ingest Workflow

When Michel says **"ingest [source]"**:

1. **Read** the source file from `sources/`
2. **Discuss** with Michel: What are the 3-5 key takeaways? What's surprising? What connects to existing wiki content?
3. **Create** a source summary page in `wiki/sources/` using the standard format
4. **Update** existing entity and concept pages touched by the source (add new info, note contradictions, strengthen or challenge existing claims)
5. **Create** new entity or concept pages if significant new subjects appear
6. **Update** `wiki/overview.md` if the source shifts the overall synthesis
7. **Update** `index.md` — add the new source page and any new entity/concept pages
8. **Append** to `log.md` with the ingest record

**Scale:** A single source typically touches 5–15 pages. This is expected and good.

**Michel's involvement:** Default is collaborative — discuss before writing. Michel may also say "batch ingest" for a set-it-and-forget-it mode with less back-and-forth.

---

## 7. Query Workflow

When Michel asks a question:

1. **Read `index.md`** to identify relevant pages
2. **Read** those pages (and follow links if needed)
3. **Answer** with citations to wiki pages and original sources
4. **Offer to save** the answer as a `wiki/queries/q-*.md` page if it's non-trivial
5. If saving: create the page, update `index.md`, append to `log.md`

Answer formats (choose based on the question):
- Prose synthesis with wiki citations
- Comparison table (markdown)
- Timeline
- Bulleted breakdown
- A new wiki page (for complex answers worth keeping)

---

## 8. Lint Workflow

When Michel says **"lint"** or **"health check"**:

Run through the wiki and report:
1. **Contradictions** — conflicting claims across pages
2. **Orphans** — pages with no inbound links
3. **Stubs** — pages that exist in `index.md` or as links but have thin content
4. **Stale claims** — things that newer sources may have superseded
5. **Missing pages** — important entities/concepts mentioned but lacking a page
6. **Data gaps** — questions the wiki can't answer that could be filled with a web search or new source
7. **Suggested next sources** — what would most enrich the wiki right now?

Output as a lint report. Michel decides which issues to act on.

---

## 9. Session Start Protocol

At the start of every new session:

1. Read `CLAUDE.md` (this file)
2. Read `log.md` — last 5–10 entries to understand recent context
3. Read `index.md` — to know what's in the wiki
4. Briefly summarize: "Here's where we left off..." then ask Michel what to do

This ensures continuity across sessions without Michel having to re-explain context.

---

## 10. Wiki Health Principles

- **Prefer updating over creating.** If a concept fits in an existing page, update it — don't create a thin new page.
- **Every page earns its existence.** A page should have enough substance to be useful. Stubs are OK temporarily; they should be resolved on the next relevant ingest.
- **Links are the connective tissue.** A page with no links in or out is probably lost. Always cross-reference.
- **The overview is the north star.** `wiki/overview.md` should always reflect the current state of understanding. Update it when big shifts happen.
- **The log is sacred.** Never delete or edit log entries. Append only.
- **Source summaries are permanent.** Once a source is summarized, the summary page stays even if the source file is removed.

---

## 11. This Wiki's Domain

This wiki is a **codebase second brain** for the **Royal Game of Ur** — a multiplayer mobile/web game built with Expo (React Native) + Nakama backend. The goal is to understand how the codebase is structured, how its parts relate to each other, and to serve as a persistent reference for navigating, extending, and debugging the app.

**Primary concerns:**
- App architecture and folder structure
- Game logic and rules engine
- Transport layer (online Nakama vs offline/bot modes)
- Matchmaking, lobby, and presence system
- State management (Zustand store + game loop)
- Backend runtime (Nakama TypeScript modules)
- Progression, challenges, XP, and ELO systems
- Auth (Google OAuth, username onboarding)
- Shared types and protocol definitions between client and server

---

## 12. Schema Evolution

This file should evolve. When Michel and Claude discover better conventions:
1. Propose the change in chat
2. Michel approves
3. Update this file and append a `schema-update` entry to `log.md`

The schema is a living document, not a fixed specification.
