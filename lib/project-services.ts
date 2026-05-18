import type { PoolConnection } from 'mysql2/promise';
import { query } from '@/lib/db';
import { generateId } from '@/lib/utils';

export type ProjectServiceLine = {
  matrix_item_id: string;
  label: string;
  quantity: number;
  remarks: string | null;
};

export type ProjectServiceGroup = {
  service_id: string;
  service_name: string;
  sort_order: number;
  lines: ProjectServiceLine[];
};

export type ServiceMatrixInput = {
  matrix_item_id: string;
  enabled?: boolean;
  quantity?: number | string | null;
  remarks?: string | null;
};

export type ServiceInput = {
  service_id: string;
  enabled?: boolean;
  matrix?: ServiceMatrixInput[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function normalizeServicesInput(raw: unknown): ServiceInput[] {
  if (!Array.isArray(raw)) return [];
  const out: ServiceInput[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const serviceId = item.service_id;
    if (typeof serviceId !== 'string' || !serviceId.trim()) continue;
    const matrixRaw = item.matrix;
    const matrix: ServiceMatrixInput[] = [];
    if (Array.isArray(matrixRaw)) {
      for (const m of matrixRaw) {
        if (!isRecord(m)) continue;
        const matrixItemId = m.matrix_item_id;
        if (typeof matrixItemId !== 'string' || !matrixItemId.trim()) continue;
        matrix.push({
          matrix_item_id: matrixItemId,
          enabled: Boolean(m.enabled),
          quantity: m.quantity as ServiceMatrixInput['quantity'],
          remarks: typeof m.remarks === 'string' ? m.remarks : null,
        });
      }
    }
    out.push({
      service_id: serviceId,
      enabled: Boolean(item.enabled),
      matrix,
    });
  }
  return out;
}

export async function fetchProjectServicesDetail(
  projectId: string
): Promise<ProjectServiceGroup[]> {
  const svcRows = await query(
    `SELECT ps.service_id, s.name AS service_name, s.sort_order AS service_sort_order
     FROM project_services ps
     INNER JOIN services s ON s.id = ps.service_id
     WHERE ps.project_id = ?
     ORDER BY s.sort_order ASC, s.name ASC`,
    [projectId]
  );

  const lineRows = await query(
    `SELECT l.matrix_item_id, smi.service_id, smi.label AS matrix_label,
            smi.sort_order AS matrix_sort_order, l.quantity, l.remarks
     FROM project_service_matrix_lines l
     INNER JOIN service_matrix_items smi ON smi.id = l.matrix_item_id
     WHERE l.project_id = ?
     ORDER BY smi.sort_order ASC, smi.label ASC`,
    [projectId]
  );

  const linesByService = new Map<string, ProjectServiceLine[]>();
  for (const row of lineRows as any[]) {
    const sid = row.service_id as string;
    const arr = linesByService.get(sid) ?? [];
    arr.push({
      matrix_item_id: row.matrix_item_id,
      label: row.matrix_label,
      quantity: Number(row.quantity),
      remarks: row.remarks ?? null,
    });
    linesByService.set(sid, arr);
  }

  return (svcRows as any[]).map((r) => ({
    service_id: r.service_id,
    service_name: r.service_name,
    sort_order: Number(r.service_sort_order) || 0,
    lines: linesByService.get(r.service_id as string) ?? [],
  }));
}

export async function syncProjectServicesDeliverables(
  conn: PoolConnection,
  projectId: string,
  servicesInputRaw: unknown
): Promise<void> {
  await conn.execute('DELETE FROM project_service_matrix_lines WHERE project_id = ?', [
    projectId,
  ]);
  await conn.execute('DELETE FROM project_services WHERE project_id = ?', [projectId]);

  const servicesInput = normalizeServicesInput(servicesInputRaw);
  for (const svc of servicesInput) {
    if (!svc.enabled) continue;

    const [svcRows] = await conn.execute(
      'SELECT id FROM services WHERE id = ? AND is_active = 1',
      [svc.service_id]
    );
    if (!Array.isArray(svcRows) || svcRows.length === 0) {
      throw new Error(`Unknown or inactive service: ${svc.service_id}`);
    }

    await conn.execute(
      `INSERT INTO project_services (project_id, service_id) VALUES (?, ?)`,
      [projectId, svc.service_id]
    );

    const matrixList = svc.matrix ?? [];
    for (const row of matrixList) {
      if (!row.enabled) continue;
      const [miRows] = await conn.execute(
        `SELECT id FROM service_matrix_items
         WHERE id = ? AND service_id = ? AND is_active = 1`,
        [row.matrix_item_id, svc.service_id]
      );
      if (!Array.isArray(miRows) || miRows.length === 0) {
        throw new Error(`Invalid matrix item for this service: ${row.matrix_item_id}`);
      }

      const qtyParsed =
        row.quantity === undefined || row.quantity === null || row.quantity === ''
          ? NaN
          : typeof row.quantity === 'number'
            ? row.quantity
            : parseInt(String(row.quantity).trim(), 10);
      if (!Number.isFinite(qtyParsed) || qtyParsed < 1) {
        throw new Error(`Quantity must be at least 1 for "${row.matrix_item_id}"`);
      }

      let remarksStr: string | null = null;
      if (row.remarks != null && String(row.remarks).trim() !== '') {
        remarksStr = String(row.remarks).trim();
      }

      await conn.execute(
        `INSERT INTO project_service_matrix_lines
         (id, project_id, matrix_item_id, quantity, remarks)
         VALUES (?, ?, ?, ?, ?)`,
        [generateId(), projectId, row.matrix_item_id, qtyParsed, remarksStr]
      );
    }
  }
}
