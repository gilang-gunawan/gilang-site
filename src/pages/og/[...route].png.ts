import { html } from 'satori-html';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getCollection } from 'astro:content';
import fs from 'node:fs/promises';
import path from 'node:path';

// Define the paths we want to generate OG images for
export async function getStaticPaths() {
  const blogPosts = await getCollection('blog');
  const projectPosts = await getCollection('projects');

  const paths = [
    { params: { route: 'home' }, props: { title: 'Gilang Gunawan', subtitle: 'Full-stack software engineer' } },
    { params: { route: 'blog' }, props: { title: 'Blog', subtitle: 'Articles, tutorials, and brain dumps.' } },
    { params: { route: 'projects' }, props: { title: 'Projects', subtitle: 'A selection of my recent work.' } },
    { params: { route: 'resume' }, props: { title: 'Resume', subtitle: 'My professional experience and skills.' } },
  ];

  blogPosts.forEach((post) => {
    paths.push({
      params: { route: `blog/${post.id}` },
      props: { title: post.data.title, subtitle: 'Blog Post' },
    });
  });

  projectPosts.forEach((project) => {
    paths.push({
      params: { route: `projects/${project.id}` },
      props: { title: project.data.title, subtitle: 'Project' },
    });
  });

  return paths;
}

export async function GET({ props }: { props: { title: string; subtitle: string } }) {
  const { title, subtitle } = props;

  // Load fonts
  const fontRegularPath = path.join(process.cwd(), 'node_modules/@fontsource/outfit/files/outfit-latin-400-normal.woff');
  const fontSemiBoldPath = path.join(process.cwd(), 'node_modules/@fontsource/outfit/files/outfit-latin-600-normal.woff');
  
  const fontRegular = await fs.readFile(fontRegularPath);
  const fontSemiBold = await fs.readFile(fontSemiBoldPath);

  const markup = html`
    <div
      style="
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background-color: #1c1c20;
        font-family: 'Outfit';
        padding: 80px;
        color: #fbfbfb;
      "
    >
      <!-- Background pattern / glow -->
      <div style="display: flex; position: absolute; top: -150px; right: -150px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(165, 180, 252, 0.15) 0%, transparent 70%); border-radius: 50%;"></div>
      
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: flex-start; gap: 20px;">
        <div style="display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; background-color: #171717; border-radius: 18px; color: #fafafa; font-size: 38px; font-weight: 600; padding-bottom: 4px;">
          GG
        </div>
        <span style="font-size: 32px; font-weight: 600; color: #a5b4fc;">gilang.web.id</span>
      </div>

      <!-- Main Content -->
      <div style="display: flex; flex-direction: column; margin-top: auto; margin-bottom: auto; max-width: 900px;">
        <span style="font-size: 36px; font-weight: 400; color: #a1a1a8; margin-bottom: 24px;">${subtitle}</span>
        <h1 style="display: flex; font-size: 72px; font-weight: 600; line-height: 1.1; margin: 0; color: #fbfbfb; letter-spacing: -1px;">
          ${title}
        </h1>
      </div>

      <!-- Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #323239; padding-top: 40px; width: 100%;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="font-size: 28px; font-weight: 600; color: #e4e4e7;">Gilang Gunawan</span>
          <span style="font-size: 28px; color: #a1a1a8;">·</span>
          <span style="font-size: 28px; font-weight: 400; color: #a1a1a8;">Full-stack engineer</span>
        </div>
        <div style="display: flex; align-items: center;">
          <span style="font-size: 28px; font-weight: 600; color: #a5b4fc;">gilang.web.id</span>
        </div>
      </div>
    </div>
  `;

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Outfit',
        data: fontRegular,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Outfit',
        data: fontSemiBold,
        weight: 600,
        style: 'normal',
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(new Uint8Array(pngBuffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
