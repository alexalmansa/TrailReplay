import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SEO_PAGES } from './seo-pages.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(scriptDirectory, '../public/sitemap.xml');
const siteUrl = 'https://trailreplay.com';

const urls = SEO_PAGES.map(({ path: pagePath, lastmod }) => `  <url>
    <loc>${siteUrl}${pagePath}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`).join('\n\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

await writeFile(outputPath, sitemap, 'utf8');
console.log(`Generated sitemap with ${SEO_PAGES.length} canonical URLs.`);
