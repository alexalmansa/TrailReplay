import fs from 'node:fs';
import path from 'node:path';

const distAssetsDir = path.resolve(process.cwd(), 'app/dist/assets');
const outputPath = path.resolve(process.cwd(), 'app/dist/bundle-report.json');

if (!fs.existsSync(distAssetsDir)) {
  console.error('Bundle assets directory not found:', distAssetsDir);
  process.exit(1);
}

const files = fs.readdirSync(distAssetsDir)
  .filter((file) => file.endsWith('.js') || file.endsWith('.css'))
  .map((file) => {
    const fullPath = path.join(distAssetsDir, file);
    const sizeBytes = fs.statSync(fullPath).size;
    return {
      file,
      sizeBytes,
      sizeKb: Number((sizeBytes / 1024).toFixed(2)),
    };
  })
  .sort((a, b) => b.sizeBytes - a.sizeBytes);

const report = {
  generatedAt: new Date().toISOString(),
  files,
};

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Bundle report written to ${outputPath}`);

for (const asset of files.slice(0, 10)) {
  console.log(`${asset.file}: ${asset.sizeKb} kB`);
}
