# orkestra-docs

The documentation site for [Orkestra](https://github.com/orkestra-cc/orkestra), deployed to **[docs.orkestra.cc](https://docs.orkestra.cc)**.

Built with [Docusaurus 3](https://docusaurus.io/) (TypeScript). Hosted on Cloudflare Pages.

## Audience

These docs are for:

- **Operators self-hosting Orkestra** — deployment, module configuration, integrations.
- **OSS contributors and addon authors** — the SDK contract, building new modules, contributing back.

End-customer (Tier-2 client) documentation lives elsewhere — those users consume the API, not these docs.

## Local development

```bash
npm install
npm run sync       # pull content from monorepo + addon repos + OpenAPI spec
npm start          # http://localhost:3000 with hot reload
npm run build      # produces ./build/ — what Cloudflare Pages publishes
npm run serve      # serve the built site locally
npm run typecheck
```

The `docs/` tree is **not** committed in this repo — every page is synced on demand. Running `npm start` without first running `npm run sync` will render an almost-empty site.

Iterating on the sync logic without pushing to the monorepo:

```bash
MONOREPO_LOCAL_PATH=/path/to/orkestra-checkout npm run sync:site
```

reads source files directly from disk instead of going through GitHub's API.

## Content sync

**This repo holds no hand-written content of its own.** Every page rendered by the site is mirrored from one of these sources at build time:

| What                          | Source                                                                  | Script                       |
| ----------------------------- | ----------------------------------------------------------------------- | ---------------------------- |
| Tutorials, architecture, etc. | `orkestra-cc/orkestra` `docs/site/**`                                   | `npm run sync:site`          |
| Addon module pages            | Each addon repo's `README.md` (`sources.yaml`)                          | `npm run sync:modules`       |
| Public ADRs                   | `orkestra-cc/orkestra` `docs/adr/*.md` with `public: true` frontmatter  | `npm run sync:adrs`          |
| OpenAPI reference             | `orkestra-cc/orkestra` `backend/openapi/enterprise.json`                | `npm run sync:openapi`       |

All four read the git ref from `sources.yaml` (`monorepo.ref`, currently `main`) — so the API reference tracks released endpoints, in step with the prose around it. `SPEC_REF=<ref> npm run sync:openapi` overrides it for piloting a spec that hasn't landed yet.

Run all four:

```bash
npm run sync
```

They run on every build in [`.github/workflows/build.yml`](.github/workflows/build.yml) — sync errors **fail the build**, since there is no checked-in fallback. `sync:openapi` additionally generates `docs/api/reference/sidebar.ts`, which `sidebars.ts` consumes to build the API Reference tree; that file being absent (or unwrapping to zero items) is fatal under `CI`, because the endpoint pages still build and deploy perfectly well with nothing linking to them. That workflow is the only path to production, triggered three ways: a push to `main` here, a `repository_dispatch` from the monorepo when its docs change, and a nightly cron that catches addon-repo edits nothing else watches.

### Which parser each synced page gets

`siteConfig.markdown.format` is `'detect'`, so the **extension the sync writes decides the parser**:

| Sync output | Parser | Why |
| --- | --- | --- |
| `docs/adrs/*.md`, `docs/modules/addons/*.md` | CommonMark | Authored as plain Markdown for GitHub. They never use JSX, and must not be held to MDX's stricter rules. |
| Everything mirrored from `docs/site/**` (`.mdx`) | MDX | Hand-written Docusaurus pages; JSX, imports and components are fair game. |

This matters because MDX compiles pages as JSX, where ordinary prose is a build
error: `(<5 minute)` reads as an opening tag and fails with *"Unexpected
character `5` before name"*. That took down a whole site build in August 2026 and
skipped a release's docs deploy. An ADR author has no reason to know their `.md`
is re-parsed as JSX in another repo, so the fix belongs here, not in a rule
people must remember. As a bonus, CommonMark renders these pages the way GitHub
does — the same file now looks the same in both places.

If a synced page ever genuinely needs MDX, change the extension the sync script
writes for that source; don't change `format` globally.

Nothing the sync produces is committed: `docs/*` and `static/openapi/` are both gitignored, so a working-tree diff after `npm run sync` is always empty. The nightly used to end in `create-pull-request` for exactly that diff, which meant it could never open a PR and never deployed — 14 green runs that published nothing while the site went stale. It now runs `build.yml` itself.

## Content authoring rules

- **No file under `docs/` should be edited in this repo.** Every page has a source elsewhere — find it via the page's "Edit this page" link in the navbar (Docusaurus follows the `custom_edit_url` injected at sync time) or look it up in `sources.yaml`.
- **What lives where:**
  - Tutorials / architecture / operating / SDK / contributing → [`orkestra-cc/orkestra` `docs/site/`](https://github.com/orkestra-cc/orkestra/tree/main/docs/site)
  - Per-addon module pages → that addon's `README.md` (one repo per addon)
  - ADRs → [`orkestra-cc/orkestra` `docs/adr/`](https://github.com/orkestra-cc/orkestra/tree/main/docs/adr) (need `public: true` in frontmatter to appear here)
  - OpenAPI ref → regenerated from the monorepo's `backend/openapi/enterprise.json` (`make openapi-dump`)
- **`CLAUDE.md` files are AI-only** — they are never synced into this site. Human-facing content for an addon lives in that addon's `README.md`.

This repo *is* the source of truth for: the Docusaurus config (`docusaurus.config.ts`), the sidebar layout (`sidebars.ts`), theming (`src/css/`), sync scripts (`scripts/`), and CI workflows (`.github/workflows/`).

## Cloudflare Pages secrets

The Pages deployment in [`.github/workflows/build.yml`](.github/workflows/build.yml) needs two repo secrets:

- `CLOUDFLARE_API_TOKEN` — Pages-scoped API token.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID hosting the `orkestra-docs` Pages project.

Create the Pages project once via the Cloudflare dashboard with project name `orkestra-docs`, then map the `docs.orkestra.cc` custom domain.

## Algolia DocSearch

The site is wired for [Algolia DocSearch](https://docsearch.algolia.com/) (free for OSS). Until you apply, the build is green but the search box doesn't render. To turn it on:

1. **Apply** at https://docsearch.algolia.com/apply/ — submit `https://docs.orkestra.cc` as the URL and `salvatore.balestrino@gmail.com` as the contact. Approval is usually within a few days; the response includes an app ID, a search-only API key, and an index name.
2. **Set three GitHub repo secrets** at https://github.com/orkestra-cc/orkestra-docs/settings/secrets/actions :
   - `ALGOLIA_APP_ID`
   - `ALGOLIA_SEARCH_API_KEY` (the public search-only key, **not** the admin key)
   - `ALGOLIA_INDEX_NAME`
3. Trigger the workflow (`gh workflow run "Build & Deploy" -R orkestra-cc/orkestra-docs --ref main`) — the search box appears in the navbar.

The Algolia crawler runs on their schedule (typically nightly) and indexes everything Docusaurus emits at build time.

## Roadmap

- Wire `docusaurus-plugin-openapi-docs` to render the live OpenAPI spec under `/api`. — ✅ done
- Migrate the canonical `docs/Authentication_flow.md` from the monorepo into this site. — ✅ done
- Apply for Algolia DocSearch once the site is publicly live. — ⏳ awaiting application
- Falcon-style theming pass to align with `frontend-admin`. — ✅ done
- Move all hand-written content into the monorepo (`docs/site/`) — this repo becomes a pure renderer. — ✅ done
- Cross-repo `repository_dispatch` from monorepo CI so docs deploys are sub-24h after a content merge. — ⏳ workflow is wired, PAT not yet provisioned

## Related repos

- [`orkestra-cc/orkestra`](https://github.com/orkestra-cc/orkestra) — the platform monorepo.
- [`orkestra-cc/orkestra-sdk`](https://github.com/orkestra-cc/orkestra-sdk) — the public Go SDK contract.
- Addon repos: `orkestra-cc/orkestra-{billing,documents,company,graph,aimodels,rag,agents,sales,subscriptions,payments,compliance,identity,dev}`.
