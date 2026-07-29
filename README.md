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

## Local Development

### 1. Clone with submodule

```bash
git clone --recurse-submodules https://github.com/gilang-gunawan/gilang-site.git
cd gilang-site
```

If you already cloned without the flag:

```bash
git submodule update --init --recursive
```

> **Note:** The `src/content` submodule points to a private repository. If you're forking this project, you'll need to either create your own content repo and update `.gitmodules`, or remove the submodule and add a `src/content/` directory manually (see [Forking](#forking) below).

### 2. Install dependencies

```bash
npm install
```

### 3. Start the dev server

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

Want to use this as a starting point for your own site? Here's how to set it up with your own content.

### Option A — Use your own content submodule

1. Fork this repo on GitHub.
2. Create a new repo for your content (e.g., `your-content`).
3. Update `.gitmodules` to point to your content repo:
   ```ini
   [submodule "src/content"]
       path = src/content
       url = https://github.com/yourusername/your-content.git
   ```
4. Run `git submodule sync && git submodule update --init` to re-link it.
5. Populate your content repo using the frontmatter schemas described above.

### Option B — Drop the submodule, use a local content directory

1. Fork this repo.
2. Remove the submodule:
   ```bash
   git submodule deinit -f src/content
   git rm -f src/content
   rm -rf .git/modules/src/content
   ```
3. Create `src/content/` manually and add your own `blog/`, `pages/`, `projects/`, and `config/site.json` following the schemas above.

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
