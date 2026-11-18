// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
const LOCAL_CONTENT_PATH = env.LOCAL_CONTENT_PATH;

/**
 * Strips MDX/JSX tags and normalizes markdown text for AI context ingestion
 * @param {string} content
 * @returns {string}
 */
function cleanMdxContent(content) {
  // Remove YAML frontmatter
  let clean = content.replace(/^---[\s\S]*?---\n*/, '');

  // Remove JSX/HTML tags while keeping text inside if any
  clean = clean.replace(/<img[^>]*>/gi, '');
  clean = clean.replace(/<\/?(div|span|section|article|p)[^>]*>/gi, '');
  clean = clean.replace(/<[A-Z][A-Za-z0-9]*[^>]*\/>/g, ''); // Self-closing JSX components
  clean = clean.replace(/<[A-Z][A-Za-z0-9]*[^>]*>[\s\S]*?<\/[A-Z][A-Za-z0-9]*>/g, ''); // Wrapped JSX components

  // Normalize excessive blank lines
  clean = clean.replace(/\n{3,}/g, '\n\n').trim();
  return clean;
}

/**
 * Parses frontmatter fields into key-value pairs
 * @param {string} rawContent
 * @returns {{ data: Record<string, any>, body: string }}
 */
function parseFrontmatter(rawContent) {
  const match = rawContent.match(/^---([\s\S]*?)---\n*([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: rawContent };
  }

  const yamlBlock = match[1];
  const body = match[2];
  /** @type {Record<string, any>} */
  const data = {};

  const lines = yamlBlock.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();

      // Clean quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Arrays e.g. ["Go", "Next.js"]
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          data[key] = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          data[key] = value;
        }
      } else if (value === 'true') {
        data[key] = true;
      } else if (value === 'false') {
        data[key] = false;
      } else {
        data[key] = value;
      }
    }
  }

  return { data, body };
}

/**
 * Category icon map for suggestion cards
 * @type {Record<string, string>}
 */
const CATEGORY_ICONS = {
  'government': '🏛️',
  'international development': '🌍',
  'side project': '🚀',
  'personal project': '💻',
  'open source': '🔓',
  'enterprise': '🏢',
  'startup': '⚡',
};

/**
 * Generates dynamic chat suggestions from content collections.
 * Always leads with 4 static HR-persona cards (useful for recruiters and hiring managers),
 * followed by up to 2 dynamic project/blog cards, then a contact card.
 * @param {string} rootDir
 * @returns {Array<{icon: string, title: string, prompt: string}>}
 */
export function generateChatSuggestions(rootDir = process.cwd()) {
  const contentDir = LOCAL_CONTENT_PATH || path.join(rootDir, 'src', 'content');
  const siteJsonPath = path.join(contentDir, 'config', 'site.json');

  /** @type {{ name?: string }} */
  const site = fs.existsSync(siteJsonPath) ? JSON.parse(fs.readFileSync(siteJsonPath, 'utf-8')) : {};
  const ownerName = site.name || 'the site owner';

  /** @type {Array<{icon: string, title: string, prompt: string}>} */
  const suggestions = [];

  // 1. Static HR-persona suggestions — always shown first regardless of content.
  //    These surface the hiring-critical information recruiters and hiring managers need.
  suggestions.push(
    {
      icon: '👤',
      title: 'Experience & Background',
      prompt: `What is ${ownerName}'s professional background, total years of experience, and the types of systems they have built?`,
    },
    {
      icon: '💼',
      title: 'Availability & Opportunities',
      prompt: `Is ${ownerName} currently open to new opportunities? What types of roles and work arrangements are they considering?`,
    },
    {
      icon: '🛠️',
      title: 'Tech Stack & Skills',
      prompt: `What are ${ownerName}'s core technical skills, programming languages, and primary frameworks?`,
    },
    {
      icon: '🏆',
      title: 'Key Achievements',
      prompt: `What are ${ownerName}'s most impactful professional achievements and measurable results?`,
    }
  );

  // 2. Dynamic project-derived suggestions (up to 2, as supporting detail)
  const projectsDir = path.join(contentDir, 'projects');
  if (fs.existsSync(projectsDir)) {
    // Same priority as the home page: featured first, then by `order`.
    const projects = fs
      .readdirSync(projectsDir)
      .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
      .map((f) => parseFrontmatter(fs.readFileSync(path.join(projectsDir, f), 'utf-8')).data)
      .filter((data) => !data.draft)
      .sort((a, b) => (b.featured === true) - (a.featured === true) || (Number(a.order) || 999) - (Number(b.order) || 999));
    let added = 0;
    for (const data of projects) {
      if (added >= 2) break;

      const catKey = (data.category || '').toLowerCase();
      const icon = CATEGORY_ICONS[catKey] || '🚀';
      suggestions.push({
        icon,
        title: data.title,
        prompt: `Tell me about the ${data.title} project: what was built, what technical challenges were solved, and what the impact was.`,
      });
      added++;
    }
  }

  // 3. Dynamic blog-derived suggestions (up to 1)
  const blogDir = path.join(contentDir, 'blog');
  if (fs.existsSync(blogDir)) {
    // Latest post by date, not directory order.
    const posts = fs
      .readdirSync(blogDir)
      .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
      .map((f) => parseFrontmatter(fs.readFileSync(path.join(blogDir, f), 'utf-8')).data)
      .filter((data) => !data.draft)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    for (const data of posts) {

      suggestions.push({
        icon: '✍️',
        title: data.title,
        prompt: `Can you summarize the blog post "${data.title}" and the key takeaways from it?`,
      });
      break; // only 1 blog suggestion
    }
  }

  // 4. Always append contact/opportunities card last
  suggestions.push({
    icon: '📬',
    title: 'Contact & Opportunities',
    prompt: `How can I get in touch with ${ownerName} for work opportunities, contracts, or consultations?`,
  });

  return suggestions;
}

/**
 * Generates the unified knowledge string from all active content files
 * @param {string} rootDir
 * @returns {string}
 */
export function generateKnowledge(rootDir = process.cwd()) {
  const contentDir = LOCAL_CONTENT_PATH || path.join(rootDir, 'src', 'content');
  let output = `# COMPREHENSIVE KNOWLEDGE BASE\n\n`;
  output += `> Automatically synchronized from content files at build time.\n\n`;

  // 1. Pages (About, Resume, etc.)
  const pagesDir = path.join(contentDir, 'pages');
  if (fs.existsSync(pagesDir)) {
    output += `## Core Pages & Profile\n\n`;
    const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    for (const file of files) {
      const filePath = path.join(pagesDir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data, body } = parseFrontmatter(raw);
      const cleanBody = cleanMdxContent(body);

      output += `### Page: ${data.title || file}\n`;
      if (data.description) output += `*Description:* ${data.description}\n\n`;
      output += `${cleanBody}\n\n---\n\n`;
    }
  }

  // 2. Projects
  const projectsDir = path.join(contentDir, 'projects');
  if (fs.existsSync(projectsDir)) {
    output += `## Projects & Portfolio\n\n`;
    const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    for (const file of files) {
      const filePath = path.join(projectsDir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data, body } = parseFrontmatter(raw);
      if (data.draft) continue;

      const cleanBody = cleanMdxContent(body);

      output += `### Project: ${data.title || file}\n`;
      if (data.description) output += `*Description:* ${data.description}\n`;
      if (data.category) output += `*Category:* ${data.category}\n`;
      if (data.tags && Array.isArray(data.tags)) output += `*Tech Stack / Tags:* ${data.tags.join(', ')}\n`;
      if (data.link) output += `*Live Link / Reference:* ${data.link}\n`;
      output += `\n${cleanBody}\n\n---\n\n`;
    }
  }

  // 3. Blog Articles
  const blogDir = path.join(contentDir, 'blog');
  if (fs.existsSync(blogDir)) {
    output += `## Blog Posts & Writings\n\n`;
    const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    for (const file of files) {
      const filePath = path.join(blogDir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data, body } = parseFrontmatter(raw);
      if (data.draft) continue;

      const cleanBody = cleanMdxContent(body);

      output += `### Article: ${data.title || file}\n`;
      if (data.date) output += `*Published Date:* ${data.date}\n`;
      if (data.description) output += `*Summary:* ${data.description}\n`;
      if (data.tags && Array.isArray(data.tags)) output += `*Topics / Tags:* ${data.tags.join(', ')}\n`;
      output += `\n${cleanBody}\n\n---\n\n`;
    }
  }

  return output;
}

/**
 * Generates and saves knowledge-generated.ts with both knowledge and chat suggestions
 * @param {string} rootDir
 */
export function buildKnowledgeFile(rootDir = process.cwd()) {
  const contentDir = LOCAL_CONTENT_PATH || path.join(rootDir, 'src', 'content');
  const hasContent = fs.existsSync(contentDir) &&
    ['pages', 'projects', 'blog'].some((sub) => {
      const dir = path.join(contentDir, sub);
      return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    });

  const knowledgeString = hasContent ? generateKnowledge(rootDir) : '';
  const suggestions = hasContent ? generateChatSuggestions(rootDir) : [];

  const targetFile = path.join(rootDir, 'src', 'lib', 'knowledge-generated.ts');

  // Write a valid stub even when empty so fresh clones compile without errors.
  const fileContent = `// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Generated from src/content at build/install time.
// Add your content to src/content/pages, src/content/projects, src/content/blog
// and run \`npm run build\` or \`npm install\` to regenerate.

export const DYNAMIC_KNOWLEDGE = ${JSON.stringify(knowledgeString)};

export const DYNAMIC_CHAT_SUGGESTIONS: Array<{ icon: string; title: string; prompt: string }> = ${JSON.stringify(suggestions, null, 2)};
`;

  fs.writeFileSync(targetFile, fileContent, 'utf-8');

  if (hasContent) {
    console.log(`[knowledge-sync] Compiled knowledge + ${suggestions.length} chat suggestions → ${path.relative(rootDir, targetFile)}`);
  } else {
    console.log(`[knowledge-sync] No content found. Empty stub written → ${path.relative(rootDir, targetFile)}`);
    console.log(`[knowledge-sync] Add your content to src/content/ then run npm run build.`);
  }
}

// Run directly if called as a script
if (process.argv[1] && process.argv[1].endsWith('generate-knowledge.js')) {
  buildKnowledgeFile();
}
