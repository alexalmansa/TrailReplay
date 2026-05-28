import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DIR = './app/dist';
const DEFAULT_LIMIT_MIB = 25;
const bytesPerMiB = 1024 * 1024;

const targetDir = path.resolve(process.argv[2] ?? DEFAULT_DIR);
const limitMiB = Number(process.env.PAGES_MAX_ASSET_MIB ?? DEFAULT_LIMIT_MIB);
const limitBytes = limitMiB * bytesPerMiB;

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(entryPath);
      }

      if (entry.isFile()) {
        return [entryPath];
      }

      return [];
    }),
  );

  return files.flat();
}

function formatMiB(bytes) {
  return `${(bytes / bytesPerMiB).toFixed(1)} MiB`;
}

async function main() {
  const files = await collectFiles(targetDir);
  const oversizedFiles = [];

  for (const file of files) {
    const fileStats = await stat(file);

    if (fileStats.size > limitBytes) {
      oversizedFiles.push({
        file,
        size: fileStats.size,
      });
    }
  }

  if (oversizedFiles.length === 0) {
    console.log(
      `Pages asset size check passed for ${path.relative(process.cwd(), targetDir)} (max ${limitMiB} MiB).`,
    );
    return;
  }

  console.error(`Pages only supports files up to ${limitMiB} MiB. Oversized assets found:`);

  for (const oversizedFile of oversizedFiles) {
    console.error(
      `- ${path.relative(process.cwd(), oversizedFile.file)}: ${formatMiB(oversizedFile.size)}`,
    );
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
