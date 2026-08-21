#!/usr/bin/env tsx
/**
 * Sync ADRs from the monorepo. An ADR is included if and only if its frontmatter
 * contains `public: true`. Output: docs/adrs/<filename>.md
 *
 * Emitted as .md, not .mdx: ADRs are authored as plain Markdown for GitHub and
 * never use JSX. With siteConfig.markdown.format = 'detect' that means they are
 * parsed as CommonMark, so prose like '(<5 minute)' or a bare brace cannot fail
 * the build the way it does under MDX.
 *
 * Discovery uses the GitHub Contents API (anonymous, rate-limited at 60/h —
 * fine for nightly sync; CI passes GITHUB_TOKEN to lift to 5000/h).
 */
import {writeFileSync, mkdirSync, readdirSync, unlinkSync} from 'node:fs';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';
import {loadSources, rawGithubBase, fetchText, transformReadme} from './_lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUT_DIR = join(REPO_ROOT, 'docs', 'adrs');

type ContentsItem = {name: string; path: string; type: 'file' | 'dir'};

async function listMonorepoDir(repoUrl: string, ref: string, path: string): Promise<ContentsItem[]> {
  const m = repoUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) throw new Error(`Cannot parse GitHub URL: ${repoUrl}`);
  const apiUrl = `https://api.github.com/repos/${m[1]}/${m[2]}/contents/${path}?ref=${ref}`;
  const headers: Record<string, string> = {Accept: 'application/vnd.github.v3+json'};
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(apiUrl, {headers});
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GH API ${apiUrl} → ${res.status}: ${await res.text()}`);
  return (await res.json()) as ContentsItem[];
}

async function main() {
  const sources = loadSources(REPO_ROOT);
  const repo = sources.monorepo;
  const ref = repo.ref ?? 'main';
  const adrDir = (repo.adrs?.glob ?? 'docs/adr/*.md').replace(/\/\*\.md$/, '');
  const rawBase = rawGithubBase(repo.url, ref);
  const repoBase = repo.url.replace(/\.git$/, '').replace(/\/$/, '');

  console.log(`Listing ADRs from ${repo.url}@${ref}:${adrDir}`);
  const items = await listMonorepoDir(repo.url, ref, adrDir);
  const files = items.filter((i) => i.type === 'file' && i.name.endsWith('.md'));

  // Clear previously-synced ADRs (keep the hand-written index.mdx). Both
  // extensions: .mdx sweeps up output from before the CommonMark switch, .md is
  // what we write now — without it a renamed or unpublished ADR would linger.
  for (const f of readdirSync(OUT_DIR)) {
    if (f !== 'index.mdx' && (f.endsWith('.mdx') || f.endsWith('.md'))) unlinkSync(join(OUT_DIR, f));
  }
  mkdirSync(OUT_DIR, {recursive: true});

  let included = 0;
  let skipped = 0;
  for (const file of files) {
    const url = `${rawBase}/${file.path}`;
    const body = await fetchText(url);
    if (body == null) {
      skipped++;
      continue;
    }
    const parsed = matter(body);
    if (parsed.data.public !== true) {
      console.log(`  - ${file.name}: skip (not public)`);
      skipped++;
      continue;
    }

    const transformed = transformReadme(parsed.content, `${rawBase}/${dirname(file.path)}`, repoBase);
    const outName = file.name;
    const title = (parsed.data.title as string | undefined) ?? file.name.replace(/\.md$/, '');
    const status = (parsed.data.status as string | undefined) ?? '';
    const editUrl = `${repoBase}/edit/${ref}/${file.path}`;

    const mdx = `---
title: ${JSON.stringify(title)}
sidebar_label: ${JSON.stringify(title)}
${status ? `description: ${JSON.stringify(`Status: ${status}`)}` : ''}
custom_edit_url: ${editUrl}
---

${transformed}
`;
    writeFileSync(join(OUT_DIR, outName), mdx);
    included++;
    console.log(`  ✓ ${file.name}`);
  }
  console.log(`\nDone. ${included} included, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
