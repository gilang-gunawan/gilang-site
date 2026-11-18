import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Builds the site against the fixture content and checks the output HTML.
// The build runs in a temporary copy of the project: Astro rewrites `.astro/` and
// `src/lib/knowledge-generated.ts` on every build, which would break a running
// `astro dev` in the real checkout.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureContent = path.join(root, 'tests', 'fixtures', 'content');
const projectFiles = ['astro.config.mjs', 'package.json', 'tsconfig.json', 'src', 'scripts', 'public'];

let workDir;
let outDir;

function read(...parts) {
  return fs.readFileSync(path.join(outDir, ...parts), 'utf-8');
}

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

beforeAll(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gilang-site-build-'));
  for (const name of projectFiles) {
    fs.cpSync(path.join(root, name), path.join(workDir, name), {
      recursive: true,
      // The real content submodule is replaced by LOCAL_CONTENT_PATH.
      filter: (src) => !src.startsWith(path.join(root, 'src', 'content') + path.sep),
    });
  }
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(workDir, 'node_modules'), 'dir');
  // node_modules is shared, so give the copy its own Astro/Vite cache.
  fs.writeFileSync(
    path.join(workDir, 'astro.test.config.mjs'),
    "import config from './astro.config.mjs';\nexport default { ...config, cacheDir: './.cache' };\n",
  );

  outDir = path.join(workDir, 'dist');
  execFileSync('npx', ['astro', 'build', '--config', 'astro.test.config.mjs'], {
    cwd: workDir,
    env: { ...process.env, LOCAL_CONTENT_PATH: fixtureContent },
    stdio: 'pipe',
  });
}, 180_000);

afterAll(() => {
  if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
});

describe('home page', () => {
  it('shows the highlights from home.mdx', () => {
    const html = read('index.html');
    expect(html).toContain('1 week to 5 min');
    expect(html).toContain('fixture reporting metric');
  });

  it('has the CV download, email, and case study links', () => {
    const html = read('index.html');
    expect(html).toContain('Download CV');
    expect(html).toContain('mailto:hello@example.com');
    expect(html).toContain('href="/projects"');
  });

  it('uses the tagline from site.json', () => {
    expect(read('index.html')).toContain('Test engineer · Fixture site');
  });
});

describe('projects', () => {
  it('builds a page for every published project and none for drafts', () => {
    for (const id of ['plain-project', 'featured-early', 'featured-late']) {
      expect(fs.existsSync(path.join(outDir, 'projects', id, 'index.html'))).toBe(true);
    }
    expect(fs.existsSync(path.join(outDir, 'projects', 'draft-project'))).toBe(false);
  });

  it('uses linkLabel for the external link when set', () => {
    expect(read('projects', 'featured-late', 'index.html')).toContain('Programme info');
  });
});

describe('blog', () => {
  it('leaves draft posts out', () => {
    expect(fs.existsSync(path.join(outDir, 'blog', 'draft-post'))).toBe(false);
    expect(read('blog', 'index.html')).not.toContain('Draft Post');
  });
});

describe('every page', () => {
  it('has a title without an em dash', () => {
    const pages = htmlFiles(outDir);
    expect(pages.length).toBeGreaterThan(5);
    for (const file of pages) {
      const title = fs.readFileSync(file, 'utf-8').match(/<title>([^<]*)<\/title>/)?.[1];
      if (title === undefined) continue;
      expect(title, path.relative(outDir, file)).not.toContain('—');
    }
  });
});
