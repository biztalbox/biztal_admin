'use client';

import { useCallback } from 'react';
import type { ProjectServiceGroup, ServiceInput } from '@/lib/project-services';

export type CatalogMatrixItem = { id: string; label: string; sort_order: number };
export type CatalogService = {
  id: string;
  name: string;
  sort_order: number;
  matrix_items: CatalogMatrixItem[];
};

export type MatrixLineDraft = {
  selected: boolean;
  quantity: string;
  remarks: string;
};

export type ServicesDraftState = Record<
  string,
  { enabled: boolean; matrix: Record<string, MatrixLineDraft> }
>;

export function buildEmptyDraft(catalog: CatalogService[]): ServicesDraftState {
  const state: ServicesDraftState = {};
  for (const s of catalog) {
    const matrix: Record<string, MatrixLineDraft> = {};
    for (const m of s.matrix_items) {
      matrix[m.id] = { selected: false, quantity: '', remarks: '' };
    }
    state[s.id] = { enabled: false, matrix };
  }
  return state;
}

export function draftFromSaved(
  catalog: CatalogService[],
  saved: ProjectServiceGroup[]
): ServicesDraftState {
  const draft = buildEmptyDraft(catalog);
  for (const grp of saved) {
    const block = draft[grp.service_id];
    if (!block) continue;
    block.enabled = true;
    for (const line of grp.lines) {
      const cell = block.matrix[line.matrix_item_id];
      if (!cell) continue;
      cell.selected = true;
      cell.quantity = String(line.quantity);
      cell.remarks = line.remarks ?? '';
    }
  }
  return draft;
}

export function draftToPayload(
  catalog: CatalogService[],
  draft: ServicesDraftState
): ServiceInput[] {
  const list: ServiceInput[] = [];
  for (const s of catalog) {
    const d = draft[s.id];
    if (!d) continue;
    const matrix = s.matrix_items.map((mi) => {
      const row = d.matrix[mi.id] ?? {
        selected: false,
        quantity: '',
        remarks: '',
      };
      return {
        matrix_item_id: mi.id,
        enabled: row.selected,
        quantity: row.selected ? row.quantity : null,
        remarks: row.selected ? row.remarks : null,
      };
    });
    list.push({ service_id: s.id, enabled: d.enabled, matrix });
  }
  return list;
}

export function validateServicesDraft(
  catalog: CatalogService[],
  draft: ServicesDraftState
): string | null {
  for (const s of catalog) {
    const d = draft[s.id];
    if (!d?.enabled) continue;
    for (const mi of s.matrix_items) {
      const row = d.matrix[mi.id];
      if (!row?.selected) continue;
      const trimmed = String(row.quantity ?? '').trim();
      if (trimmed === '') {
        return `Quantity is required for "${mi.label}" (${s.name})`;
      }
      const n = parseInt(trimmed, 10);
      if (!Number.isFinite(n) || n < 1) {
        return `Quantity must be a whole number ≥ 1 for "${mi.label}" (${s.name})`;
      }
    }
  }
  return null;
}

type Props = {
  catalog: CatalogService[];
  value: ServicesDraftState;
  onChange: (next: ServicesDraftState) => void;
};

export default function ProjectServicesForm({ catalog, value, onChange }: Props) {
  const setMatrixRow = useCallback(
    (serviceId: string, matrixId: string, patch: Partial<MatrixLineDraft>) => {
      const cur = value[serviceId];
      if (!cur) return;
      const row = cur.matrix[matrixId];
      if (!row) return;
      const nextMatrix = { ...cur.matrix, [matrixId]: { ...row, ...patch } };
      onChange({ ...value, [serviceId]: { ...cur, matrix: nextMatrix } });
    },
    [onChange, value]
  );

  const setServiceEnabled = useCallback(
    (serviceId: string, enabled: boolean) => {
      const cur = value[serviceId];
      if (!cur) return;
      if (!enabled) {
        const cleared: Record<string, MatrixLineDraft> = {};
        for (const k of Object.keys(cur.matrix)) {
          cleared[k] = {
            selected: false,
            quantity: '',
            remarks: '',
          };
        }
        onChange({ ...value, [serviceId]: { enabled: false, matrix: cleared } });
        return;
      }
      onChange({ ...value, [serviceId]: { ...cur, enabled: true } });
    },
    [onChange, value]
  );

  if (catalog.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        No services configured yet. Add services from{' '}
        <span className="font-semibold">Dashboard → Services</span> to enable this section.
      </div>
    );
  }

  const sortedCatalog = [...catalog].sort(
    (a, b) =>
      (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-4">
      {sortedCatalog.map((svc) => {
        const block = value[svc.id];
        if (!block) return null;
        const items = [...svc.matrix_items].sort(
          (a, b) =>
            (Number(a.sort_order) || 0) -
            (Number(b.sort_order) || 0) || a.label.localeCompare(b.label)
        );
        return (
          <div
            key={svc.id}
            className="rounded-lg border border-gray-200 bg-gray-50/80 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white border-b border-gray-200">
              <span className="font-semibold text-gray-800">{svc.name}</span>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={block.enabled}
                  onChange={(e) => setServiceEnabled(svc.id, e.target.checked)}
                />
                Include
              </label>
            </div>

            {block.enabled && (
              <div className="p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Deliverables (matrix)
                </p>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No matrix rows for this service. Add them under Services admin.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {items.map((mi) => {
                      const row = block.matrix[mi.id] ?? {
                        selected: false,
                        quantity: '',
                        remarks: '',
                      };
                      return (
                        <div
                          key={mi.id}
                          className={`rounded-md border p-3 space-y-3 ${
                            row.selected
                              ? 'border-blue-200 bg-blue-50/40'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-sm font-medium text-gray-800">{mi.label}</span>
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={row.selected}
                                onChange={(e) =>
                                  setMatrixRow(svc.id, mi.id, {
                                    selected: e.target.checked,
                                    ...(!e.target.checked
                                      ? { quantity: '', remarks: '' }
                                      : {}),
                                  })
                                }
                              />
                              Include
                            </label>
                          </div>

                          {row.selected && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={row.quantity}
                                  onChange={(e) =>
                                    setMatrixRow(svc.id, mi.id, { quantity: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                                  placeholder="e.g. 12"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Remarks{' '}
                                  <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <input
                                  type="text"
                                  value={row.remarks}
                                  onChange={(e) =>
                                    setMatrixRow(svc.id, mi.id, { remarks: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Optional notes"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-gray-500">
        Quantity is required for every included deliverable. Remarks are optional.
      </p>
    </div>
  );
}
