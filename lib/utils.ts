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

