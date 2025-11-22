-- Add currency columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR' AFTER items,
ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '₹' AFTER currency;

