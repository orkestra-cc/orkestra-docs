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

Run all four:

```bash
npm run sync
```

They run on every build in [`.github/workflows/build.yml`](.github/workflows/build.yml) (sync errors **fail the build** — there is no checked-in fallback), and on a nightly cron in [`.github/workflows/sync-nightly.yml`](.github/workflows/sync-nightly.yml) which opens a PR if anything drifted in static output (the OpenAPI per-endpoint MDX is committed for caching).

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
