import type { InvoiceData } from '@/lib/pdf';
import { gstBreakdownFromStoredInvoice } from '@/lib/invoice-gst';

type DbRow = Record<string, unknown>;

export function assembleInvoicePdfData(
  invoice: DbRow,
  client: DbRow,
  options: {
    project?: { name: string; budget: number } | null;
    projects?: Array<{ name: string; budget: number }>;
    items?: InvoiceData['items'];
  } = {}
): InvoiceData {
  const gst = gstBreakdownFromStoredInvoice(invoice);
  return {
    invoice_number: String(invoice.invoice_number),
    issued_date: invoice.issued_date ? String(invoice.issued_date) : undefined,
    due_date: invoice.due_date ? String(invoice.due_date) : undefined,
    po_no: invoice.po_no ? String(invoice.po_no) : undefined,
    po_date: invoice.po_date ? String(invoice.po_date) : undefined,
    signature_image: invoice.signature_image ? String(invoice.signature_image) : undefined,
    client: {
      name: String(client.name ?? ''),
      company: client.company ? String(client.company) : undefined,
      email: client.email ? String(client.email) : undefined,
      phone: client.phone ? String(client.phone) : undefined,
      address: client.address ? String(client.address) : undefined,
      city: client.city ? String(client.city) : undefined,
      state: client.state ? String(client.state) : undefined,
      zip_code: client.zip_code ? String(client.zip_code) : undefined,
      country: client.country ? String(client.country) : undefined,
      gst_no: client.gst_no ? String(client.gst_no) : undefined,
    },
    project: options.project ?? null,
    projects: options.projects && options.projects.length > 0 ? options.projects : undefined,
    items: options.items ?? undefined,
    amount: parseFloat(String(invoice.amount ?? 0)),
    tax: gst.tax,
    gst_mode: gst.gst_mode,
    sgst_igst_percent: gst.sgst_igst_percent,
    cgst_percent: gst.cgst_percent,
    sgst_igst_amount: gst.sgst_igst_amount,
    cgst_amount: gst.cgst_amount,
    discount: parseFloat(String(invoice.discount ?? 0)),
    total_amount: parseFloat(String(invoice.total_amount ?? gst.total_amount)),
    notes: invoice.notes ? String(invoice.notes) : undefined,
    currency: invoice.currency ? String(invoice.currency) : 'INR',
    currency_symbol: invoice.currency_symbol ? String(invoice.currency_symbol) : '₹',
  };
}

export function parseInvoiceItems(invoice: DbRow): InvoiceData['items'] {
  if (!invoice.items) return undefined;
  try {
    const parsed =
      typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
