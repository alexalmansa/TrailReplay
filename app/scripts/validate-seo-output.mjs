import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SEO_PAGES } from './seo-pages.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..');
const distRoot = path.join(appRoot, 'dist');
const failures = [];

const requiredDocuments = [
  { file: 'index.html', canonical: 'https://trailreplay.com/' },
  { file: 'tutorial.html', canonical: 'https://trailreplay.com/tutorial' },
  { file: 'gpx-download-guide.html', canonical: 'https://trailreplay.com/gpx-download-guide' },
];

for (const { file, canonical } of requiredDocuments) {
  const html = await readFile(path.join(distRoot, file), 'utf8');
  if (!html.includes('<title>')) failures.push(`${file} is missing a title`);
  if (!html.includes(`rel="canonical" href="${canonical}"`)) {
    failures.push(`${file} is missing canonical ${canonical}`);
  }
}

await access(path.join(distRoot, '404.html'));

const sitemap = await readFile(path.join(distRoot, 'sitemap.xml'), 'utf8');
for (const { path: pagePath } of SEO_PAGES) {
  if (!sitemap.includes(`<loc>https://trailreplay.com${pagePath}</loc>`)) {
    failures.push(`sitemap is missing ${pagePath}`);
  }
}

for (const excludedPath of ['/privacy', '/terms', '.html']) {
  if (sitemap.includes(excludedPath)) {
    failures.push(`sitemap contains excluded value ${excludedPath}`);
  }
}

if (failures.length > 0) {
  throw new Error(`SEO validation failed:\n- ${failures.join('\n- ')}`);
}

console.log('SEO output validation passed.');
