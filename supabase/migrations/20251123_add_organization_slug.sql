-- Add slug column and ensure default organization rows
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slug using lowercased name (safe for existing rows)
UPDATE organizations
SET slug = COALESCE(slug, regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'));

-- Unique index for slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Ensure baseline orgs exist for local dev
INSERT INTO organizations (id, name, type, owner_id, settings, slug)
VALUES (
  '3d82170f-5cb8-4625-8be2-9ddd9d5ba0f3',
  'GoldPen Academy',
  'academy',
  NULL,
  '{}'::jsonb,
  'goldpen'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO organizations (id, name, type, owner_id, settings, slug)
VALUES (
  '11111111-2222-3333-4444-555555555555',
  'Demo School',
  'academy',
  NULL,
  '{}'::jsonb,
  'demoschool'
)
ON CONFLICT (slug) DO NOTHING;
