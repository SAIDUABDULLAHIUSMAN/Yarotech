/*
  # Add Email Notification Settings

  ## Overview
  Adds email notification configuration to enable automatic email alerts when sales are created.

  ## Changes Made

  ### 1. Email Settings Table
  - New table `email_settings` to store email notification configuration
  - Fields:
    - `id` (uuid, primary key): Unique identifier
    - `notification_email` (text): Email address to receive sale notifications (default: info@yarotech.com.ng)
    - `send_on_sale` (boolean): Toggle to enable/disable sale notifications (default: true)
    - `email_subject_template` (text): Template for email subject line
    - `created_at` (timestamptz): Record creation timestamp
    - `updated_at` (timestamptz): Record update timestamp

  ### 2. Initial Data
  - Insert default email notification settings with info@yarotech.com.ng as recipient

  ### 3. Security
  - Enable RLS on `email_settings` table
  - Add policy for admins to read email settings
  - Add policy for admins to update email settings
  - Add policy for authenticated users to read notification email (needed for edge functions)

  ## Important Notes
  - Only one email settings record will be maintained (single-row table pattern)
  - Admins can update notification preferences via settings page
  - Edge functions will use these settings to send notifications
*/

-- Create email_settings table
CREATE TABLE IF NOT EXISTS email_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_email text NOT NULL DEFAULT 'info@yarotech.com.ng',
  send_on_sale boolean DEFAULT true,
  email_subject_template text DEFAULT 'New Sale Receipt - YAROTECH NETWORK LIMITED',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- Insert default email settings if not exists
INSERT INTO email_settings (notification_email, send_on_sale, email_subject_template)
SELECT 'info@yarotech.com.ng', true, 'New Sale Receipt - YAROTECH NETWORK LIMITED'
WHERE NOT EXISTS (SELECT 1 FROM email_settings);

-- RLS Policies for email_settings
CREATE POLICY "Admins can view email settings"
  ON email_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update email settings"
  ON email_settings FOR UPDATE
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

-- Allow authenticated users to read notification email for edge function access
CREATE POLICY "Authenticated users can read notification settings"
  ON email_settings FOR SELECT
  TO authenticated
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_settings_send_on_sale ON email_settings(send_on_sale);
