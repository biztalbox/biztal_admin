import type { PoolConnection } from 'mysql2/promise';
import { beginTransaction, commit, rollback } from '@/lib/db';

/** BINV + Mon (3 letters) + DD + YY + 4-digit daily sequence, e.g. BINVAug13260001 */
export function getInvoicePrefix(now = new Date()): string {
  const month3 = now.toLocaleString('en-US', { month: 'short' }).slice(0, 3);
  const day = String(now.getDate()).padStart(2, '0');
  const year2 = String(now.getFullYear()).slice(-2);
  return `BINV${month3}${day}${year2}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getNextInvoiceNumberInTx(
  connection: PoolConnection,
  prefix: string
): Promise<string> {
  const like = `${prefix}%`;
  const [rows] = await connection.execute(
    'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1 FOR UPDATE',
    [like]
  );

  const last = Array.isArray(rows) && rows.length > 0 ? (rows as any[])[0]?.invoice_number : null;
  let nextSeq = 1;

  if (typeof last === 'string') {
    const match = last.match(new RegExp(`^${escapeRegExp(prefix)}(\\d{4})$`));
    if (match?.[1]) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n)) nextSeq = n + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

export async function peekNextInvoiceNumber(): Promise<string> {
  const connection = await beginTransaction();
  try {
    const prefix = getInvoicePrefix(new Date());
    const invoice_number = await getNextInvoiceNumberInTx(connection, prefix);
    await commit(connection);
    return invoice_number;
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}
