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
npm start          # http://localhost:3000 with hot reload
npm run build      # produces ./build/ — what Cloudflare Pages publishes
npm run serve      # serve the built site locally
npm run typecheck
```

## Content sync

Three pieces of content are auto-pulled from upstream sources, not hand-edited here.

| What                  | Source                                          | Script                |
| --------------------- | ----------------------------------------------- | --------------------- |
| Addon module pages    | Each addon repo's `README.md` (`sources.yaml`)  | `npm run sync:modules`|
| Public ADRs           | `orkestra-cc/orkestra` `docs/adr/*.md` with `public: true` frontmatter | `npm run sync:adrs` |
| OpenAPI reference     | The `enterprise` SKU's `/openapi.json`          | _(roadmap)_           |

Run all syncs:

```bash
npm run sync
```

The same scripts run in CI via [`.github/workflows/sync-nightly.yml`](.github/workflows/sync-nightly.yml) on a cron and open a PR if anything drifted.

## Content authoring rules

- **Hand-written content** lives in `docs/` and is the source of truth for tutorials, architecture, operating guides, SDK reference, and contributing guides.
- **Auto-synced content** (`docs/modules/addons/`, `docs/adrs/`) **must not be edited here** — PR the upstream repo instead.
- **`CLAUDE.md` files are AI-only** — they are never synced into this site. Human-facing content for an addon lives in that addon's `README.md`.

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

## Related repos

- [`orkestra-cc/orkestra`](https://github.com/orkestra-cc/orkestra) — the platform monorepo.
- [`orkestra-cc/orkestra-sdk`](https://github.com/orkestra-cc/orkestra-sdk) — the public Go SDK contract.
- Addon repos: `orkestra-cc/orkestra-{billing,documents,company,graph,aimodels,rag,agents,sales,subscriptions,payments,compliance,identity,dev}`.
