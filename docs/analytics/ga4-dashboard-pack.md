# TrailReplay GA4 Dashboard Pack

This document maps the current TrailReplay frontend analytics implementation to
Google Analytics 4 reports and explorations.

## Why GA4 Looks Empty Right Now

TrailReplay currently sends:

- `page_view`
- `route_import_started`
- `route_import_completed`
- `route_import_failed`
- `photo_import_started`
- `photo_import_completed`
- `export_started`
- `export_completed`
- `export_failed`
- `export_cancelled`
- `web_vital`

GA4 often looks empty at first for two reasons:

1. Standard reports are delayed compared to Realtime.
2. Event parameters do not appear in reports or explorations until their custom
   definitions are created in GA4.

Create the custom definitions first, then wait for new events to populate.

## Event Schema In The App

### Startup

- `page_view`
  - `page_title`
  - `page_location`
  - `page_path`
  - `app_name`
  - `timestamp`

### Route Import

- `route_import_started`
  - `route_file_count`

- `route_import_completed`
  - `route_imported_track_count`

- `route_import_failed`
  - `route_file_count`

### Photo Import

- `photo_import_started`
  - `photo_received_file_count`
  - `photo_image_file_count`

- `photo_import_completed`
  - `photo_picture_count_added`
  - `photo_queued_for_manual_placement`

### Export

- `export_started`
  - `export_format`
  - `export_quality`
  - `export_fps`
  - `export_include_stats`
  - `export_include_elevation`

- `export_completed`
  - `export_blob_size`
  - `export_format`

- `export_failed`
  - `export_failure_scope`

- `export_cancelled`
  - `export_progress_percent`
  - `export_stage`

### Web Vitals

- `web_vital`
  - `web_vital_name`
  - `web_vital_value`

## Step 1: Create Custom Dimensions

Go to:

`Admin -> Custom definitions -> Create custom dimensions`

Create these as `Event-scoped` custom dimensions:

- `route_file_count`
- `route_imported_track_count`
- `photo_received_file_count`
- `photo_image_file_count`
- `photo_picture_count_added`
- `photo_queued_for_manual_placement`
- `export_format`
- `export_quality`
- `export_fps`
- `export_include_stats`
- `export_include_elevation`
- `export_failure_scope`
- `export_progress_percent`
- `export_stage`
- `web_vital_name`
- `page_path`

## Step 2: Create Custom Metrics

Go to:

`Admin -> Custom definitions -> Create custom metrics`

Create:

- `export_blob_size`
- `web_vital_value`

## Step 3: Check Realtime First

Before building reports, confirm the property is receiving these events in:

`Reports -> Realtime`

Test this flow on production:

1. Load the app
2. Import a GPX
3. Import one or more photos
4. Start and finish an export

You should see event names like:

- `page_view`
- `route_import_started`
- `route_import_completed`
- `photo_import_started`
- `photo_import_completed`
- `export_started`
- `export_completed`

## Step 4: Main Operational Report

Create a detail report in:

`Reports -> Library`

Name:

`TrailReplay Operational Events`

Configuration:

- Primary dimension: `Event name`
- Secondary dimension: `Date`
- Metrics:
  - `Event count`
  - `Total users`
  - `Event count per active user`

Filter to these event names:

- `page_view`
- `route_import_started`
- `route_import_completed`
- `route_import_failed`
- `photo_import_started`
- `photo_import_completed`
- `export_started`
- `export_completed`
- `export_failed`
- `export_cancelled`
- `web_vital`

If you use regex filtering:

```text
page_view|route_import_started|route_import_completed|route_import_failed|photo_import_started|photo_import_completed|export_started|export_completed|export_failed|export_cancelled|web_vital
```

## Step 5: Snapshot Cards To Add

Add these to `Reports snapshot` or a custom collection overview:

1. `Page views and route imports by event name`
2. `Exports started/completed/failed over time`
3. `Photos queued for manual placement`
4. `Web vitals by name`

## Step 6: Explorations To Build

### 1. Import Funnel

Type:

`Explore -> Free form`

Setup:

- Rows: `Date`, `Event name`
- Values: `Event count`, `Total users`
- Filter:
  - `Event name` matches `route_import_started|route_import_completed|route_import_failed`

Purpose:

- show whether users are successfully getting GPX data into the app

### 2. Photo Placement Friction

Setup:

- Rows: `Date`
- Values:
  - `Event count`
  - `Average photo_queued_for_manual_placement`
  - `Average photo_picture_count_added`
- Filter:
  - `Event name = photo_import_completed`

Purpose:

- show when uploaded photos need manual placement instead of GPS matching

### 3. Export Reliability

Setup:

- Rows: `Date`, `Event name`
- Values:
  - `Event count`
  - `Total users`
- Filter:
  - `Event name` matches `export_started|export_completed|export_failed|export_cancelled`

Breakdowns to add when custom definitions are available:

- `export_format`
- `export_quality`

Purpose:

- show where users drop off in the export flow

### 4. Performance Monitor

Setup:

- Rows: `Date`, `web_vital_name`
- Values:
  - `Event count`
  - `Average web_vital_value`
- Filter:
  - `Event name = web_vital`

Purpose:

- trend INP, LCP, CLS, FCP, and TTFB over time

## Recommended Default KPI Set

If you only build one dashboard, use these as the top-level cards:

- `Total users`
- `Page views`
- `Route imports completed`
- `Photo imports completed`
- `Exports completed`
- `Export failures`
- `Average queued photos for manual placement`
- `Average INP`
- `Average LCP`

## Important GA4 Notes

- Check `Realtime` first. Standard reports are not immediate.
- Custom dimensions and metrics may take time before they are available in
  explorations and reports.
- If you only look at default reports, custom event parameters will seem to be
  missing.
- Use `Total users` for visitor-style monitoring, not only `Active users`.
