import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * app/public/replay-file.md is served at trailreplay.com/replay-file.md and is
 * the only thing an agent authoring a project has to go on. A field added to
 * the format but not to that page is a field nobody outside this repo can use,
 * so the page has to keep up with the type.
 *
 * Fields deliberately not offered to authors are listed below with the reason.
 */
const NOT_FOR_AUTHORS = new Set([
  // Real media files a .replay cannot carry; reopened as placeholders.
  'pictures',
  'videos',
  // A camera mode not yet reachable from the UI.
  'cinematicCameraKeyframes',
]);

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

/** Field names declared on ReplayProjectFile, from the type's own source. */
function replayProjectFileFields(): string[] {
  const source = read('./types.ts');
  const body = source.slice(source.indexOf('export interface ReplayProjectFile {'));
  return [...body.slice(0, body.indexOf('\n}')).matchAll(/^ {2}(\w+)\??:/gm)]
    .map((match) => match[1]);
}

describe('replay-file.md', () => {
  const doc = read('../../../public/replay-file.md');
  const fields = replayProjectFileFields();

  it('reads the fields off the type', () => {
    expect(fields).toContain('tracks');
    expect(fields).toContain('userLandmarks');
    expect(fields.length).toBeGreaterThan(15);
  });

  it.each(fields.filter((field) => !NOT_FOR_AUTHORS.has(field)))(
    'documents %s',
    (field) => {
      expect(doc).toContain(`\`${field}\``);
    },
  );

  it('explains the fields it deliberately withholds', () => {
    for (const field of NOT_FOR_AUTHORS) {
      expect(doc).toContain(`\`${field}\``);
    }
    expect(doc).toContain('Fields to leave alone');
  });
});
