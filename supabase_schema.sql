-- ==========================================================================
-- GAMEVAULT DATABASE SETUP SCHEMA
-- Copy and run this script in your Supabase SQL Editor.
-- ==========================================================================

-- 1. Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  name TEXT PRIMARY KEY,
  "dateAdded" NUMERIC NOT NULL,
  color TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true
);

-- 2. Create platforms table
CREATE TABLE IF NOT EXISTS platforms (
  name TEXT PRIMARY KEY,
  "dateAdded" NUMERIC NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true
);

-- 3. Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  key TEXT NOT NULL,
  cost NUMERIC(10, 2) NOT NULL,
  source TEXT NOT NULL,
  "purchaseDate" TEXT NOT NULL,
  "imageUrl" TEXT,
  status TEXT NOT NULL DEFAULT 'Available',
  notes TEXT,
  publisher TEXT
);

-- 4. Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY REFERENCES inventory(id) ON DELETE CASCADE,
  "inventoryId" TEXT NOT NULL,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  cost NUMERIC(10, 2) NOT NULL,
  "sellPrice" NUMERIC(10, 2) NOT NULL,
  "platformSold" TEXT NOT NULL,
  fees NUMERIC(10, 2) NOT NULL DEFAULT 0,
  profit NUMERIC(10, 2) NOT NULL,
  "saleDate" TEXT NOT NULL,
  notes TEXT,
  disputed BOOLEAN NOT NULL DEFAULT false
);

-- 5. Create menu_customization table
CREATE TABLE IF NOT EXISTS menu_customization (
  key TEXT PRIMARY KEY,
  icon TEXT NOT NULL,
  title TEXT NOT NULL
);

-- 6. Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures public anon access if RLS is enabled in your database settings.
-- ==========================================================================

-- Enable RLS & create policies for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON suppliers;
CREATE POLICY "Anon Select" ON suppliers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON suppliers;
CREATE POLICY "Anon Insert" ON suppliers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON suppliers;
CREATE POLICY "Anon Update" ON suppliers FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON suppliers;
CREATE POLICY "Anon Delete" ON suppliers FOR DELETE USING (true);

-- Enable RLS & create policies for platforms
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON platforms;
CREATE POLICY "Anon Select" ON platforms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON platforms;
CREATE POLICY "Anon Insert" ON platforms FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON platforms;
CREATE POLICY "Anon Update" ON platforms FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON platforms;
CREATE POLICY "Anon Delete" ON platforms FOR DELETE USING (true);

-- Enable RLS & create policies for inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON inventory;
CREATE POLICY "Anon Select" ON inventory FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON inventory;
CREATE POLICY "Anon Insert" ON inventory FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON inventory;
CREATE POLICY "Anon Update" ON inventory FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON inventory;
CREATE POLICY "Anon Delete" ON inventory FOR DELETE USING (true);

-- Enable RLS & create policies for sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON sales;
CREATE POLICY "Anon Select" ON sales FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON sales;
CREATE POLICY "Anon Insert" ON sales FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON sales;
CREATE POLICY "Anon Update" ON sales FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON sales;
CREATE POLICY "Anon Delete" ON sales FOR DELETE USING (true);

-- Enable RLS & create policies for menu_customization
ALTER TABLE menu_customization ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON menu_customization;
CREATE POLICY "Anon Select" ON menu_customization FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON menu_customization;
CREATE POLICY "Anon Insert" ON menu_customization FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON menu_customization;
CREATE POLICY "Anon Update" ON menu_customization FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON menu_customization;
CREATE POLICY "Anon Delete" ON menu_customization FOR DELETE USING (true);

-- Enable RLS & create policies for app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Select" ON app_settings;
CREATE POLICY "Anon Select" ON app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon Insert" ON app_settings;
CREATE POLICY "Anon Insert" ON app_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon Update" ON app_settings;
CREATE POLICY "Anon Update" ON app_settings FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anon Delete" ON app_settings;
CREATE POLICY "Anon Delete" ON app_settings FOR DELETE USING (true);
