import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const v2Dist = path.join(root, 'trailreplayV2', 'app', 'dist');
const outDir = path.join(root, 'dist', 'app');

if (!fs.existsSync(v2Dist)) {
  console.error(`Missing v2 build at ${v2Dist}. Run "npm --prefix trailreplayV2/app run build" first.`);
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const copyRecursive = (src, dest) => {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.copyFileSync(src, dest);
};

copyRecursive(v2Dist, outDir);
console.log(`Copied v2 build to ${outDir}`);
