# Gilang Gunawan's Personal Website

![License](https://img.shields.io/github/license/gilang-gunawan/gilang-site)
![Astro](https://img.shields.io/badge/built%20with-Astro-ff5a03?style=flat&logo=astro)

Welcome to the source code of my personal website and blog. 
Built with [Astro](https://astro.build/) for optimal performance and static generation.

## 🚀 Features

- **Minimalist Design**: Clean, content-focused layout.
- **MDX Support**: Blog posts and pages are written in MDX.
- **Fast**: Ships with zero client-side JavaScript by default.
- **Responsive**: Mobile-first design that looks great on any device.

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build/)
- **Styling**: Vanilla CSS
- **Deployment**: Vercel / Netlify / GitHub Pages

## 💻 Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/gilang-gunawan/gilang-site.git
   cd gilang-site
   git submodule update --init --recursive
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   The site will be available at `http://localhost:4321`.

## 📂 Project Structure

```text
/
├── public/           # Static assets (images, fonts, etc.)
├── src/
│   ├── components/   # UI components
│   ├── content/      # MDX content (pages, blog)
│   ├── layouts/      # Page layouts
│   └── pages/        # Astro routing
└── package.json
```

## 📜 License

This project is open-sourced under the [MIT License](LICENSE). Feel free to learn from the code, but please create your own unique design and content if you plan to fork it!
