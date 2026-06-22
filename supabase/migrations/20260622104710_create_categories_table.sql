CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_categories" ON categories FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_categories" ON categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_categories" ON categories FOR DELETE
  TO authenticated USING (true);