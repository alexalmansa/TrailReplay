-- Lead capture and studio export delivery.
--
-- Two concerns deliberately share one database but not one table: `leads` is
-- the durable person-level record (one row per email address, ever), while
-- `export_jobs` is per-render and disposable once its object has expired.

CREATE TABLE IF NOT EXISTS leads (
  email TEXT PRIMARY KEY,                  -- lowercased and trimmed at write time
  created_at TEXT NOT NULL,
  locale TEXT,
  country TEXT,                            -- request.cf.country at signup

  -- Marketing consent is tracked separately from delivery. A lead with
  -- marketing_opted_in_at set has ticked the box; only one that also has
  -- marketing_confirmed_at set has completed double opt-in and may be mailed.
  marketing_opted_in_at TEXT,
  marketing_confirmed_at TEXT,
  marketing_unsubscribed_at TEXT,

  -- What they actually agreed to, so a consent claim can be evidenced later.
  consent_text_version TEXT,
  -- Whether the box was pre-ticked for this lead. Pre-ticking is only applied
  -- outside the EU/EEA/UK (see functions-lib/consent.js), and recording it per
  -- row is what makes that decision auditable after the fact.
  consent_default_ticked INTEGER NOT NULL DEFAULT 0,
  consent_ip TEXT,

  -- Only hashes are stored: a database leak must not yield working confirm or
  -- unsubscribe links.
  confirm_token_hash TEXT,
  unsubscribe_token_hash TEXT,

  export_count INTEGER NOT NULL DEFAULT 0,
  last_export_at TEXT
);

-- The mailing list itself. Partial index so the common query stays index-only
-- as the table grows past the marketable subset.
CREATE INDEX IF NOT EXISTS idx_leads_marketable
  ON leads(marketing_confirmed_at)
  WHERE marketing_confirmed_at IS NOT NULL
    AND marketing_unsubscribed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_confirm_token ON leads(confirm_token_hash);
CREATE INDEX IF NOT EXISTS idx_leads_unsubscribe_token ON leads(unsubscribe_token_hash);

CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,                     -- uuid, also the R2 object name
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,

  -- pending  : row created, browser is rendering
  -- uploaded : object is in R2, email not yet sent
  -- emailing : delivery request is in flight
  -- emailed  : delivery mail accepted by the provider
  -- failed   : gave up; `error` says why
  status TEXT NOT NULL DEFAULT 'pending',

  object_key TEXT,
  size_bytes INTEGER,

  -- Render settings, kept for support ("my video looked wrong") and for
  -- knowing which settings people actually pick.
  quality TEXT,
  quality_mode TEXT,
  aspect_ratio TEXT,
  fps INTEGER,
  duration_ms INTEGER,

  -- Proves the caller owns this job when uploading and completing it, and
  -- authorises the download link. Hashed, like the consent tokens.
  job_token_hash TEXT NOT NULL,

  client_ip TEXT,                          -- rate limiting only
  expires_at TEXT NOT NULL,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_email ON export_jobs(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status, created_at);
-- Supports the per-IP job quota check on every create.
CREATE INDEX IF NOT EXISTS idx_export_jobs_client_ip ON export_jobs(client_ip, created_at);
