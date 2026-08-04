import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// ── Blog collection ────────────────────────────────────────────────────────
// Source: src/content/blog/
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
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
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
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
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { blog, pages, projects };
