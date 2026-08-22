import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VIDEO_PAGES } from './video-pages.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(scriptDirectory, '../public/sitemap-video.xml');
const siteUrl = 'https://trailreplay.com';

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderVideo({ title, description, thumbnailUrl, contentUrl, durationSeconds }) {
  return `    <video:video>
      <video:thumbnail_loc>${thumbnailUrl}</video:thumbnail_loc>
      <video:title>${escapeXml(title)}</video:title>
      <video:description>${escapeXml(description)}</video:description>
      <video:content_loc>${contentUrl}</video:content_loc>
      <video:duration>${durationSeconds}</video:duration>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>`;
}

const urls = VIDEO_PAGES.map(({ path: pagePath, videos }) => `  <url>
    <loc>${siteUrl}${pagePath}</loc>
${videos.map(renderVideo).join('\n')}
  </url>`).join('\n\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls}
</urlset>
`;

await writeFile(outputPath, sitemap, 'utf8');
const totalVideos = VIDEO_PAGES.reduce((sum, { videos }) => sum + videos.length, 0);
console.log(`Generated video sitemap with ${totalVideos} videos across ${VIDEO_PAGES.length} pages.`);
