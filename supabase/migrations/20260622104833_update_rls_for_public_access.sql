DROP POLICY IF EXISTS "select_categories" ON categories;
DROP POLICY IF EXISTS "insert_categories" ON categories;
DROP POLICY IF EXISTS "update_categories" ON categories;
DROP POLICY IF EXISTS "delete_categories" ON categories;

CREATE POLICY "select_categories_public" ON categories FOR SELECT USING (true);
CREATE POLICY "insert_categories_public" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "update_categories_public" ON categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "delete_categories_public" ON categories FOR DELETE USING (true);

DROP POLICY IF EXISTS "select_products" ON products;
DROP POLICY IF EXISTS "insert_products" ON products;
DROP POLICY IF EXISTS "update_products" ON products;
DROP POLICY IF EXISTS "delete_products" ON products;

CREATE POLICY "select_products_public" ON products FOR SELECT USING (true);
CREATE POLICY "insert_products_public" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "update_products_public" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "delete_products_public" ON products FOR DELETE USING (true);