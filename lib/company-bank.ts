export interface CompanyBankDetails {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  ifsc_code: string;
  branch_name: string;
  swift_code: string;
  upi_id: string;
}

export const EMPTY_COMPANY_BANK: CompanyBankDetails = {
  account_holder_name: '',
  bank_name: '',
  account_number: '',
  account_type: 'Current',
  ifsc_code: '',
  branch_name: '',
  swift_code: '',
  upi_id: '',
};

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_PATTERN = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
const UPI_PATTERN = /^[\w.]{2,}@[a-zA-Z]{2,64}$/;

function text(value: unknown): string {
  return String(value ?? '').trim();
}

export function normalizeCompanyBank(input: Partial<CompanyBankDetails> | null | undefined): CompanyBankDetails {
  const accountNumber = text(input?.account_number).replace(/[\s-]/g, '');
  return {
    account_holder_name: text(input?.account_holder_name),
    bank_name: text(input?.bank_name),
    account_number: accountNumber,
    account_type: text(input?.account_type) || 'Current',
    ifsc_code: text(input?.ifsc_code).toUpperCase().replace(/\s/g, ''),
    branch_name: text(input?.branch_name),
    swift_code: text(input?.swift_code).toUpperCase().replace(/\s/g, ''),
    upi_id: text(input?.upi_id).replace(/\s/g, ''),
  };
}

export function validateCompanyBank(bank: CompanyBankDetails): string | null {
  if (!bank.account_holder_name) return 'Account holder name is required';
  if (bank.account_holder_name.length > 255) return 'Account holder name is too long';
  if (!bank.bank_name) return 'Bank name is required';
  if (bank.bank_name.length > 255) return 'Bank name is too long';
  if (!bank.account_number) return 'Account number is required';
  if (!/^\d{9,18}$/.test(bank.account_number)) {
    return 'Account number must be 9 to 18 digits';
  }
  if (!bank.branch_name) return 'Branch name is required';
  if (bank.branch_name.length > 255) return 'Branch name is too long';
  if (!IFSC_PATTERN.test(bank.ifsc_code)) {
    return 'IFSC must be 11 characters, like HDFC0001234';
  }
  if (bank.swift_code && !SWIFT_PATTERN.test(bank.swift_code)) {
    return 'SWIFT code must be 8 or 11 characters';
  }
  if (bank.upi_id && !UPI_PATTERN.test(bank.upi_id)) {
    return 'UPI ID should look like name@bank';
  }
  if (bank.account_type.length > 50) return 'Account type is too long';
  return null;
}

function formatAccountType(value: string): string {
  const type = value.trim();
  if (!type) return '';
  if (/account/i.test(type)) return type;
  return `${type} Account`;
}

export function printableBankRows(bank: CompanyBankDetails | null | undefined): Array<{ label: string; value: string }> {
  if (!bank) return [];
  const rows: Array<[string, string]> = [
    ["A/c Holder's Name", bank.account_holder_name],
    ['Bank Name', bank.bank_name],
    ['A/c No.', bank.account_number],
    ['Account Type', formatAccountType(bank.account_type)],
    ['Branch', bank.branch_name],
    ['IFSC Code', bank.ifsc_code],
    ['SWIFT Code', bank.swift_code],
    ['UPI ID', bank.upi_id],
  ];
  const filled = rows
    .map(([label, value]) => ({ label, value: value.trim() }))
    .filter((row) => row.value.length > 0);
  const hasPaymentAccount = Boolean(
    bank.account_holder_name || bank.bank_name || bank.account_number || bank.ifsc_code || bank.branch_name
  );
  return hasPaymentAccount ? filled : [];
}

export function isBankConfigured(bank: CompanyBankDetails | null | undefined): boolean {
  if (!bank) return false;
  return Boolean(
    bank.account_holder_name &&
      bank.bank_name &&
      bank.account_number &&
      bank.ifsc_code &&
      bank.branch_name
  );
}

/** Missing value means print. Explicit false / 0 means hide. */
export function shouldPrintBankDetails(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return true;
}
