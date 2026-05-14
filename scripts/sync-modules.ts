#!/usr/bin/env tsx
/**
 * Sync addon module pages from each public addon repo's README.md.
 *
 * Output: docs/modules/addons/<name>.mdx
 *
 * Sources are listed in sources.yaml. Each one is fetched at the pinned ref via
 * raw.githubusercontent.com (no git clone, no auth required for public repos).
 *
 * Run locally:  npm run sync:modules
 * Run in CI:    same script — see .github/workflows/sync-nightly.yml
 */
import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadSources, rawGithubBase, fetchText, transformReadme} from './_lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUT_DIR = join(REPO_ROOT, 'docs', 'modules', 'addons');

async function main() {
  const sources = loadSources(REPO_ROOT);
  mkdirSync(OUT_DIR, {recursive: true});

  let synced = 0;
  let skipped = 0;
  for (const addon of sources.addons) {
    const ref = addon.ref ?? 'main';
    const rawBase = rawGithubBase(addon.url, ref);
    const repoBase = addon.url.replace(/\.git$/, '').replace(/\/$/, '');
    const url = `${rawBase}/README.md`;
    console.log(`→ ${addon.name}: ${url}`);

    const body = await fetchText(url);
    if (body == null) {
      console.warn(`  ! no README.md found — skipping`);
      skipped++;
      continue;
    }

    const transformed = transformReadme(body, rawBase, repoBase);
    const mdx = renderPage(addon.name, repoBase, ref, transformed);
    writeFileSync(join(OUT_DIR, `${addon.name}.mdx`), mdx);
    synced++;
  }
  console.log(`\nDone. ${synced} synced, ${skipped} skipped.`);
}

function renderPage(name: string, repoBase: string, ref: string, body: string): string {
  return `---
title: ${name}
sidebar_label: ${name}
description: Auto-synced from ${repoBase} (${ref})
custom_edit_url: ${repoBase}/edit/${ref}/README.md
---

import Admonition from '@theme/Admonition';

<Admonition type="info" title="Auto-synced">
  This page is synced from <a href="${repoBase}">${repoBase}</a> at ref \`${ref}\`.
  To edit, PR the source repo — changes appear here on the next sync.
</Admonition>

${body}
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
