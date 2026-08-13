-- P.O. fields and optional signature image for invoice PDF (run once on your invoices DB)

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS po_no VARCHAR(255) NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS po_date DATE NULL AFTER po_no,
  ADD COLUMN IF NOT EXISTS signature_image LONGTEXT NULL AFTER po_date;
