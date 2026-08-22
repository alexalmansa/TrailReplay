import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SEO_PAGES } from './seo-pages.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..');
const distRoot = path.join(appRoot, 'dist');
const failures = [];

const requiredDocuments = SEO_PAGES
  .filter(({ path: pagePath }) => pagePath !== '/acknowledgments')
  .map(({ file, path: pagePath }) => ({ file, canonical: `https://trailreplay.com${pagePath}` }));

/**
 * Google reports thin, JS-only documents as "Crawled - currently not indexed",
 * so every crawlable page must ship real prerendered text and an internal link
 * graph in its served HTML — not just a mount point.
 */
const MIN_PRERENDERED_WORDS = 250;

function visibleWordCount(html) {
  const body = html.slice(html.indexOf('<body'));
  return body
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

for (const { file, canonical } of requiredDocuments) {
  const html = await readFile(path.join(distRoot, file), 'utf8');
  if (!html.includes('<title>')) failures.push(`${file} is missing a title`);
  if (!html.includes(`rel="canonical" href="${canonical}"`)) {
    failures.push(`${file} is missing canonical ${canonical}`);
  }

  if (html.includes('<div id="root"></div>')) {
    failures.push(`${file} was not prerendered (empty #root)`);
  }
  if (!/<h1[\s>]/.test(html)) failures.push(`${file} is missing a prerendered h1`);
  if (!/<a [^>]*href="\/[^"]*"/.test(html)) {
    failures.push(`${file} has no crawlable internal links`);
  }

  const words = visibleWordCount(html);
  if (words < MIN_PRERENDERED_WORDS) {
    failures.push(`${file} has only ${words} prerendered words (minimum ${MIN_PRERENDERED_WORDS})`);
  }

  if (file.includes('-to-video') || file.includes('route-animation') || file === 'gpx-animation.html') {
    if (!html.includes('application/ld+json')) failures.push(`${file} is missing structured data`);
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
