import { query } from '@/lib/db';
import type { InvoiceData } from '@/lib/pdf';

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
    tax: parseFloat(String(invoice.tax ?? 0)),
    discount: parseFloat(String(invoice.discount ?? 0)),
    total_amount: parseFloat(String(invoice.total_amount ?? 0)),
    notes: invoice.notes ? String(invoice.notes) : undefined,
    currency: invoice.currency ? String(invoice.currency) : 'INR',
    currency_symbol: invoice.currency_symbol ? String(invoice.currency_symbol) : '₹',
  };
}

export async function resolveInvoiceProjects(
  invoice: DbRow
): Promise<{ project: { name: string; budget: number } | null; projects: Array<{ name: string; budget: number }> }> {
  let project: { name: string; budget: number } | null = null;
  let projects: Array<{ name: string; budget: number }> = [];

  if (invoice.project_id) {
    const row = await query('SELECT * FROM projects WHERE id = ?', [invoice.project_id]);
    if (row[0]) {
      project = {
        name: String((row[0] as DbRow).name),
        budget: parseFloat(String((row[0] as DbRow).budget ?? 0)),
      };
    }
  }

  if (invoice.project_ids) {
    try {
      const projectIds =
        typeof invoice.project_ids === 'string'
          ? JSON.parse(invoice.project_ids)
          : invoice.project_ids;
      if (Array.isArray(projectIds) && projectIds.length > 0) {
        const placeholders = projectIds.map(() => '?').join(',');
        const projectsData = await query(
          `SELECT * FROM projects WHERE id IN (${placeholders})`,
          projectIds
        );
        projects = projectsData.map((p: DbRow) => ({
          name: String(p.name),
          budget: parseFloat(String(p.budget ?? 0)),
        }));
      }
    } catch (e) {
      console.error('Error parsing project_ids:', e);
    }
  }

  if (projects.length === 0 && project) {
    projects = [project];
  }

  return { project, projects };
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
