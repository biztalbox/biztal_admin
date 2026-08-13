import { query } from '@/lib/db';
import {
  assembleInvoicePdfData,
  parseInvoiceItems,
} from '@/lib/invoice-pdf-assemble';

export { assembleInvoicePdfData, parseInvoiceItems };

type DbRow = Record<string, unknown>;

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
