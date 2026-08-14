# Worldwide landmarks database

`LANDMARKS_DB` is TrailReplay's durable OpenStreetMap-derived database for the
nearby named places overlay. It stores only the named categories the product
shows: summits, passes, viewpoints, alpine huts, waterfalls, lakes, and cities,
towns, villages, and hamlets. It deliberately does **not** store route traces,
raw tags, user data, or OSM geometries.

## Production database

The D1 database is `trailreplay-landmarks` in the Bresca.ai account (Western
Europe), bound as `LANDMARKS_DB` in `wrangler.toml`. Its schema is applied by:

```sh
npx wrangler d1 migrations apply trailreplay-landmarks --remote
```

The endpoint reads the 0.25-degree grid cells that intersect the padded route
corridor, then applies the precise latitude/longitude bounds. It has one small
B-tree index (`tile_key`) rather than a spatial extension, so global lookups
remain predictable as the dataset grows.

## Initial worldwide import

Do this from a machine with at least 150 GB free disk and substantial RAM. Do
not use the public Overpass API to crawl the world. Download an OSM planet PBF
from [planet.openstreetmap.org](https://planet.openstreetmap.org/pbf/) and
install [Osmium](https://docs.osmcode.org/osmium/latest/).

```sh
# Keep matching ways/relations and the nodes they need for geometry.
osmium tags-filter --expressions=scripts/osm-landmark-filters.txt \
  --output=tmp/landmarks-filtered.osm.pbf --overwrite planet-latest.osm.pbf

# GeoJSON Text Sequences are streamable; attributes retain the OSM identity.
osmium export tmp/landmarks-filtered.osm.pbf \
  --output=tmp/landmarks.geojsonseq --output-format=geojsonseq \
  --attributes=id,type --overwrite

# Write compact, idempotent SQL batches of no more than 500 rows each.
node scripts/prepare-osm-landmarks.mjs --input=tmp/landmarks.geojsonseq

# Import the generated files serially. Run from the same directory as the app.
for sql in tmp/landmark-sql/landmarks-*.sql; do
  npx wrangler d1 execute trailreplay-landmarks --remote --file="$sql" || exit 1
done
# Mark the database complete only after every data batch succeeded. Until this
# final file is run, TrailReplay deliberately keeps using its cache fallback.
npx wrangler d1 execute trailreplay-landmarks --remote --file=tmp/landmark-sql/complete.sql
```

Verify the import before enabling the layer broadly:

```sh
npx wrangler d1 execute trailreplay-landmarks --remote \
  --command='SELECT kind, COUNT(*) AS landmarks FROM landmarks GROUP BY kind ORDER BY kind'
```

The importer uses stable `(osm_type, osm_id)` keys and UPSERTs, so rerunning it
is safe. A D1 database is used only after `complete.sql` sets the
`world-import-complete` marker; that makes the coverage promise explicit rather
than assuming partial data is worldwide data. For future refreshes, rebuild the
filtered dataset from a newer planet snapshot and rerun the same import. Keep
the visible OpenStreetMap attribution and ODbL notice in the product.
