# Agent instructions

The documentation site for Orkestra (Docusaurus), published at docs.orkestra.cc. This repository holds no hand-written pages: every page is synced from its source, as the [README](README.md) explains. Read it before changing anything.

## Sessions and worktrees

For work done by coding agents in parallel sessions.

- **Base:** `origin/main`. There is no integration branch.
- **Worktree:** one worktree per task; never work in a checkout someone else is using.
- **Environment:** `npm install`, `npm run sync`, then `npm start` (README, "Local development").
- **Checks:** `npm run typecheck` and `npm run build`. The workflow `build.yml` runs the sync and the build on the pull request.
- **Commits and PRs:** Conventional Commits; PR to `main`, merged with a merge commit. Content is never edited here: change it at its source (README, "Content authoring rules").
- **A person's yes is needed for:** merging any PR. A push to `main` builds and publishes the site, so a merge is a deploy.
- **Never:** edit or commit anything under `docs/`; commit secrets or the names of private systems (this repository is public).
- **After the merge:** check the "Build & Deploy" run and the published site, then remove the worktree.
