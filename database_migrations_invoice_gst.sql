-- GST breakdown columns for invoices

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS gst_mode VARCHAR(10) NOT NULL DEFAULT 'INTRA' AFTER tax,
  ADD COLUMN IF NOT EXISTS sgst_igst_percent DECIMAL(5, 2) NOT NULL DEFAULT 9.00 AFTER gst_mode,
  ADD COLUMN IF NOT EXISTS cgst_percent DECIMAL(5, 2) NOT NULL DEFAULT 9.00 AFTER sgst_igst_percent,
  ADD COLUMN IF NOT EXISTS sgst_igst_amount DECIMAL(12, 2) NULL AFTER cgst_percent,
  ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(12, 2) NULL AFTER sgst_igst_amount;
