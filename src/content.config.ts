import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// ── Blog collection ────────────────────────────────────────────────────────
// Source: content/ submodule → gilang-content/blog/
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

// ── Pages collection ───────────────────────────────────────────────────────
// Source: content/ submodule → gilang-content/pages/
// Covers: home, about, resume
const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // home.mdx structured data
    links: z
      .array(z.object({ label: z.string(), href: z.string() }))
      .optional(),
    currently: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .optional(),
    // about.mdx skills
    skills: z
      .array(z.object({ category: z.string(), items: z.string() }))
      .optional(),
  }),
});

export const collections = { blog, pages };
