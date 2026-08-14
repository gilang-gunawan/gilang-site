import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import site from '../content/config/site.json';

// llms.txt: a plain-Markdown map of the site for LLM/AI crawlers, analogous
// to robots.txt for classic crawlers. See https://llmstxt.org/
export async function GET(context: APIContext) {
  const siteUrl = (context.site ?? new URL(site.url)).href.replace(/\/$/, '');

  const projects = (await getCollection('projects', ({ data }) => !data.draft)).sort(
    (a, b) => (a.data.order ?? 999) - (b.data.order ?? 999),
  );
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  const lines: string[] = [];
  lines.push(`# ${site.name}`);
  lines.push('');
  lines.push(`> ${site.description}`);
  lines.push('');
  lines.push('## Pages');
  lines.push(`- [Home](${siteUrl}/): ${site.tagline}`);
  lines.push(`- [About](${siteUrl}/about)`);
  lines.push(`- [Resume](${siteUrl}/resume)`);
  lines.push(`- [Projects](${siteUrl}/projects): Index of all projects.`);
  lines.push(`- [Blog](${siteUrl}/blog): Index of all writing.`);

  if (projects.length > 0) {
    lines.push('');
    lines.push('## Projects');
    for (const project of projects) {
      lines.push(`- [${project.data.title}](${siteUrl}/projects/${project.id}): ${project.data.description}`);
    }
  }

  if (posts.length > 0) {
    lines.push('');
    lines.push('## Blog');
    for (const post of posts) {
      lines.push(`- [${post.data.title}](${siteUrl}/blog/${post.id}): ${post.data.description}`);
    }
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
