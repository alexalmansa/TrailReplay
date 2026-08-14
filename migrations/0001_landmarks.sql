-- Compact, named OSM features used by the nearby-places overlay.
-- Coordinates are WGS84 degrees. tile_key is a 0.25 degree grid cell, which
-- keeps a route lookup index-only and avoids requiring a spatial extension.
CREATE TABLE IF NOT EXISTS landmarks (
  osm_type TEXT NOT NULL CHECK (osm_type IN ('node', 'way', 'relation')),
  osm_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('summit', 'pass', 'viewpoint', 'hut', 'waterfall', 'lake', 'town')),
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  elevation REAL,
  tile_key TEXT NOT NULL,
  updated_at TEXT,
  PRIMARY KEY (osm_type, osm_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_landmarks_tile_key ON landmarks(tile_key);

CREATE TABLE IF NOT EXISTS landmark_dataset (
  dataset_key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) WITHOUT ROWID;
