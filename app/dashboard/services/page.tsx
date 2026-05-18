'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Layers } from 'lucide-react';

type ServiceRow = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  matrix_items?: unknown[];
};

export default function ServicesAdminPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/services', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setServices(res.data.data || []);
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete service "${name}" and all its deliverable rows?`)) return;
    try {
      await axios.delete(`/api/services/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('Service deleted');
      fetchServices();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading services…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="text-blue-600" size={28} />
            Services catalog
          </h1>
          <p className="text-gray-600 mt-2">
            Manage services and matrix rows used on projects.
          </p>
        </div>
        <Link
          href="/dashboard/services/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-fit"
        >
          <Plus size={20} />
          Add service
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Order</th>
              <th className="text-left px-4 py-3 font-semibold">Active</th>
              <th className="text-left px-4 py-3 font-semibold">Deliverables</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-gray-600" colSpan={5}>
                  No services yet. Create one to use on projects.
                </td>
              </tr>
            ) : (
              services.map((s) => (
                <tr key={s.id} className="bg-white hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3">{s.sort_order}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        s.is_active
                          ? 'text-green-700 font-semibold'
                          : 'text-gray-500 font-semibold'
                      }
                    >
                      {s.is_active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{Array.isArray(s.matrix_items) ? s.matrix_items.length : 0}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/dashboard/services/${s.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mr-4"
                    >
                      <Edit size={16} />
                      Manage
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id, s.name)}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
