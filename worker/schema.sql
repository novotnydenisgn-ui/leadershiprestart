-- D1 schéma pro A/B testing (databáze lr-ab)
-- type='goal' = navazující krok trychtýře (vyplněný formulář…); název kroku v cta_pos.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  type TEXT NOT NULL CHECK (type IN ('view','click','goal')),
  test_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  page TEXT,
  cta_pos TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device TEXT,
  visitor TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_agg ON events (test_id, type, variant_id);
CREATE INDEX IF NOT EXISTS idx_events_ts  ON events (test_id, ts);
CREATE INDEX IF NOT EXISTS idx_events_visitor ON events (visitor, cta_pos, ts);
