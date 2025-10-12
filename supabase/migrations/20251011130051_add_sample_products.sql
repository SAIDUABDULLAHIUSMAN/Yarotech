/*
  # Add Sample Products

  ## Overview
  Inserts sample products into the products table for testing and demonstration purposes.

  ## Changes
  - Inserts 5 sample products with realistic names and prices
  - Products are marked as active by default
  - No created_by user since these are system-generated defaults
*/

INSERT INTO products (name, description, unit_price, stock_quantity, is_active)
VALUES 
  ('Networking Cable', 'Cat6 Ethernet Cable - 10m', 5000.00, 100, true),
  ('Router Configuration', 'Professional router setup and configuration service', 15000.00, 0, true),
  ('Network Switch 8-Port', '8-Port Gigabit Network Switch', 25000.00, 20, true),
  ('WiFi Access Point', 'Dual-band wireless access point', 35000.00, 15, true),
  ('Technical Support', 'Hourly technical support and troubleshooting', 8000.00, 0, true)
ON CONFLICT (id) DO NOTHING;
