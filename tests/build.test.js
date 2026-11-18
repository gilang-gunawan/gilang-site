import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Builds the real site against the fixture content and checks the output HTML.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureContent = path.join(root, 'tests', 'fixtures', 'content');
const knowledgeFile = path.join(root, 'src', 'lib', 'knowledge-generated.ts');

let outDir;
let savedKnowledge;

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
  // The build regenerates the chat knowledge file from the fixtures; keep the real one.
  savedKnowledge = fs.existsSync(knowledgeFile) ? fs.readFileSync(knowledgeFile, 'utf-8') : undefined;
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gilang-site-build-'));
  execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
    cwd: root,
    env: { ...process.env, LOCAL_CONTENT_PATH: fixtureContent },
    stdio: 'pipe',
  });
}, 180_000);

afterAll(() => {
  if (savedKnowledge !== undefined) fs.writeFileSync(knowledgeFile, savedKnowledge, 'utf-8');
  if (outDir) fs.rmSync(outDir, { recursive: true, force: true });
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
