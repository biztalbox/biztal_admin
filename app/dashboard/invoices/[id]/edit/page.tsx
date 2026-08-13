'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Download, Trash2, Mail, Bell, History, X, MessageCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { downloadInvoicePDF } from '@/lib/pdf';
import { assembleInvoicePdfData, parseInvoiceItems } from '@/lib/invoice-pdf-assemble';
import InvoicePdfExtras from '@/components/InvoicePdfExtras';
import InvoiceGstSection, { recalcGstTotals, type InvoiceGstFormValues } from '@/components/InvoiceGstSection';
import { normalizeGstMode } from '@/lib/invoice-gst';

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [sendingOverdueReminder, setSendingOverdueReminder] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
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
    po_no: '',
    po_date: '',
    signature_image: '',
    currency: 'INR',
    currency_symbol: '₹',
  });

  const [gstData, setGstData] = useState<InvoiceGstFormValues>({
    gst_mode: 'INTRA',
    sgst_igst_percent: '9',
    cgst_percent: '9',
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
      const invoiceRes = await axios.get(`/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (invoiceRes.data.success) {
        const inv = invoiceRes.data.data;
        setInvoice(inv);
        const amountNum = parseFloat(inv.amount);
        setGstData({
          gst_mode: normalizeGstMode(inv.gst_mode),
          sgst_igst_percent: String(inv.sgst_igst_percent ?? 9),
          cgst_percent: String(inv.cgst_percent ?? 9),
        });
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
          po_no: inv.po_no || '',
          po_date: inv.po_date || '',
          signature_image: inv.signature_image || '',
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

        // Fetch only projects for this client
        if (inv.client_id) {
          const clientProjectsRes = await axios.get(`/api/projects?client_id=${inv.client_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (clientProjectsRes.data.success) {
            setProjects(clientProjectsRes.data.data || []);
          }
        }
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
      
      if (name === 'amount' || name === 'discount') {
        const totals = recalcGstTotals(updated.amount, updated.discount, gstData);
        updated.tax = totals.tax;
        updated.total_amount = totals.total_amount;
      }
      
      return updated;
    });
  };

  const handleGstChange = (patch: Partial<InvoiceGstFormValues>) => {
    const nextGst = { ...gstData, ...patch };
    setGstData(nextGst);
    setFormData((prev) => {
      const totals = recalcGstTotals(prev.amount, prev.discount, nextGst);
      return { ...prev, tax: totals.tax, total_amount: totals.total_amount };
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
        ...gstData,
        project_id: selectedProjects.length > 0 ? selectedProjects[0] : '',
        project_ids: selectedProjects,
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
      const invoiceRow = {
        ...invoice,
        amount: formData.amount,
        tax: formData.tax,
        discount: formData.discount,
        total_amount: formData.total_amount,
        gst_mode: gstData.gst_mode,
        sgst_igst_percent: gstData.sgst_igst_percent,
        cgst_percent: gstData.cgst_percent,
        notes: formData.notes,
        po_no: formData.po_no,
        po_date: formData.po_date,
        signature_image: formData.signature_image,
        currency: formData.currency,
        currency_symbol: formData.currency_symbol,
      };

      const invoiceData = assembleInvoicePdfData(invoiceRow, client, {
        items: parseInvoiceItems(invoice),
      });

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

  const handleSendInvoice = async () => {
    if (!invoice || !client) {
      toast.error('Invoice or client data not available');
      return;
    }

    if (!client.email) {
      toast.error('Client email not found');
      return;
    }

    setSendingInvoice(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/invoices/${invoiceId}/send`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Invoice sent successfully!');
      } else {
        toast.error(response.data.error || 'Failed to send invoice');
      }
    } catch (error: any) {
      console.error('Send invoice error:', error);
      toast.error(error.response?.data?.error || 'Failed to send invoice. Please try again.');
    } finally {
      setSendingInvoice(false);
    }
  };

  const handleSendReminder = async () => {
    if (!invoice || !client) {
      toast.error('Invoice or client data not available');
      return;
    }

    if (!client.email) {
      toast.error('Client email not found');
      return;
    }

    setSendingReminder(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/invoices/${invoiceId}/send-reminder`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Reminder sent successfully!');
      } else {
        toast.error(response.data.error || 'Failed to send reminder');
      }
    } catch (error: any) {
      console.error('Send reminder error:', error);
      toast.error(error.response?.data?.error || 'Failed to send reminder. Please try again.');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleSendOverdueReminder = async () => {
    if (!invoice || !client) {
      toast.error('Invoice or client data not available');
      return;
    }

    if (!client.email) {
      toast.error('Client email not found');
      return;
    }

    if (!confirm('Send overdue payment reminder for this invoice?')) return;

    setSendingOverdueReminder(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/invoices/${invoiceId}/send-overdue-reminder`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.success('Overdue reminder sent successfully!');
      } else {
        toast.error(response.data.error || 'Failed to send overdue reminder');
      }
    } catch (error: any) {
      console.error('Send overdue reminder error:', error);
      toast.error(error.response?.data?.error || 'Failed to send overdue reminder. Please try again.');
    } finally {
      setSendingOverdueReminder(false);
    }
  };

  const fetchEmailHistory = async () => {
    if (!invoiceId) return;
    
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/reminders/history/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setEmailHistory(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Fetch history error:', error);
      toast.error('Failed to load email history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleShowHistory = () => {
    setShowHistoryModal(true);
    fetchEmailHistory();
  };

  // Helper function to open WhatsApp with pre-filled message
  // Constructs WhatsApp URL: https://wa.me/<PHONE>/?text=<ENCODED_MESSAGE>
  // Normalizes phone by stripping all non-digits before putting it into the URL
  const openWhatsApp = (phone: string, message: string) => {
    if (!phone) {
      toast.error('No WhatsApp number available for this client.');
      return;
    }
    
    // Normalize phone number: strip all non-digits
    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    
    if (!normalizedPhone) {
      toast.error('No valid phone number found for this client.');
      return;
    }
    
    // Construct WhatsApp URL with encoded message
    // Format: https://wa.me/<PHONE>/?text=<ENCODED_MESSAGE>
    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
    
    // Open in new tab
    window.open(url, '_blank');
  };

  const handleSendWhatsApp = () => {
    if (!invoice || !client) {
      toast.error('Invoice or client data not available');
      return;
    }

    const phone = client.whatsapp || client.phone;
    if (!phone) {
      toast.error('No WhatsApp number available for this client.');
      return;
    }

    // Generate invoice URL - using the public route
    // This allows clients to view/download the invoice without authentication
    // Format: /api/invoices/[id]/public?token=[optional_token]
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const invoiceUrl = `${baseUrl}/api/invoices/${invoiceId}/public`;

    // Format dates
    const dueDate = invoice.due_date 
      ? new Date(invoice.due_date).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : 'Not specified';

    const clientName = client.company || client.name;
    const currencySymbol = invoice.currency_symbol || '₹';
    const totalAmount = parseFloat(invoice.total_amount || 0);

    // Build message dynamically from invoice data
    // Professional message format incorporating invoice details and payment request
    const message = `Dear ${clientName},

Attaching the invoice for your reference. We would appreciate your support in clearing the payment within the due timeline.

Invoice Details:
Invoice Number: #${invoice.invoice_number}
Total Amount: ${currencySymbol}${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
Due Date: ${dueDate}

You can view or download the invoice here: ${invoiceUrl}

Thank you and looking forward to continuing our collaboration.`;

    openWhatsApp(phone, message);
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
            onClick={handleSendInvoice}
            disabled={sendingInvoice || !client?.email}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            {sendingInvoice ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>...</span>
              </>
            ) : (
              <>
                <Mail size={18} />
                <span>Send</span>
              </>
            )}
          </button>
          <button
            onClick={handleSendReminder}
            disabled={sendingReminder || !client?.email}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            {sendingReminder ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>...</span>
              </>
            ) : (
              <>
                <Bell size={18} />
                <span>Remind</span>
              </>
            )}
          </button>
          <button
            onClick={handleSendOverdueReminder}
            disabled={sendingOverdueReminder || !client?.email}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            {sendingOverdueReminder ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>...</span>
              </>
            ) : (
              <>
                <AlertTriangle size={18} />
                <span>Overdue Reminder</span>
              </>
            )}
          </button>
          <button
            onClick={handleSendWhatsApp}
            disabled={!client?.whatsapp && !client?.phone}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
            title="Send on Whatsapp"
          >
            <MessageCircle size={18} />
            <span>Whatsapp</span>
          </button>
          <button
            onClick={handleShowHistory}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2 transition"
          >
            <History size={18} />
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>PDF</span>
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

      {/* Email History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Email History</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : emailHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No email history found</p>
            ) : (
              <div className="space-y-4">
                {emailHistory.map((item: any) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 ${
                      item.status === 'SENT' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.status === 'SENT' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                          }`}>
                            {item.status}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            {item.channel}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                            {item.reminder_type?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {item.subject && (
                          <h4 className="font-semibold text-gray-800 mb-1">{item.subject}</h4>
                        )}
                        {item.message && (
                          <p className="text-sm text-gray-600 mb-2">{item.message}</p>
                        )}
                        {item.error_message && (
                          <p className="text-sm text-red-600 mb-2">Error: {item.error_message}</p>
                        )}
                        <div className="text-xs text-gray-500">
                          {item.sent_at ? new Date(item.sent_at).toLocaleString() : new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

          <InvoiceGstSection
            amount={formData.amount}
            discount={formData.discount}
            currencySymbol={formData.currency_symbol}
            value={gstData}
            onChange={handleGstChange}
            onTotalsChange={(totals) =>
              setFormData((prev) => ({ ...prev, tax: totals.tax, total_amount: totals.total_amount }))
            }
          />

          <div>
            <label htmlFor="tax" className="block text-sm font-medium text-gray-700 mb-2">
              Total GST
            </label>
            <input
              type="number"
              id="tax"
              name="tax"
              value={formData.tax}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
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

          <InvoicePdfExtras
            po_no={formData.po_no}
            po_date={formData.po_date}
            signature_image={formData.signature_image}
            onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          />
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

