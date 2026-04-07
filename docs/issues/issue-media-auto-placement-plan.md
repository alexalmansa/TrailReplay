# Media Auto-Placement Implementation Plan

## Goal

Make photo placement work automatically in the common cases, with a robust fallback order:

1. Place from embedded GPS metadata when available.
2. If GPS is missing or does not match the route well enough, place from photo timestamp using GPX time data.
3. If neither strategy is reliable, queue the photo for manual placement.

## Current Behavior

The current import flow lives in:

- `app/src/hooks/usePhotos.ts`
- `app/src/utils/photoPlacement.ts`

Today the flow is:

1. Read a narrow EXIF subset from the imported image.
2. If EXIF GPS exists, find the nearest sampled route point.
3. If the nearest point is farther than `250m`, queue the image for manual placement.
4. If GPS is missing, queue manual placement immediately.

### Current Weak Points

1. Metadata parsing is too narrow.
   - We only parse `gps`, `exif`, and `ifd0`.
   - We only read a few fields: `latitude`, `longitude`, `DateTimeOriginal`, `GPSDateStamp`, `GPSTimeStamp`.
   - Real-world images often store location/time in other fields or containers.

2. GPS route matching is too coarse.
   - We snap to the nearest sampled route point, not the nearest point on a route segment.
   - Sparse GPX files can easily produce false route mismatches even when the image is close to the trail.

3. Timestamp placement does not exist yet.
   - We already parse a timestamp candidate, but it is not used for placement.

4. Failure reasons are not observable enough.
   - Users only see that the image could not be placed automatically.
   - We do not distinguish metadata failure from route mismatch from missing GPX timestamps in the current flow.

## Implementation Strategy

Implement the feature in three phases, in this order:

### Phase 1: Robust Metadata Extraction + GPS Placement Fix

This phase should recover the majority of currently failing imports.

#### 1. Add a metadata normalization utility

Create a new utility:

- `app/src/utils/photoMetadata.ts`

Responsibilities:

- Parse broader metadata containers with `exifr`
  - `gps`
  - `exif`
  - `ifd0`
  - `xmp`
  - `quicktime`
- Normalize all useful metadata into one shape
- Support both `string` and `Date` values
- Extract:
  - `latitude`
  - `longitude`
  - `timestamp`
  - `timestampSource`
  - `coordinateSource`

Candidate timestamp fields to try in order:

- `DateTimeOriginal`
- `CreateDate`
- `MediaCreateDate`
- `GPSDateStamp + GPSTimeStamp`
- `file.lastModified` as a weak fallback only

This utility should also normalize common EXIF string formats such as:

- `YYYY:MM:DD HH:mm:ss`
- ISO strings
- native `Date` values returned by `exifr`

#### 2. Replace route-point snapping with route-segment snapping

Create a polyline matching utility:

- `app/src/utils/routeProjection.ts`

Responsibilities:

- Project an arbitrary coordinate onto the nearest route segment
- Return:
  - snapped `lat`
  - snapped `lon`
  - `progress`
  - `distanceMeters`
- Work for:
  - single-track mode
  - journey mode using `buildComputedJourney(...)`

This same utility should be used by:

- automatic GPS placement in `app/src/hooks/usePhotos.ts`
- manual click placement in `app/src/components/map/TrailMap.tsx`

That avoids having two different route-matching implementations drifting apart.

#### 3. Refactor placement resolution

Update:

- `app/src/utils/photoPlacement.ts`

So that GPS placement decisions are based on:

- normalized metadata
- segment-based route projection
- a configurable route-match threshold

Keep the threshold, but evaluate it after proper segment snapping.

#### 4. Improve diagnostics

Add explicit placement failure reasons and track them.

Suggested failure categories:

- `missing-gps`
- `route-mismatch`
- `missing-timestamp`
- `no-timed-route`
- `timestamp-out-of-range`

These reasons should be emitted into analytics in `usePhotos.ts` so we can tell whether failures come from metadata extraction or route matching.

### Phase 2: Timestamp-Based Placement

This phase adds the GPX Animator-style fallback.

#### 1. Build a timed route lookup utility

Create:

- `app/src/utils/photoTimelinePlacement.ts`

Responsibilities:

- Given a normalized photo timestamp, find the best route position from GPX times
- Support:
  - single-track mode
  - journey mode for track segments that have real GPX timestamps
- Return:
  - interpolated `lat`
  - interpolated `lon`
  - `progress`
  - `distance` or `segment context` if needed

For track segments:

- Use neighboring GPX points with valid `time`
- Interpolate between the two surrounding points

Important rule:

- Only interpolate when the timestamp falls inside the timed route window
- Do not silently place far before the route start or far after the route end

Optional tolerance can be added later, but the first version should stay strict to avoid obviously wrong placements.

#### 2. Insert timestamp fallback into the placement pipeline

Update the placement order in `usePhotos.ts` and `photoPlacement.ts`:

1. Try GPS placement if GPS coordinates exist.
2. If GPS fails or is missing, try timestamp placement if a timestamp exists and the route has usable GPX times.
3. If timestamp placement fails, queue manual placement.

Important edge case:

- If the photo has GPS but the route mismatch is large, timestamp placement should still be allowed to rescue the image before falling back to manual placement.

#### 3. Extend annotation metadata

Update:

- `app/src/types/index.ts`

Changes:

- Extend `PictureAnnotation.placementSource` to:
  - `'gps'`
  - `'timestamp'`
  - `'manual'`
- Extend `PendingPicturePlacement.placementReason` to cover timestamp-specific failures

### Phase 3: UX and Feedback Improvements

#### 1. Expose placement source in the UI

Update:

- `app/src/components/sidebar/PicturesPanel.tsx`

Show distinct badges for:

- GPS
- Timestamp
- Manual

#### 2. Improve manual placement messaging

Update:

- `app/src/components/app/PendingPicturePlacementBanner.tsx`
- `app/src/i18n/locales/en.ts`
- `app/src/i18n/locales/es.ts`
- `app/src/i18n/locales/ca.ts`

Goals:

- Tell the user why the image was not placed automatically
- Distinguish:
  - no GPS metadata
  - GPS too far from route
  - no usable GPX timestamps
  - timestamp outside route time window

## File-by-File Change List

### New files

- `app/src/utils/photoMetadata.ts`
- `app/src/utils/routeProjection.ts`
- `app/src/utils/photoTimelinePlacement.ts`
- `app/src/utils/photoMetadata.test.ts`
- `app/src/utils/routeProjection.test.ts`

### Existing files to update

- `app/src/hooks/usePhotos.ts`
- `app/src/utils/photoPlacement.ts`
- `app/src/types/index.ts`
- `app/src/components/map/TrailMap.tsx`
- `app/src/components/sidebar/PicturesPanel.tsx`
- `app/src/components/app/PendingPicturePlacementBanner.tsx`
- `app/src/i18n/locales/en.ts`
- `app/src/i18n/locales/es.ts`
- `app/src/i18n/locales/ca.ts`
- `app/src/utils/photoPlacement.test.ts`

## Testing Plan

### Unit tests

Add or expand tests for:

1. Metadata normalization
   - EXIF date strings
   - native `Date` values
   - GPS + timestamp from different metadata containers
   - fallback to `file.lastModified`

2. GPS route projection
   - sparse GPX route with a point near the middle of a long segment
   - exact endpoint match
   - progress calculation on projected segment

3. Timestamp placement
   - exact timestamp on a GPX point
   - interpolation between two GPX points
   - timestamp before route start
   - timestamp after route end
   - route with missing times

4. Placement pipeline
   - GPS succeeds
   - GPS fails and timestamp succeeds
   - GPS missing and timestamp succeeds
   - both fail and manual placement is queued

### Manual verification

Verify with real files:

1. iPhone JPG with GPS metadata
2. iPhone HEIC with GPS metadata
3. Image with timestamp but no GPS
4. GPX with timestamps
5. GPX without timestamps
6. Sparse GPX geometry where current point-snapping would fail

## Acceptance Criteria

The feature is complete when:

- Most geotagged images are placed automatically without manual intervention
- Photos with no GPS but valid timestamps can be placed automatically when the GPX contains usable time data
- Manual placement is only used when metadata is truly insufficient or the route match is not trustworthy
- The UI clearly indicates whether placement came from GPS, timestamp interpolation, or manual placement
- Failure reasons are specific enough to debug future reports

## Recommended Delivery Order

1. Implement Phase 1
2. Ship and verify with real geotagged images
3. Implement Phase 2
4. Add the Phase 3 UI polish after the behavior is correct

This order reduces risk and should quickly improve the current broken experience before adding the timestamp fallback.
