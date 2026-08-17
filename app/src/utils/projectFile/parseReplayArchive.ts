import { unzip } from 'fflate';
import {
  MAX_ARCHIVE_SIZE_BYTES,
  SUPPORTED_FORMAT_VERSIONS,
  CURRENT_FORMAT_VERSION,
  type ParsedProject,
  type ReplayManifest,
  type ReplayProjectFile,
} from './types';
import { ReplayArchiveError } from './validation';

function decodeJson<T>(files: Record<string, Uint8Array>, path: string): T {
  const bytes = files[path];
  if (!bytes) {
    throw new ReplayArchiveError('corrupt', `Missing ${path} — this is not a valid .replay file`);
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new ReplayArchiveError('corrupt', `${path} is not valid JSON — this is not a valid .replay file`);
  }
}

export async function parseReplayArchive(file: File): Promise<ParsedProject> {
  if (file.size > MAX_ARCHIVE_SIZE_BYTES) {
    throw new ReplayArchiveError(
      'too-large',
      `This .replay file is too large (${Math.round(file.size / 1024 / 1024)} MB, limit ${MAX_ARCHIVE_SIZE_BYTES / 1024 / 1024} MB)`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(bytes, (error, data) => {
      if (error) reject(new ReplayArchiveError('corrupt', 'Could not open this .replay file — the archive is corrupt'));
      else resolve(data);
    });
  });

  const manifest = decodeJson<ReplayManifest>(files, 'manifest.json');
  const project = decodeJson<ReplayProjectFile>(files, 'project.json');

  if (!SUPPORTED_FORMAT_VERSIONS.includes(manifest.formatVersion)) {
    const message = manifest.formatVersion > CURRENT_FORMAT_VERSION
      ? 'This project was saved with a newer version of TrailReplay — please update the app to open it'
      : `Unrecognized project format version (${manifest.formatVersion})`;
    throw new ReplayArchiveError('unsupported-version', message);
  }

  if (project.formatVersion !== manifest.formatVersion) {
    throw new ReplayArchiveError('corrupt', 'manifest.json and project.json disagree on format version');
  }

  const decoder = new TextDecoder();

  const tracks = project.tracks.map((meta) => {
    const bytes = files[meta.routeFile];
    if (!bytes) {
      throw new ReplayArchiveError('missing-asset', `Missing route file: ${meta.routeFile}`);
    }
    return { meta, gpxText: decoder.decode(bytes) };
  });

  const comparisonTracks = project.comparisonTracks.map((meta) => {
    const bytes = files[meta.routeFile];
    if (!bytes) {
      throw new ReplayArchiveError('missing-asset', `Missing route file: ${meta.routeFile}`);
    }
    return { meta, gpxText: decoder.decode(bytes) };
  });

  return { manifest, project, tracks, comparisonTracks };
}
