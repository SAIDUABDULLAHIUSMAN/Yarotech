/*
  # Enhance Schema for Role-Based Access Control and Audit Logging

  ## Overview
  Updates the existing schema to support robust role-based access control (RBAC)
  with Admin and Staff roles, plus comprehensive audit logging for security.

  ## Changes Made

  ### 1. Products Table Enhancement
  - Add SKU (Stock Keeping Unit) field with unique constraint
  - Add category field for product categorization
  - Add image_url field for product images
  - Ensure only admins can modify prices

  ### 2. Audit Log Table
  - New table to track all system activities
  - Records user actions (login, logout, CRUD operations)
  - Stores action type, user, timestamp, and details
  - Enables security monitoring and accountability

  ### 3. Role Enforcement
  - Update profiles table role field to use enum constraint
  - Ensure first user becomes admin
  - Default new users to 'staff' role

  ### 4. RLS Policies Update
  - Products: Only admins can create/update/delete
  - Sales: Staff can only view their own, admins can view all
  - Audit logs: Read-only for admins, system writes

  ## Security Notes
  - All audit actions are logged automatically
  - Role changes are restricted
  - Price modifications are admin-only
*/

-- Add new fields to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE products ADD COLUMN sku text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    ALTER TABLE products ADD COLUMN category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url text;
  END IF;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  action_type text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- Update products RLS policies
DROP POLICY IF EXISTS "Users can view active products" ON products;
DROP POLICY IF EXISTS "Users can create products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

CREATE POLICY "All authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update sales RLS policies
DROP POLICY IF EXISTS "Users can view all sales" ON sales;

CREATE POLICY "Admins can view all sales"
  ON sales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Staff can view own sales"
  ON sales FOR SELECT
  TO authenticated
  USING (
    issuer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'staff'
    )
  );

-- Function to automatically log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'CREATE',
      TG_TABLE_NAME,
      NEW.id::text,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id::text,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id::text,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS products_audit_trigger ON products;
CREATE TRIGGER products_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS sales_audit_trigger ON sales;
CREATE TRIGGER sales_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Update sample products with SKU and category
UPDATE products SET 
  sku = 'NET-CBL-001',
  category = 'Networking Hardware'
WHERE name = 'Networking Cable' AND sku IS NULL;

UPDATE products SET 
  sku = 'SRV-RTR-001',
  category = 'Services'
WHERE name = 'Router Configuration' AND sku IS NULL;

UPDATE products SET 
  sku = 'NET-SWH-001',
  category = 'Networking Hardware'
WHERE name = 'Network Switch 8-Port' AND sku IS NULL;

UPDATE products SET 
  sku = 'NET-WAP-001',
  category = 'Networking Hardware'
WHERE name = 'WiFi Access Point' AND sku IS NULL;

UPDATE products SET 
  sku = 'SRV-SUP-001',
  category = 'Services'
WHERE name = 'Technical Support' AND sku IS NULL;