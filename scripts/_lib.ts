import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import yaml from 'js-yaml';

export type AddonSource = {name: string; url: string; ref?: string};
export type MonorepoSource = {url: string; ref?: string; adrs?: {glob: string}};
export type Sources = {monorepo: MonorepoSource; addons: AddonSource[]};

export function loadSources(repoRoot: string): Sources {
  const raw = readFileSync(join(repoRoot, 'sources.yaml'), 'utf8');
  return yaml.load(raw) as Sources;
}

export function rawGithubBase(repoUrl: string, ref: string): string {
  // https://github.com/org/repo  →  https://raw.githubusercontent.com/org/repo/<ref>
  const m = repoUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) throw new Error(`Cannot parse GitHub URL: ${repoUrl}`);
  return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${ref}`;
}

export async function fetchText(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return res.text();
}

/**
 * Sanitize a foreign README so it renders cleanly inside Docusaurus.
 *  - strip a leading `# Title` (Docusaurus injects one from frontmatter)
 *  - rewrite relative links/images to absolute GitHub URLs
 *  - escape MDX-hostile sequences (rare; addon READMEs use plain Markdown)
 */
export function transformReadme(body: string, sourceRawBase: string, sourceRepoBase: string): string {
  let out = body;

  // Strip the first H1 if present — frontmatter title is canonical.
  out = out.replace(/^\s*#\s+.+?\n+/, '');

  // Rewrite relative image refs:  ![alt](docs/foo.png)  →  absolute raw GitHub URL
  out = out.replace(/!\[([^\]]*)\]\((?!https?:|\/)([^)\s]+)\)/g, (_, alt, path) => `![${alt}](${sourceRawBase}/${path})`);

  // Rewrite relative links:  [text](path/to.md)  →  GitHub blob URL (keeps anchors intact)
  out = out.replace(/\[([^\]]+)\]\((?!https?:|#|\/)([^)\s]+)\)/g, (_, text, path) => `[${text}](${sourceRepoBase}/blob/HEAD/${path})`);

  return out;
}
