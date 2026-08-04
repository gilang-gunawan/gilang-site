# gilang.web.id

[![License](https://img.shields.io/github/license/gilang-gunawan/gilang-site)](LICENSE)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro-ff5a03?logo=astro&logoColor=white)](https://astro.build)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/deployed%20on-Cloudflare%20Pages-f38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)

Source code for my personal website and blog at [gilang.web.id](https://gilang.web.id).

Built with Astro for static generation, Tailwind CSS for styling, and MDX for content. Deployed on Cloudflare Pages. Content lives in a separate submodule so I can update posts without touching the site code.

## Tech Stack

| Layer       | Technology                            |
| ----------- | ------------------------------------- |
| Framework   | [Astro](https://astro.build) v7       |
| Styling     | [Tailwind CSS](https://tailwindcss.com) v4 |
| Content     | MDX via `@astrojs/mdx`                |
| Deployment  | [Cloudflare Pages](https://pages.cloudflare.com) via Wrangler |
| Runtime     | Node.js ≥ 22.12                       |

## Repository Structure

This repo uses a **Git submodule** to separate site code from content. The `src/content/` directory is a submodule pointing to a separate private repository (`gilang-content`).

```
gilang-site/                   ← this repo (site code)
├── src/
│   ├── components/            ← UI components (.astro)
│   ├── layouts/               ← page layouts
│   ├── pages/                 ← Astro file-based routing
│   ├── styles/                ← global CSS
│   ├── site.config.ts         ← social links & contact config
│   ├── content.config.ts      ← content collection schemas (Zod)
│   └── content/               ← git submodule → gilang-content
│       ├── blog/              ← blog posts (.mdx)
│       ├── pages/             ← page copy: home, about, resume (.mdx)
│       ├── projects/          ← project write-ups (.mdx)
│       ├── assets/            ← images and PDFs used in content
│       └── config/
│           └── site.json      ← site metadata & contact details
├── public/                    ← static assets (favicon, etc.)
├── astro.config.mjs
├── wrangler.jsonc             ← Cloudflare Pages deployment config
└── package.json
```

## Content Collections

Content is managed through [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) with Zod schemas for type safety.

### `blog/`

Blog posts written in MDX. Required frontmatter:

```yaml
---
title: "Post Title"
description: "A short summary shown in listings and meta tags."
date: "2026-07-27"
tags: ["tag-one", "tag-two"]   # optional
draft: false                    # optional, defaults to false
---
```

### `projects/`

Project write-ups. Required frontmatter:

```yaml
---
title: "Project Name"
description: "Short description."
date: "2026-07-26"
category: "Personal Project"
tags: ["Astro", "TypeScript"]   # optional
featured: true                  # optional, highlights on projects page
link: "https://example.com"     # optional, live URL
sourceCode: "https://github.com/..." # optional
draft: false                    # optional, defaults to false
---
```

### `pages/`

Page copy for `home.mdx`, `about.mdx`, and `resume.mdx`. Required frontmatter:

```yaml
---
title: "Page Title"
description: "Optional meta description."
---
```

### `config/site.json`

Controls site metadata and social links displayed across the site:

```json
{
  "name": "Your Name",
  "tagline": "Your tagline",
  "description": "Short bio shown on home and meta tags.",
  "url": "https://yoursite.com",
  "contact": {
    "email": "hello@yoursite.com",
    "github": "https://github.com/yourusername",
    "linkedin": "https://linkedin.com/in/yourusername",
    "bluesky": "",
    "instagram": "",
    "x": "",
    "facebook": "",
    "threads": ""
  }
}
```

Leave any social field as an empty string `""` to hide it from the site.

## AI Assistant

This website includes a dedicated AI Assistant page (`/chat`) that acts as a natural language interface to the site's content, allowing visitors to ask questions about the owner's portfolio, articles, and work experience.

### Grounding & Dynamic Pipeline

The assistant is strictly grounded to avoid hallucinations and is designed to be fully customizable for forks/clones:

*   **Zero-Config Knowledge & Suggestions Sync:** A node script (`scripts/generate-knowledge.js`) runs at build time to parse files under `src/content/`. It extracts text for RAG (Retrieval-Augmented Generation) and dynamically generates contextual chat suggestions based on current projects and blog posts.
*   **Git-Clean Design:** The generated output (`src/lib/knowledge-generated.ts`) containing the personal content database is excluded from git tracking (`.gitignore`).
*   **Forker-Friendly Installation:** A `postinstall` script runs the generator automatically during `npm install`. If the `src/content/` folder is empty (e.g., in a fresh clone), it gracefully writes a valid empty stub so the codebase compiles and builds out-of-the-box without TypeScript compiler errors.
*   **Site Configuration Integration:** The system prompt and assistant responses adapt dynamically to the identity values defined in `src/content/config/site.json`.

### Setup & Credentials

To enable the assistant, you need to provide a Gemini API Key:

1.  **Local Development:**
    *   Create a `.env` file in the root directory:
        ```env
        GEMINI_API_KEY=your_gemini_api_key_here
        ```
    *   Restart the development server. If no key is set, the chat UI falls back gracefully to a prompt inviting you to read the resume/projects pages.
2.  **Production Deployment:**
    *   Add `GEMINI_API_KEY` to your environment variables in the Cloudflare Pages dashboard under **Settings → Environment variables** (for both preview and production environments).


## Local Development

> [!IMPORTANT]
> The original `src/content` submodule is a **private repository**. When cloning this repository, do **not** use `--recurse-submodules` as it will fail due to lack of permissions. Follow the instructions below to set up your own content directory.

### 1. Clone the repository

Clone the site code directly without submodules:

```bash
git clone https://github.com/gilang-gunawan/gilang-site.git
cd gilang-site
```

### 2. Initialize your own content

Since the original content repo is private, you need to create your own content structure. There are two ways to do this:

**Option A (Using `LOCAL_CONTENT_PATH` - Recommended):**
Instead of modifying the submodule structure, point the site to a different content directory on your local machine using an environment variable.
1. Create a `.env` file in the project root and set `LOCAL_CONTENT_PATH`:
   ```env
   LOCAL_CONTENT_PATH="/absolute/path/to/your/content/folder"
   ```
2. Ensure that folder has the necessary structure (`blog`, `pages`, `projects`, `config`, `assets`).
3. Create your site config at `config/site.json` inside that folder following the [schema below](#configsitejson).

**Option B (Stripping the submodule):**
If you prefer to put your content directly inside the repo:
1. Deinit the private submodule configuration so Git ignores it:
   ```bash
   git submodule deinit -f src/content
   git rm -f src/content
   rm -rf .git/modules/src/content
   ```
2. Create the directories:
   ```bash
   mkdir -p src/content/blog src/content/pages src/content/projects src/content/config src/content/assets
   ```
3. Create your site config at `src/content/config/site.json` following the [schema below](#configsitejson).

### 3. Install dependencies & build stubs

```bash
npm install
```
*Note: Running `npm install` automatically triggers the postinstall sync script (`scripts/generate-knowledge.js`) which generates the TypeScript interfaces for the AI chat based on your local content.*

### 4. Start the dev server

```bash
npm run dev
```

The site will be available at `http://localhost:4321`.

### Available scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start local dev server               |
| `npm run build`     | Build production output to `dist/`   |
| `npm run preview`   | Preview the production build locally |

## Forking

Want to use this repository as a template for your own portfolio? Follow these steps to hook it up to your own content.

### Option A — Use a local content directory (Recommended)

Follow step 2 in [Local Development](#2-initialize-your-own-content) to configure `LOCAL_CONTENT_PATH` or to strip the private submodule reference and create a local `src/content` directory. Either method allows you to easily manage your personal website's content.

### Option B — Use your own content submodule

If you prefer to separate your content from your site code:
1. Create a new public or private repository on GitHub (e.g., `my-content`).
2. Update `.gitmodules` in your forked site repo:
   ```ini
   [submodule "src/content"]
       path = src/content
       url = https://github.com/yourusername/my-content.git
   ```
3. Run `git submodule sync && git submodule update --init` to link it.
4. Populate your content repo using the schemas described above.

## Deployment

The site deploys to **Cloudflare Pages** on every push to `main`. The build produces a static `dist/` folder served from Cloudflare's edge network.

To deploy your own fork:

1. Sign up at [Cloudflare](https://dash.cloudflare.com/sign-up) (free).
2. Go to **Workers & Pages → Create → Pages → Connect to Git**.
3. Select your forked repository.
4. Set build command to `npm run build` and output directory to `dist`. Cloudflare auto-detects Astro.
5. Click **Deploy**.

Every subsequent push to `main` triggers an automatic rebuild.

## License

[MIT](LICENSE) — feel free to learn from the code. Please use your own design and content if you fork it.
