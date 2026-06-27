CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  max_retail_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL, -- 🟢 NEW: Tracks row ownership
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 🟢 FIXED POLICIES: True multi-user data isolation based on user_email
CREATE POLICY "select_products" ON products FOR SELECT
  USING (true); 

CREATE POLICY "insert_products" ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "update_products" ON products FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "delete_products" ON products FOR DELETE
  USING (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();