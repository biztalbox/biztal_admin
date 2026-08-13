import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Re-export generateId for use in db.ts
export { generateId as generateIdFromUtils };

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function taxAmountFromPercent(amount: number, taxPercent: number): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  if (!Number.isFinite(taxPercent) || taxPercent < 0) return 0;
  return Math.round(amount * taxPercent * 0.01 * 100) / 100;
}

export function taxPercentFromAmountAndTax(amount: number, tax: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '0';
  if (!Number.isFinite(tax) || tax <= 0) return '0';
  const pct = (tax / amount) * 100;
  const rounded = Math.round(pct * 100) / 100;
  return String(rounded);
}

export function invoiceTotalsFromParts(
  amount: number,
  taxPercent: number,
  discount: number
): { tax: string; total_amount: string } {
  const tax = taxAmountFromPercent(amount, taxPercent);
  const total = Math.round((amount + tax - discount) * 100) / 100;
  return { tax: tax.toFixed(2), total_amount: total.toFixed(2) };
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

/** Comma-separated secondary emails → unique list for CC; drops duplicates and the primary `to` address. */
export function parseSecondaryEmailsForCc(
  raw: string | null | undefined,
  primaryEmail?: string | null
): string[] {
  if (!raw || !String(raw).trim()) return [];
  const primary = primaryEmail?.trim().toLowerCase() || '';
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw).split(',')) {
    const e = part.trim();
    if (!e) continue;
    const key = e.toLowerCase();
    if (primary && key === primary) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export function readImageFileAsDataUrl(file: File, maxBytes = 512000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please upload a PNG or JPEG image'));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error('Image must be smaller than 500 KB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

