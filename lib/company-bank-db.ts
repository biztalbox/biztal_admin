import { execute, queryOne } from '@/lib/db';
import {
  type CompanyBankDetails,
  EMPTY_COMPANY_BANK,
  normalizeCompanyBank,
  shouldPrintBankDetails,
  validateCompanyBank,
} from '@/lib/company-bank';

const ROW_ID = 'default';

let schemaReady: Promise<void> | null = null;

async function ensureOnce(): Promise<void> {
  await execute(
    `CREATE TABLE IF NOT EXISTS company_bank_details (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  const column = await queryOne(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'invoices'
       AND COLUMN_NAME = 'print_bank_details'`
  );

  if (!column) {
    try {
      await execute(
        `ALTER TABLE invoices ADD COLUMN print_bank_details TINYINT(1) NOT NULL DEFAULT 1`
      );
    } catch (error: any) {
      const message = String(error?.message || '');
      if (!message.toLowerCase().includes('duplicate column')) throw error;
    }
  }
}

export function ensureCompanyBankSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = ensureOnce().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export async function getCompanyBank(): Promise<CompanyBankDetails> {
  await ensureCompanyBankSchema();
  const row = await queryOne('SELECT * FROM company_bank_details WHERE id = ?', [ROW_ID]);
  if (!row) return { ...EMPTY_COMPANY_BANK };
  return normalizeCompanyBank(row);
}

export async function saveCompanyBank(input: Partial<CompanyBankDetails>): Promise<CompanyBankDetails> {
  const bank = normalizeCompanyBank(input);
  const error = validateCompanyBank(bank);
  if (error) {
    const validationError = new Error(error) as Error & { status?: number };
    validationError.status = 400;
    throw validationError;
  }

  await ensureCompanyBankSchema();
  await execute(
    `INSERT INTO company_bank_details (
       id, account_holder_name, bank_name, account_number, account_type,
       ifsc_code, branch_name, swift_code, upi_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       account_holder_name = VALUES(account_holder_name),
       bank_name = VALUES(bank_name),
       account_number = VALUES(account_number),
       account_type = VALUES(account_type),
       ifsc_code = VALUES(ifsc_code),
       branch_name = VALUES(branch_name),
       swift_code = VALUES(swift_code),
       upi_id = VALUES(upi_id)`,
    [
      ROW_ID,
      bank.account_holder_name,
      bank.bank_name,
      bank.account_number,
      bank.account_type,
      bank.ifsc_code,
      bank.branch_name,
      bank.swift_code || null,
      bank.upi_id || null,
    ]
  );

  return bank;
}

export async function bankForInvoicePdf(printFlag: unknown): Promise<CompanyBankDetails | undefined> {
  if (!shouldPrintBankDetails(printFlag)) return undefined;
  return getCompanyBank();
}
