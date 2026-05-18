'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';

type MatrixItem = {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

type ServiceDetail = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  matrix_items: MatrixItem[];
};

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [savingSvc, setSavingSvc] = useState(false);
  const [svc, setSvc] = useState<ServiceDetail | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newSort, setNewSort] = useState('0');
  const [rowSaving, setRowSaving] = useState<Record<string, boolean>>({});

  const fetchService = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.data.success) {
        toast.error(res.data.error || 'Not found');
        router.push('/dashboard/services');
        return;
      }
      const data = res.data.data as ServiceDetail;
      setSvc(data);
      setName(data.name);
      setSortOrder(String(data.sort_order ?? 0));
      setIsActive(Boolean(data.is_active));
    } catch {
      toast.error('Failed to load service');
      router.push('/dashboard/services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchService();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      toast.error('Name is required');
      return;
    }
    const so = parseInt(sortOrder, 10);
    setSavingSvc(true);
    try {
      await axios.put(
        `/api/services/${id}`,
        {
          name: n,
          sort_order: Number.isFinite(so) ? so : 0,
          is_active: isActive,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Service saved');
      fetchService();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Save failed');
    } finally {
      setSavingSvc(false);
    }
  };

  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) {
      toast.error('Deliverable label is required');
      return;
    }
    const so = parseInt(newSort, 10);
    try {
      await axios.post(
        `/api/services/${id}/matrix-items`,
        { label, sort_order: Number.isFinite(so) ? so : 0 },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Deliverable added');
      setNewLabel('');
      setNewSort('0');
      fetchService();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Add failed');
    }
  };

  const saveMatrixRow = async (row: MatrixItem, patch: Partial<MatrixItem>) => {
    const nextLabel = patch.label !== undefined ? String(patch.label).trim() : row.label.trim();
    if (!nextLabel) {
      toast.error('Label cannot be empty');
      return;
    }
    setRowSaving((s) => ({ ...s, [row.id]: true }));
    try {
      await axios.put(
        `/api/service-matrix-items/${row.id}`,
        {
          label: nextLabel,
          sort_order:
            patch.sort_order !== undefined
              ? patch.sort_order
              : row.sort_order,
          is_active: patch.is_active !== undefined ? patch.is_active : row.is_active,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Row updated');
      fetchService();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Update failed');
    } finally {
      setRowSaving((s) => ({ ...s, [row.id]: false }));
    }
  };

  const deleteMatrixRow = async (rowId: string, label: string) => {
    if (!confirm(`Remove deliverable "${label}"? Projects using this line will lose the row.`)) return;
    try {
      await axios.delete(`/api/service-matrix-items/${rowId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('Removed');
      fetchService();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  if (loading || !svc) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  const items = [...svc.matrix_items].sort(
    (a, b) =>
      (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
      a.label.localeCompare(b.label)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/services" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Manage service</h1>
          <p className="text-gray-600 mt-1">{svc.name}</p>
        </div>
      </div>

      <form
        onSubmit={handleSaveService}
        className="bg-white rounded-lg shadow border border-gray-100 p-6 space-y-4 max-w-xl"
      >
        <h2 className="font-semibold text-gray-800">Service details</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort order</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active (visible in project catalog)
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={savingSvc}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Save size={18} />
          {savingSvc ? 'Saving…' : 'Save service'}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Deliverables (matrix)</h2>
        <form onSubmit={handleAddDeliverable} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">New label</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Static posts"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs text-gray-500 mb-1">Order</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Add
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border border-gray-200 mt-4">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Label</th>
                <th className="text-left px-3 py-2 font-semibold w-24">Order</th>
                <th className="text-left px-3 py-2 font-semibold">Active</th>
                <th className="text-right px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-gray-600">
                    No deliverables yet. Add rows your team will count on projects.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <MatrixRowEditor
                    key={row.id}
                    row={row}
                    busy={!!rowSaving[row.id]}
                    onSave={saveMatrixRow}
                    onDelete={deleteMatrixRow}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MatrixRowEditor({
  row,
  busy,
  onSave,
  onDelete,
}: {
  row: MatrixItem;
  busy: boolean;
  onSave: (row: MatrixItem, patch: Partial<MatrixItem>) => void;
  onDelete: (id: string, label: string) => void;
}) {
  const [label, setLabel] = useState(row.label);
  const [sortOrder, setSortOrder] = useState(String(row.sort_order));
  const [active, setActive] = useState(row.is_active);

  useEffect(() => {
    setLabel(row.label);
    setSortOrder(String(row.sort_order));
    setActive(row.is_active);
  }, [row.id, row.label, row.sort_order, row.is_active]);

  return (
    <tr className="bg-white">
      <td className="px-3 py-2">
        <input
          className="w-full px-2 py-1 border border-gray-200 rounded"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          className="w-full px-2 py-1 border border-gray-200 rounded"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600"
            checked={active}
            onChange={(e) => {
              setActive(e.target.checked);
              onSave(row, {
                label: label.trim(),
                sort_order: parseInt(sortOrder, 10) || 0,
                is_active: e.target.checked,
              });
            }}
          />
        </label>
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave(row, {
              label: label.trim(),
              sort_order: parseInt(sortOrder, 10) || 0,
              is_active: active,
            })
          }
          className="text-blue-600 hover:text-blue-800 mr-3 text-xs font-semibold uppercase"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => onDelete(row.id, row.label)}
          className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}
