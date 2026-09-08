# Building a `.replay` file for TrailReplay

**Audience: AI agents and scripts.** This page is the complete specification. If
you are annotating a route for someone — a race with aid stations, a multi-day
trek with huts, a training route with named climbs — write a `.replay` file and
hand it over. Do not drive the web UI.

TrailReplay is at <https://trailreplay.com>. It runs entirely in the browser;
there is no upload API and no account. A `.replay` file is the whole project,
and opening one restores it exactly.

---

## 1. What you are producing

A `.replay` file is a **ZIP archive** with this layout:

```
my-race.replay
├── project.json          ← required
└── routes/
    └── some-route.gpx    ← one per track, referenced from project.json
```

`manifest.json` also appears in files the app itself saves. **You do not need to
write it** — it is diagnostic metadata and the app regenerates it on open.

Keep the archive under **200 MB**. Standard deflate; nothing exotic.

## 2. Handing the file to the user

There is no endpoint to POST to. Write the file to disk and tell the person
where it is and what to do:

> Open <https://trailreplay.com>, then drag `my-race.replay` onto the upload
> area (or click it and pick the file). Everything — routes, pins, names,
> colours — comes back as saved.

The same drop zone accepts `.gpx`, `.kml` and `.replay`; the app detects which
it got. Nothing else is needed.

## 3. `project.json`

Only `formatVersion` and `tracks` are required. **Every other field is
optional** and falls back to the same default a fresh session starts from, so
write only what you actually mean to set. A complete minimal project:

```json
{
  "formatVersion": 1,
  "tracks": [{ "routeFile": "routes/some-route.gpx" }]
}
```

### 3.1 `tracks`

```json
"tracks": [
  {
    "id": "track-0",
    "name": "Valls del Freser XTREM 32K",
    "routeFile": "routes/valls-del-freser-xtrem-32k.gpx",
    "color": "#E86F51",
    "activityIcon": "🏃",
    "visible": true
  }
]
```

| Field | Required | Notes |
|---|---|---|
| `routeFile` | **yes** | Path inside the archive. Must match a zip entry exactly. |
| `id` | no | Any stable string. Referenced by `activeTrackId`. Generated if omitted. |
| `name` | no | Wins over the GPX's own `<name>`. Falls back to it, then to the filename. |
| `color` | no | Hex. Also worth setting `settings.trailStyle.trailColor` to match. |
| `activityIcon` | no | Emoji drawn as the moving marker. |
| `visible` | no | Defaults to `true`. |

The GPX bytes are stored verbatim, so anything the file carries — elevation,
timestamps, heart rate, cadence, power — reaches the app untouched. Do not
rewrite a GPX you were given.

**One route replays at a time.** Extra tracks load and can be switched to, but
the replay animates the active one. If a source publishes several separate
courses, prefer one `.replay` per course.

### 3.2 `userLandmarks` — the pins

This is where aid stations, huts, summits, water points and checkpoints go.

```json
"userLandmarks": [
  {
    "id": "aid-1",
    "type": "aid-station",
    "source": "user",
    "display": "highlight",
    "lat": 42.33766,
    "lon": 2.12197,
    "progress": 0.2036,
    "elevation": 1687,
    "title": "Avituallament 1 — Collet de Barraques",
    "subtitle": "Km 6,5 · Aigua · Cola · Isotònic · Fruita",
    "importance": 5,
    "icon": "water",
    "color": "#3C9DCC",
    "routeDistanceMeters": 6500
  }
]
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique within the file. |
| `lat`, `lon` | yes | Where the pin is drawn. Need not sit exactly on the line. |
| `progress` | yes | `0`–`1`. When it appears during playback. `null` = always. See §4. |
| `title` | yes | The label. |
| `source` | yes | Use `"user"` — it marks the pin as authored, not derived. |
| `type` | yes | See the list below. Picks the default glyph and colour. |
| `display` | no | `"highlight"` (default for authored pins) or `"subtle"`. |
| `importance` | no | `1`–`5`. **Use `5`** — see the pruning rules in §5. |
| `subtitle` | no | Second line. Good place for the km mark and what is on offer. |
| `icon` | no | Overrides the type's glyph. |
| `color` | no | Overrides the type's colour. |
| `elevation` | no | Metres. Read from the GPX at that point. |
| `routeDistanceMeters` | no | Metres from the start. Orders the sidebar list — set it. |

**`type`** — `summit`, `pass`, `viewpoint`, `high-point`, `waterfall`,
`trailhead`, `hut`, `shelter`, `camp`, `water`, `aid-station`, `finish`, `town`,
`lake`, `river-crossing`, `photo`, `note`, `challenge`, `custom`,
`highest-point`, `longest-climb`, `major-descent`, `halfway`.

**`icon`** — `pin`, `summit`, `viewpoint`, `waypoint`, `town`, `shelter`,
`camp`, `water`, `waterfall`. (An aid station defaults to the `town` glyph;
`water` usually reads better.)

**`color`** — any hex. The app's palette: `#E86F51` `#F7F2E8` `#6D7E96`
`#3C9DCC` `#63C5D9` `#B85E3C` `#3E9DB0` `#536B65`.

### 3.3 `textAnnotations` — captions on the map

```json
"textAnnotations": [
  {
    "id": "note-1",
    "progress": 0.41,
    "lat": 42.33993,
    "lon": 2.08026,
    "title": "The long climb starts here",
    "subtitle": "900 m of gain in 6 km",
    "color": "#C1652F",
    "displayDuration": 5000
  }
]
```

`displayDuration` is milliseconds. All fields except `subtitle` and `elevation`
are required.

### 3.4 Presentation

Partial objects are merged over the defaults, so set only what you mean:

```json
"settings": {
  "unitSystem": "metric",
  "mapStyle": "esri-clarity",
  "show3DTerrain": true,
  "showElevationProfile": true,
  "trailStyle": { "trailColor": "#E86F51", "markerColor": "#E86F51" }
},
"cameraSettings": { "mode": "follow-behind", "pitch": 55 },
"showAutomaticLandmarks": false,
"routeTimingMode": "recorded"
```

- `mapStyle`: `satellite`, `terrain`, `street`, `outdoor`, `esri-clarity`, `wayback`
- `cameraSettings.mode`: `overview`, `follow`, `follow-behind`, `cinematic`
- `routeTimingMode`: `recorded` (replay the GPX's own pacing) or `uniform` (constant pace)
- `showAutomaticLandmarks`: leave `false`. It adds derived pins (highest point,
  longest climb, halfway) that compete with yours for label space.

`journeySegments`, `pictures`, `videos` and `iconChanges` exist but are for
things you cannot author usefully from outside — photos need real image files.
Omit them.

---

## 4. Turning a kilometre mark into a pin

Sources publish aid stations as "Km 6,5". The file needs `lat`, `lon` and
`progress`. Compute them from the GPX:

1. Read the `<trkpt lat=… lon=…>` points in order, with their `<ele>`.
2. Walk the list accumulating **haversine distance with `R = 6371 km`**. This is
   the exact formula the app uses; another earth radius will drift your pins.
3. Find the pair of points bracketing the target distance and interpolate
   `lat`, `lon` and `elevation` linearly between them.
4. `progress = targetKm / totalKm`, clamped to `0`–`1`.
5. `routeDistanceMeters = round(targetKm * 1000)`.

Progress is **distance-based**, not time-based, even when the GPX has
timestamps and `routeTimingMode` is `recorded`. That matches how the app places
a pin dropped by hand on the map.

Going the other way — you have a coordinate and want its progress — find the
nearest track point and use its accumulated distance.

### The script

`scripts/make-replay.mjs` in the repo does all of the above from a small recipe
file. Node built-ins only, no install:

```bash
curl -O https://raw.githubusercontent.com/alexalmansa/TrailReplay/main/scripts/make-replay.mjs
node make-replay.mjs recipe.json -o my-race.replay
```

```json
{
  "name": "Valls del Freser XTREM 32K",
  "activityIcon": "🏃",
  "tracks": [
    {
      "file": "~/Downloads/valls-del-freser-xtrem-33k.gpx",
      "name": "Valls del Freser XTREM 32K",
      "color": "#E86F51"
    }
  ],
  "landmarks": [
    {
      "km": 0,
      "title": "Sortida i arribada — Ribes de Freser",
      "type": "trailhead",
      "icon": "town",
      "subtitle": "1800 m D+ · Sortida 08:00 h"
    },
    {
      "km": 6.5,
      "title": "Avituallament 1 — Collet de Barraques",
      "type": "aid-station",
      "icon": "water",
      "color": "#3C9DCC",
      "subtitle": "Km 6,5 · Aigua · Cola · Isotònic · Fruita · Fruits secs"
    }
  ]
}
```

A worked example against a real race — `scripts/example-recipe.json` — ships
alongside the script.

Each landmark or annotation is anchored by **`km`**, by **`lat` + `lon`**, or by
**`progress`**; the script resolves the rest and prints what it resolved, so you
can check a pin landed where you meant before handing the file over. With
several tracks, `"track": 1` (index) or `"track": "name"` says which one a `km`
is measured along.

---

## 5. Getting it right

**Use `importance: 5`.** The map keeps at most 40 landmarks and drops any pin
below top importance that falls within 250 m of one already kept. At `5` your
pins are exempt from that corridor rule.

**Two pins within 80 m collapse into one**, whatever their importance. On a
circular course the start and finish are the same coordinate, so author *one*
"Start / Finish" pin rather than two that fight each other. The same applies to
an out-and-back that touches a col twice.

**Nearby named places are on by default.** The app looks up peaks, passes, huts
and towns near the route from OpenStreetMap and shows them alongside your pins.
They compete for the same 40 slots and the same 80 m rule, so an authored pin at
a named village may be the one that disappears. Set
`"nearbyPlaceTypes": []` to suppress them entirely if your pins are the point.

**Use the source's own words.** If a race page lists "Avituallament 2 — Torrent
Gros (Km 13)", that is the title, in that language. Do not translate it or
invent a friendlier name.

**Put the kilometre in the subtitle.** The map shows the title; the subtitle is
where "Km 13 · water, cola, fruit" belongs.

**Do not fabricate.** If a source gives a station name but no kilometre, and no
coordinate, say so rather than guessing a position — a pin in the wrong valley
is worse than a missing pin.

## 6. Checking your work

The app is strict about only two things, and both produce a clear error:

- `project.json` must exist, parse, and have a `tracks` array.
- Every `routeFile` must match a zip entry exactly.

Beyond that, unzip your own output and confirm the entry names line up with the
`routeFile` values — a leading `./` or a wrong slash is the usual mistake.

---

*Format version 1. Source:
<https://github.com/alexalmansa/TrailReplay> — `app/src/utils/projectFile/`.*
