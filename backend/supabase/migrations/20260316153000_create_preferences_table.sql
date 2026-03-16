-- Preferences: personal likes/dislikes (movies/anime/music/food/etc.)
-- Used to ground answers to “do you like X?” without guessing.

CREATE TABLE IF NOT EXISTS preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  category    TEXT NOT NULL,         -- e.g. movies, anime, music, food, hobbies
  title       TEXT NOT NULL,          -- e.g. "Anime", "Movies"
  content     TEXT NOT NULL,          -- freeform, editable
  tags        TEXT[],
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Public read, admin write (mirrors other knowledge tables)
CREATE POLICY "preferences_public_read" ON preferences FOR SELECT USING (is_active = true);
CREATE POLICY "preferences_auth_write" ON preferences FOR ALL USING (auth.role() = 'authenticated');

