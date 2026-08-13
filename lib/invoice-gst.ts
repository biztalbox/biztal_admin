export type GstMode = 'INTRA' | 'INTER';

export type GstBreakdownInput = {
  amount: number | string;
  discount?: number | string;
  gst_mode?: GstMode | string;
  sgst_igst_percent?: number | string;
  cgst_percent?: number | string;
};

export type GstBreakdownResult = {
  gst_mode: GstMode;
  sgst_igst_percent: number;
  cgst_percent: number;
  sgst_igst_amount: number;
  cgst_amount: number;
  tax: number;
  total_amount: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseNonNegativeNumber(value: number | string | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function normalizeGstMode(value: unknown): GstMode {
  return String(value || '').toUpperCase() === 'INTER' ? 'INTER' : 'INTRA';
}

export function taxAmountFromTaxable(taxable: number, percent: number): number {
  if (!Number.isFinite(taxable) || taxable <= 0) return 0;
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return roundMoney(taxable * percent * 0.01);
}

/** GST on invoice amount; total = amount + tax − discount (same as before). */
export function computeInvoiceGstTotals(input: GstBreakdownInput): GstBreakdownResult {
  const amount = parseNonNegativeNumber(input.amount);
  const discount = parseNonNegativeNumber(input.discount);
  const gst_mode = normalizeGstMode(input.gst_mode);
  const sgst_igst_percent = parseNonNegativeNumber(input.sgst_igst_percent);
  const cgst_percent =
    gst_mode === 'INTRA' ? parseNonNegativeNumber(input.cgst_percent) : 0;

  const sgst_igst_amount = taxAmountFromTaxable(amount, sgst_igst_percent);
  const cgst_amount = gst_mode === 'INTRA' ? taxAmountFromTaxable(amount, cgst_percent) : 0;
  const tax = roundMoney(sgst_igst_amount + cgst_amount);
  const total_amount = roundMoney(amount + tax - discount);

  return {
    gst_mode,
    sgst_igst_percent,
    cgst_percent,
    sgst_igst_amount,
    cgst_amount,
    tax,
    total_amount,
  };
}

export function gstBreakdownFromStoredInvoice(invoice: Record<string, unknown>): GstBreakdownResult {
  const amount = parseNonNegativeNumber(invoice.amount as number | string);
  const discount = parseNonNegativeNumber(invoice.discount as number | string);
  const gst_mode = normalizeGstMode(invoice.gst_mode);

  const hasStoredAmounts =
    invoice.sgst_igst_amount != null || invoice.cgst_amount != null;

  if (hasStoredAmounts) {
    const sgst_igst_amount = roundMoney(parseNonNegativeNumber(invoice.sgst_igst_amount as number | string));
    const cgst_amount = roundMoney(parseNonNegativeNumber(invoice.cgst_amount as number | string));
    const tax = roundMoney(parseNonNegativeNumber(invoice.tax as number | string) || sgst_igst_amount + cgst_amount);
    return {
      gst_mode,
      sgst_igst_percent: parseNonNegativeNumber(invoice.sgst_igst_percent as number | string) || 9,
      cgst_percent: parseNonNegativeNumber(invoice.cgst_percent as number | string) || 9,
      sgst_igst_amount,
      cgst_amount,
      tax,
      total_amount: roundMoney(amount + tax - discount),
    };
  }

  const tax = parseNonNegativeNumber(invoice.tax as number | string);
  if (tax > 0 && amount > 0) {
    if (gst_mode === 'INTER') {
      const pct = roundMoney((tax / amount) * 100);
      return {
        gst_mode: 'INTER',
        sgst_igst_percent: pct,
        cgst_percent: 0,
        sgst_igst_amount: tax,
        cgst_amount: 0,
        tax,
        total_amount: roundMoney(amount + tax - discount),
      };
    }
    const half = roundMoney(tax / 2);
    return {
      gst_mode: 'INTRA',
      sgst_igst_percent: 9,
      cgst_percent: 9,
      sgst_igst_amount: half,
      cgst_amount: roundMoney(tax - half),
      tax,
      total_amount: roundMoney(amount + tax - discount),
    };
  }

  return computeInvoiceGstTotals({
    amount,
    discount,
    gst_mode,
    sgst_igst_percent: (invoice.sgst_igst_percent as number | string | undefined) ?? 9,
    cgst_percent: (invoice.cgst_percent as number | string | undefined) ?? 9,
  });
}
