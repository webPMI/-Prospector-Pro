-- Esquema SQL para Base de Datos Cloudflare D1
-- Prospector & Auditor de Leads Pro

CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  address TEXT,
  website TEXT,
  status TEXT DEFAULT 'pendiente',
  audit_status TEXT,
  audit_label TEXT,
  score INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronce',
  whatsapp TEXT,
  google_maps TEXT,
  lat REAL,
  lon REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects(score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_city ON prospects(city);
CREATE INDEX IF NOT EXISTS idx_prospects_tier ON prospects(tier);
