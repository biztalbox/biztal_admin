'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function CreateServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      toast.error('Name is required');
      return;
    }
    const so = parseInt(sortOrder, 10);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/services',
        { name: n, sort_order: Number.isFinite(so) ? so : 0, is_active: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success && res.data.data?.id) {
        toast.success('Service created');
        router.push(`/dashboard/services/${res.data.data.id}`);
      } else {
        toast.error(res.data.error || 'Failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/services" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">New service</h1>
          <p className="text-gray-600 mt-1">Define a service, then add deliverable rows on the next screen.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort order</label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Link
            href="/dashboard/services"
            className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Saving…' : 'Create & configure'}
          </button>
        </div>
      </form>
    </div>
  );
}
