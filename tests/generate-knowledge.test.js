import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fixtureContent = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'content');

// The script reads LOCAL_CONTENT_PATH once at import time, so each test points it
// at a content folder and re-imports the module.
async function loadScript(contentPath) {
  vi.stubEnv('LOCAL_CONTENT_PATH', contentPath);
  vi.resetModules();
  return import('../scripts/generate-knowledge.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('generateChatSuggestions', () => {
  it('lists featured projects first, by order, and skips drafts', async () => {
    const { generateChatSuggestions } = await loadScript(fixtureContent);
    const titles = generateChatSuggestions().map((s) => s.title);

    expect(titles.slice(4, 6)).toEqual(['Featured Early', 'Featured Late']);
    expect(titles).not.toContain('Draft Project');
    expect(titles).not.toContain('Plain Project');
  });

  it('suggests the latest published post, not the newest draft', async () => {
    const { generateChatSuggestions } = await loadScript(fixtureContent);
    const titles = generateChatSuggestions().map((s) => s.title);

    expect(titles).toContain('Newer Post');
    expect(titles).not.toContain('Older Post');
    expect(titles).not.toContain('Draft Post');
  });

  it('starts with the recruiter cards and ends with contact', async () => {
    const { generateChatSuggestions } = await loadScript(fixtureContent);
    const suggestions = generateChatSuggestions();

    expect(suggestions.slice(0, 4).map((s) => s.title)).toEqual([
      'Experience & Background',
      'Availability & Opportunities',
      'Tech Stack & Skills',
      'Key Achievements',
    ]);
    expect(suggestions.at(-1)?.title).toBe('Contact & Opportunities');
    expect(suggestions.at(-1)?.prompt).toContain('Test Person');
  });

  it('writes prompts without em dashes', async () => {
    const { generateChatSuggestions } = await loadScript(fixtureContent);
    for (const s of generateChatSuggestions()) {
      expect(s.prompt).not.toContain('—');
    }
  });
});

describe('generateKnowledge', () => {
  it('includes published content and leaves drafts out', async () => {
    const { generateKnowledge } = await loadScript(fixtureContent);
    const knowledge = generateKnowledge();

    expect(knowledge).toContain('Featured Early');
    expect(knowledge).toContain('Newer Post');
    expect(knowledge).not.toContain('Draft Project');
    expect(knowledge).not.toContain('Draft Post');
  });
});

describe('buildKnowledgeFile', () => {
  it('writes a valid empty stub when there is no content', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-'));
    const emptyContent = path.join(root, 'empty-content');
    fs.mkdirSync(emptyContent);
    fs.mkdirSync(path.join(root, 'src', 'lib'), { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const { buildKnowledgeFile } = await loadScript(emptyContent);
    buildKnowledgeFile(root);

    const output = fs.readFileSync(path.join(root, 'src', 'lib', 'knowledge-generated.ts'), 'utf-8');
    expect(output).toContain('export const DYNAMIC_KNOWLEDGE = "";');
    expect(output).toContain('= [];');

    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });
});
