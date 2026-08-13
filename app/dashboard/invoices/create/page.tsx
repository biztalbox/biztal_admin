'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { invoiceTotalsFromParts } from '@/lib/utils';
import InvoicePdfExtras from '@/components/InvoicePdfExtras';

function CreateInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const [loading, setLoading] = useState(false);
  const [invoiceNumberLoading, setInvoiceNumberLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    client_id: clientId || '',
    project_id: '',
    invoice_number: 'Generating…',
    amount: '',
    tax_percent: '0',
    tax: '0',
    discount: '0',
    total_amount: '0',
    status: 'DRAFT',
    due_date: '',
    issued_date: new Date().toISOString().split('T')[0],
    notes: '',
    po_no: '',
    po_date: '',
    signature_image: '',
    currency: 'INR',
    currency_symbol: '₹',
  });

  useEffect(() => {
    fetchClients();
    if (clientId) {
      fetchProjects(clientId);
    }
  }, [clientId]);

  useEffect(() => {
    fetchNextInvoiceNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNextInvoiceNumber = async () => {
    setInvoiceNumberLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/invoices?next_number=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success && response.data?.data?.invoice_number) {
        setFormData((prev) => ({ ...prev, invoice_number: response.data.data.invoice_number }));
      } else {
        // Server will still assign on save, but keep UI informative.
        setFormData((prev) => ({ ...prev, invoice_number: 'Will be assigned on save' }));
      }
    } catch (error) {
      console.error('Fetch next invoice number error:', error);
      setFormData((prev) => ({ ...prev, invoice_number: 'Will be assigned on save' }));
    } finally {
      setInvoiceNumberLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Fetch clients error:', error);
    }
  };

  const fetchProjects = async (cid: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/projects?client_id=${cid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setProjects(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch projects error:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'amount' || name === 'tax_percent' || name === 'discount') {
        const amount = parseFloat(updated.amount || '0');
        const taxPercent = parseFloat(updated.tax_percent || '0');
        const discount = parseFloat(updated.discount || '0');
        const totals = invoiceTotalsFromParts(amount, taxPercent, discount);
        updated.tax = totals.tax;
        updated.total_amount = totals.total_amount;
      }
      
      return updated;
    });
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    setFormData((prev) => ({ ...prev, client_id: clientId, project_id: '' }));
    setSelectedProjects([]); // Clear selected projects when client changes
    if (clientId) {
      fetchProjects(clientId);
    } else {
      setProjects([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.amount) {
      toast.error('Client and amount are required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Use first selected project as primary project_id, or empty string
      const submitData = {
        ...formData,
        project_id: selectedProjects.length > 0 ? selectedProjects[0] : '',
        project_ids: selectedProjects, // Send all selected projects
      };
      const response = await axios.post('/api/invoices', submitData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Invoice created successfully!');
        router.push(`/dashboard/clients/${formData.client_id}`);
      } else {
        toast.error(response.data.error || 'Failed to create invoice');
      }
    } catch (error: any) {
      console.error('Create invoice error:', error);
      toast.error(error.response?.data?.error || 'Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          href={clientId ? `/dashboard/clients/${clientId}` : '/dashboard/clients'}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Create Invoice</h1>
          <p className="text-gray-600 mt-2">Generate a new invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              id="client_id"
              name="client_id"
              value={formData.client_id}
              onChange={handleClientChange}
              required
              disabled={!!clientId}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select Client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
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
              {formData.currency === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="Currency Code (e.g., SGD)"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
              {formData.currency !== 'CUSTOM' && (
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
            <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="invoice_number"
              name="invoice_number"
              value={formData.invoice_number}
              required
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {invoiceNumberLoading ? 'Generating invoice number…' : 'Auto-generated (BINV + Mon + DD + YY + ####)'}
            </p>
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
            <label htmlFor="tax_percent" className="block text-sm font-medium text-gray-700 mb-2">
              Tax (%)
            </label>
            <input
              type="number"
              id="tax_percent"
              name="tax_percent"
              value={formData.tax_percent}
              onChange={handleChange}
              step="0.01"
              min="0"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. 18"
            />
          </div>

          <div>
            <label htmlFor="tax" className="block text-sm font-medium text-gray-700 mb-2">
              Tax amount
            </label>
            <input
              type="number"
              id="tax"
              name="tax"
              value={formData.tax}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-calculated from amount × tax %</p>
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

          <InvoicePdfExtras
            po_no={formData.po_no}
            po_date={formData.po_date}
            signature_image={formData.signature_image}
            onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          />
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <Link
            href={clientId ? `/dashboard/clients/${clientId}` : '/dashboard/clients'}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Create Invoice</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <CreateInvoiceForm />
    </Suspense>
  );
}

