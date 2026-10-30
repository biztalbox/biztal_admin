-- Company bank account printed on invoices, plus per-invoice print toggle.
-- The app also creates this automatically the first time Settings or an invoice is saved.

CREATE TABLE IF NOT EXISTS company_bank_details (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  account_holder_name VARCHAR(255) NULL,
  bank_name VARCHAR(255) NULL,
  account_number VARCHAR(64) NULL,
  account_type VARCHAR(50) NULL,
  ifsc_code VARCHAR(20) NULL,
  branch_name VARCHAR(255) NULL,
  swift_code VARCHAR(20) NULL,
  upi_id VARCHAR(100) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS print_bank_details TINYINT(1) NOT NULL DEFAULT 1;
