'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Download, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { downloadInvoicePDF } from '@/lib/pdf';

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    project_id: '',
    invoice_number: '',
    amount: '',
    tax: '0',
    discount: '0',
    total_amount: '0',
    status: 'DRAFT',
    due_date: '',
    issued_date: '',
    paid_date: '',
    notes: '',
    currency: 'INR',
    currency_symbol: '₹',
  });

  useEffect(() => {
    if (invoiceId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [invoiceRes, projectsRes] = await Promise.all([
        axios.get(`/api/invoices/${invoiceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { success: true, data: [] } })),
      ]);

      if (invoiceRes.data.success) {
        const inv = invoiceRes.data.data;
        setInvoice(inv);
        setFormData({
          project_id: inv.project_id || '',
          invoice_number: inv.invoice_number,
          amount: inv.amount.toString(),
          tax: (inv.tax || 0).toString(),
          discount: (inv.discount || 0).toString(),
          total_amount: inv.total_amount.toString(),
          status: inv.status,
          due_date: inv.due_date || '',
          issued_date: inv.issued_date || '',
          paid_date: inv.paid_date || '',
          notes: inv.notes || '',
          currency: inv.currency || 'INR',
          currency_symbol: inv.currency_symbol || '₹',
        });

        // Load existing project_ids if available
        if (inv.project_ids) {
          try {
            const projectIds = typeof inv.project_ids === 'string' 
              ? JSON.parse(inv.project_ids) 
              : inv.project_ids;
            if (Array.isArray(projectIds)) {
              setSelectedProjects(projectIds);
            } else if (inv.project_id) {
              setSelectedProjects([inv.project_id]);
            }
          } catch (e) {
            console.error('Error parsing project_ids:', e);
            if (inv.project_id) {
              setSelectedProjects([inv.project_id]);
            }
          }
        } else if (inv.project_id) {
          setSelectedProjects([inv.project_id]);
        }

        // Fetch client
        const clientRes = await axios.get(`/api/clients/${inv.client_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (clientRes.data.success) {
          setClient(clientRes.data.data);
        }

        // Fetch projects for this client
        if (inv.client_id) {
          const clientProjectsRes = await axios.get(`/api/projects?client_id=${inv.client_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (clientProjectsRes.data.success) {
            setProjects(clientProjectsRes.data.data || []);
          }
        }
      }

      if (projectsRes.data.success) {
        setProjects(projectsRes.data.data || []);
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Failed to load invoice data');
      router.push('/dashboard/clients');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'amount' || name === 'tax' || name === 'discount') {
        const amount = parseFloat(updated.amount || '0');
        const tax = parseFloat(updated.tax || '0');
        const discount = parseFloat(updated.discount || '0');
        const total = amount + tax - discount;
        updated.total_amount = total.toFixed(2);
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.invoice_number || !formData.amount) {
      toast.error('Invoice number and amount are required');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      // Use first selected project as primary project_id, or empty string
      const submitData = {
        ...formData,
        project_id: selectedProjects.length > 0 ? selectedProjects[0] : '',
        project_ids: selectedProjects, // Send all selected projects
      };
      const response = await axios.put(`/api/invoices/${invoiceId}`, submitData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Invoice updated successfully!');
        router.push(`/dashboard/clients/${invoice?.client_id}`);
      } else {
        toast.error(response.data.error || 'Failed to update invoice');
      }
    } catch (error: any) {
      console.error('Update invoice error:', error);
      toast.error(error.response?.data?.error || 'Failed to update invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!invoice || !client) {
      toast.error('Invoice or client data not available');
      return;
    }

    setExporting(true);
    try {
      const invoiceData = {
        invoice_number: invoice.invoice_number,
        issued_date: invoice.issued_date,
        due_date: invoice.due_date,
        client: {
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          zip_code: client.zip_code,
          country: client.country,
          gst_no: client.gst_no,
        },
        items: invoice.items ? (typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items) : null,
        amount: parseFloat(invoice.amount),
        tax: parseFloat(invoice.tax || 0),
        discount: parseFloat(invoice.discount || 0),
        total_amount: parseFloat(invoice.total_amount),
        notes: invoice.notes,
        currency: invoice.currency || 'INR',
        currency_symbol: invoice.currency_symbol || '₹',
      };

      downloadInvoicePDF(invoiceData);
      toast.success('Invoice PDF downloaded successfully!');
    } catch (error: any) {
      console.error('Export PDF error:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) {
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/invoices/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Invoice deleted successfully!');
        router.push(`/dashboard/clients/${invoice.client_id}`);
      } else {
        toast.error(response.data.error || 'Failed to delete invoice');
        setShowDeleteConfirm(false);
      }
    } catch (error: any) {
      console.error('Delete invoice error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete invoice. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading invoice data...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Invoice not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/dashboard/clients/${invoice.client_id}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Edit Invoice #{invoice.invoice_number}</h1>
            <p className="text-gray-600 mt-2">Update invoice details</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Export PDF</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            <Trash2 size={18} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Invoice</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete invoice <span className="font-semibold">#{invoice.invoice_number}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Delete Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="invoice_number"
              name="invoice_number"
              value={formData.invoice_number}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="projects" className="block text-sm font-medium text-gray-700 mb-2">
              Projects (Optional - Select Multiple)
            </label>
            <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <label key={project.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjects([...selectedProjects, project.id]);
                        } else {
                          setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{project.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500 p-2">No projects available</p>
              )}
            </div>
            {selectedProjects.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedProjects.length} project(s) selected
              </p>
            )}
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <div className="flex space-x-2">
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={(e) => {
                  const currencyMap: { [key: string]: string } = {
                    'INR': '₹',
                    'USD': '$',
                    'EUR': '€',
                    'GBP': '£',
                    'JPY': '¥',
                    'AUD': 'A$',
                    'CAD': 'C$',
                  };
                  setFormData({
                    ...formData,
                    currency: e.target.value,
                    currency_symbol: currencyMap[e.target.value] || '₹',
                  });
                }}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="CUSTOM">Custom</option>
              </select>
              {formData.currency === 'CUSTOM' ? (
                <input
                  type="text"
                  placeholder="Currency Code"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <input
                  type="text"
                  placeholder="Currency Symbol"
                  value={formData.currency_symbol}
                  onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="tax" className="block text-sm font-medium text-gray-700 mb-2">
              Tax
            </label>
            <input
              type="number"
              id="tax"
              name="tax"
              value={formData.tax}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="discount" className="block text-sm font-medium text-gray-700 mb-2">
              Discount
            </label>
            <input
              type="number"
              id="discount"
              name="discount"
              value={formData.discount}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-2">
              Total Amount
            </label>
            <input
              type="number"
              id="total_amount"
              name="total_amount"
              value={formData.total_amount}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          <div>
            <label htmlFor="issued_date" className="block text-sm font-medium text-gray-700 mb-2">
              Issued Date
            </label>
            <input
              type="date"
              id="issued_date"
              name="issued_date"
              value={formData.issued_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {formData.status === 'PAID' && (
            <div>
              <label htmlFor="paid_date" className="block text-sm font-medium text-gray-700 mb-2">
                Paid Date
              </label>
              <input
                type="date"
                id="paid_date"
                name="paid_date"
                value={formData.paid_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <Link
            href={`/dashboard/clients/${invoice.client_id}`}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

