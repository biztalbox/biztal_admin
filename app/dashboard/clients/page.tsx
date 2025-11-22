'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, Eye, MessageSquare, Mail } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchClients();
  }, [page, search, router]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/clients', {
        params: { page, limit: 10, search },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.success) {
        setClients(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setError('');
      }
    } catch (error: any) {
      console.error('Fetch clients error:', error);
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load clients');
        toast.error('Failed to load clients. Please refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await axios.delete(`/api/clients/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      toast.success('Client deleted successfully!');
      fetchClients();
    } catch (error: any) {
      console.error('Delete client error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete client');
    }
  };

  const handleSendWhatsApp = async (id: string) => {
    if (!confirm('Send welcome WhatsApp message to this client?')) return;

    try {
      await axios.post(`/api/clients/${id}/send-whatsapp`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      toast.success('WhatsApp message sent successfully!');
    } catch (error: any) {
      console.error('Send WhatsApp error:', error);
      toast.error(error.response?.data?.error || 'Failed to send WhatsApp message');
    }
  };

  const handleSendEmail = async (id: string) => {
    if (!confirm('Send welcome email to this client?')) return;

    try {
      await axios.post(`/api/clients/${id}/send-email`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      toast.success('Email sent successfully!');
    } catch (error: any) {
      console.error('Send email error:', error);
      toast.error(error.response?.data?.error || 'Failed to send email');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Clients</h1>
          <p className="text-gray-600 mt-2">Manage your clients</p>
        </div>
        <Link
          href="/dashboard/clients/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add Client</span>
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No clients found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{client.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{client.phone || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{client.company || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            client.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : client.status === 'INACTIVE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View"
                          >
                            <Eye size={18} />
                          </Link>
                          <Link
                            href={`/dashboard/clients/${client.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() => handleSendWhatsApp(client.id)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Send WhatsApp"
                          >
                            <MessageSquare size={18} />
                          </button>
                          <button
                            onClick={() => handleSendEmail(client.id)}
                            className="text-purple-600 hover:text-purple-900 p-1"
                            title="Send Email"
                          >
                            <Mail size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id, client.name)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

