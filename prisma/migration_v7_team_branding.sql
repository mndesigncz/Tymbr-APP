-- Team branding: custom accent color + logo (data URL)
ALTER TABLE "Team"
  ADD COLUMN IF NOT EXISTS "color" TEXT,
  ADD COLUMN IF NOT EXISTS "logo" TEXT;
