import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { loadEnv } from "vite";

// Load environment variables manually since this file is loaded very early
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
const contentBase = env.LOCAL_CONTENT_PATH || "./src/content";

// ── Blog collection ────────────────────────────────────────────────────────
// Source: src/content/blog/
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: `${contentBase}/blog` }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(false),
  }),
});

// ── Projects collection ────────────────────────────────────────────────────
// Source: src/content/projects/
const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: `${contentBase}/projects` }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date().optional(),
    order: z.number().optional(),
    category: z.string(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    link: z.string().url().optional(),
    sourceCode: z.string().url().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

// ── Pages collection ───────────────────────────────────────────────────────
// Source: src/content/pages/
// Covers: home, about, resume
const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: `${contentBase}/pages` }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { blog, pages, projects };
