-- File visibility: 'team' (default, all members), 'private' (creator only)
ALTER TABLE "TeamFile" ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'team';
