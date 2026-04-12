# Publishing the Ur Wiki to GitHub Pages

This guide sets up the wiki as a public static site using [Quartz 4](https://quartz.jzhao.xyz/) — the standard tool for publishing Obsidian vaults.

---

## One-time setup (~15 minutes)

### 1. Scaffold Quartz into this repo

From the root of this repo:

```bash
# Clone Quartz's scaffolding into a temp folder, then copy its files here
git clone https://github.com/jackyzha0/quartz .quartz-tmp
cp -r .quartz-tmp/quartz ./quartz
cp -r .quartz-tmp/quartz.layout.ts .
cp .quartz-tmp/package.json .
cp .quartz-tmp/package-lock.json .
cp .quartz-tmp/tsconfig.json .
rm -rf .quartz-tmp

# Install dependencies
npm install
```

> **Tip:** Alternatively, you can scaffold Quartz separately and copy just your `wiki/` folder into its `content/` directory. Either approach works.

### 2. Point Quartz at your wiki content

In `quartz.config.ts` (already in this repo), update the `baseUrl` field:

```ts
baseUrl: "YOUR-ORG.github.io/ur-wiki",
```

Replace `YOUR-ORG` with your GitHub username or organization name.

Then tell Quartz where your content lives. In `quartz.layout.ts` or by symlinking:

```bash
# Option A: symlink (keeps everything in one place)
ln -s wiki quartz-content

# Option B: copy (simpler, but you need to re-copy after edits)
cp -r wiki/* content/
```

Or in `quartz.config.ts`, the `ignorePatterns` already excludes `sources/`, `CLAUDE.md`, and other non-public files — so you can point the content root at the repo root and Quartz will skip the right things.

### 3. Test locally

```bash
npx quartz build --serve
# Opens at http://localhost:8080
```

Check that:
- Wiki links (`[[zustand-game-store]]`) resolve correctly
- The index page renders
- Navigation and search work

### 4. Push to GitHub

```bash
git add .
git commit -m "Add Quartz publishing setup"
git push origin main
```

### 5. Enable GitHub Pages

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The first deploy will trigger automatically. Subsequent pushes to `main` deploy automatically.

Your site will be live at: `https://YOUR-ORG.github.io/ur-wiki`

---

## How it works after setup

- **Every push to `main`** triggers a rebuild and redeploy via `.github/workflows/deploy.yml`
- **Wiki edits** (ingesting new sources, updating pages) automatically appear on the site within ~2 minutes of pushing
- **Search** is built-in — full-text search across all pages
- **Graph view** shows the link network between pages
- **Backlinks** appear at the bottom of every page

---

## Link format note

Most of your wiki links use short-form `[[page-name]]` which Quartz resolves perfectly. The `index.md` file uses path-prefixed links like `[[wiki/concepts/architecture]]`. These will also resolve correctly as long as Quartz's content root is set to the repo root (not the `wiki/` subfolder).

If you ever see broken links after publishing, set `markdownLinkResolution: "absolute"` in `quartz.config.ts` instead of `"shortest"`.

---

## Keeping `sources/` private

The `quartz.config.ts` `ignorePatterns` already excludes `sources/` from the published site. Raw source material never goes public — only the synthesized `wiki/` content does.

If you want additional pages to stay private (drafts, WIP), add `draft: true` to their frontmatter:

```markdown
---
draft: true
---
```

---

## Team access

| Use case | How |
|----------|-----|
| Browse the wiki | Visit `https://YOUR-ORG.github.io/ur-wiki` |
| Search | Use the built-in search bar (top of page) |
| Download a page | Browser → Save Page As, or copy the markdown from GitHub |
| Download everything | `git clone https://github.com/YOUR-ORG/ur-wiki` |
| Suggest edits | Open a PR — changes auto-deploy on merge |

---

## Useful Quartz docs

- [Configuration reference](https://quartz.jzhao.xyz/configuration)
- [Plugins](https://quartz.jzhao.xyz/plugins)
- [Customizing the layout](https://quartz.jzhao.xyz/layout)
- [Hosting on GitHub Pages](https://quartz.jzhao.xyz/hosting)
