#!/usr/bin/env tsx
/**
 * Sync hand-written Docusaurus pages from the monorepo (the canonical
 * source-of-truth) into this repo's docs/ tree.
 *
 * Why: the monorepo at orkestra-cc/orkestra holds the operator/contributor
 * documentation under docs/site/. Keeping it there means a GitHub web visitor
 * to the monorepo sees the same pages this site renders, and edits flow
 * through the codebase the docs describe.
 *
 * What gets synced is declared in sources.yaml under `monorepo.site`:
 *   - mirror[]: full directory mirrors (destination is wiped + repopulated)
 *   - files[]:  individual files (overwritten in place)
 *
 * For each .mdx / .md file the script injects a `custom_edit_url` frontmatter
 * pointing back at the monorepo blob, so Docusaurus' "Edit this page" link
 * lands in the monorepo (not in this repo, which is the wrong place for
 * synced content).
 *
 * Run locally:  npm run sync:site
 * Run in CI:    same script — see .github/workflows/build.yml and sync-nightly.yml
 */
import {writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {dirname, resolve, join, posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import {loadSources, rawGithubBase, fetchText, type SiteFile, type SiteMirror} from './_lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// Offline override: when MONOREPO_LOCAL_PATH is set to a checked-out monorepo
// directory, the script reads files directly from disk instead of going
// through GitHub's API + raw.githubusercontent.com. Lets us iterate on the
// sync logic before the source content is pushed.
const LOCAL_MONOREPO = process.env.MONOREPO_LOCAL_PATH;

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

/** Walks `path` under the monorepo recursively, returning every file path. */
async function walkMonorepoDir(repoUrl: string, ref: string, path: string): Promise<string[]> {
  if (LOCAL_MONOREPO) {
    return walkLocal(path);
  }
  const items = await listMonorepoDir(repoUrl, ref, path);
  const out: string[] = [];
  for (const item of items) {
    if (item.type === 'file') {
      out.push(item.path);
    } else if (item.type === 'dir') {
      out.push(...(await walkMonorepoDir(repoUrl, ref, item.path)));
    }
  }
  return out;
}

function walkLocal(relPath: string): string[] {
  const abs = join(LOCAL_MONOREPO as string, relPath);
  if (!existsSync(abs)) return [];
  const st = statSync(abs);
  if (st.isFile()) return [relPath];
  const out: string[] = [];
  for (const name of readdirSync(abs)) {
    out.push(...walkLocal(posix.join(relPath, name)));
  }
  return out;
}

async function readMonorepoFile(url: string, srcPath: string): Promise<string | null> {
  if (LOCAL_MONOREPO) {
    const abs = join(LOCAL_MONOREPO, srcPath);
    if (!existsSync(abs)) return null;
    return readFileSync(abs, 'utf8');
  }
  return fetchText(url);
}

/**
 * Rewrite a fetched .mdx / .md body so Docusaurus links the "Edit" button
 * back to the monorepo source, not to this repo. Files without frontmatter
 * get a minimal block so the field can be set without breaking rendering.
 */
function injectEditUrl(body: string, repoBase: string, ref: string, srcPath: string): string {
  const editUrl = `${repoBase}/edit/${ref}/${srcPath}`;
  const parsed = matter(body);
  parsed.data.custom_edit_url = editUrl;
  // gray-matter's stringify preserves the original line endings for `content`
  // and re-emits frontmatter as YAML.
  const fm = yaml.dump(parsed.data, {lineWidth: 1000, quotingType: '"', forceQuotes: false});
  return `---\n${fm}---\n${parsed.content.startsWith('\n') ? '' : '\n'}${parsed.content}`;
}

function isFrontmatterFile(name: string): boolean {
  return name.endsWith('.mdx') || name.endsWith('.md');
}

async function syncFile(opts: {
  rawBase: string;
  repoBase: string;
  ref: string;
  srcPath: string;
  dstAbs: string;
}): Promise<void> {
  const {rawBase, repoBase, ref, srcPath, dstAbs} = opts;
  const url = `${rawBase}/${srcPath}`;
  const body = await readMonorepoFile(url, srcPath);
  if (body == null) {
    throw new Error(`monorepo file not found: ${srcPath} (${LOCAL_MONOREPO ? 'local: not present' : 'HTTP 404'})`);
  }
  mkdirSync(dirname(dstAbs), {recursive: true});
  const out = isFrontmatterFile(srcPath) ? injectEditUrl(body, repoBase, ref, srcPath) : body;
  writeFileSync(dstAbs, out);
}

async function mirrorDir(opts: {
  repoUrl: string;
  rawBase: string;
  repoBase: string;
  ref: string;
  srcDir: string;
  dstDir: string;
}): Promise<number> {
  const {repoUrl, rawBase, repoBase, ref, srcDir, dstDir} = opts;
  console.log(`→ mirror ${srcDir} → ${dstDir}`);

  const dstAbs = join(REPO_ROOT, dstDir);
  if (existsSync(dstAbs)) {
    rmSync(dstAbs, {recursive: true, force: true});
  }
  mkdirSync(dstAbs, {recursive: true});

  const files = await walkMonorepoDir(repoUrl, ref, srcDir);
  if (files.length === 0) {
    throw new Error(`mirror source ${srcDir} returned 0 files — refusing to leave ${dstDir} empty`);
  }
  for (const f of files) {
    const rel = posix.relative(srcDir, f);
    const dstAbsFile = join(dstAbs, rel);
    await syncFile({rawBase, repoBase, ref, srcPath: f, dstAbs: dstAbsFile});
  }
  console.log(`  ✓ ${files.length} files`);
  return files.length;
}

async function syncFileEntry(opts: {
  rawBase: string;
  repoBase: string;
  ref: string;
  entry: SiteFile;
}): Promise<void> {
  const {rawBase, repoBase, ref, entry} = opts;
  console.log(`→ file   ${entry.src} → ${entry.dst}`);
  const dstAbs = join(REPO_ROOT, entry.dst);
  await syncFile({rawBase, repoBase, ref, srcPath: entry.src, dstAbs});
}

async function main(): Promise<void> {
  const sources = loadSources(REPO_ROOT);
  const repo = sources.monorepo;
  const ref = repo.ref ?? 'main';
  const site = repo.site;
  if (!site || ((site.mirror ?? []).length === 0 && (site.files ?? []).length === 0)) {
    console.log('No monorepo.site entries in sources.yaml — nothing to sync.');
    return;
  }

  const rawBase = rawGithubBase(repo.url, ref);
  const repoBase = repo.url.replace(/\.git$/, '').replace(/\/$/, '');

  let totalFiles = 0;
  for (const m of (site.mirror ?? []) as SiteMirror[]) {
    totalFiles += await mirrorDir({
      repoUrl: repo.url,
      rawBase,
      repoBase,
      ref,
      srcDir: m.src,
      dstDir: m.dst,
    });
  }
  for (const f of (site.files ?? []) as SiteFile[]) {
    await syncFileEntry({rawBase, repoBase, ref, entry: f});
    totalFiles += 1;
  }

  const sourceDesc = LOCAL_MONOREPO ? `local ${LOCAL_MONOREPO}` : `${repo.url}@${ref}`;
  console.log(`\nDone. ${totalFiles} files synced from ${sourceDesc}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
