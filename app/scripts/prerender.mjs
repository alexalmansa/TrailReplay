import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..');
const distRoot = path.join(appRoot, 'dist');

const ROOT_DIV = '<div id="root"></div>';

// Read by vite.config.ts to keep the dev-only inspector out of rendered markup.
process.env.TRAILREPLAY_PRERENDER = '1';

const vite = await createServer({
  root: appRoot,
  logLevel: 'warn',
  server: { middlewareMode: true },
  appType: 'custom',
});

let rendered;
try {
  const { renderAllPages } = await vite.ssrLoadModule('/src/prerender/entry-server.tsx');
  rendered = renderAllPages();
} finally {
  await vite.close();
}

for (const [file, markup] of Object.entries(rendered)) {
  const target = path.join(distRoot, file);
  const html = await readFile(target, 'utf8');

  if (!html.includes(ROOT_DIV)) {
    throw new Error(`prerender: no empty #root mount point found in ${file}`);
  }

  await writeFile(target, html.replace(ROOT_DIV, `<div id="root">${markup}</div>`), 'utf8');
}

console.log(`Prerendered ${Object.keys(rendered).length} documents.`);
