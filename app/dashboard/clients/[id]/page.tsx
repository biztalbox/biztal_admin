'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Edit, Plus, History, Download, Bell, Eye, FolderKanban, FileText, X, AlertTriangle } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

// WhatsApp Icon SVG
const WhatsAppIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

// Gmail Icon SVG
const GmailIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
  </svg>
);

export default function ClientViewPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sendingOverdueReminder, setSendingOverdueReminder] = useState<string | null>(null);
  const [reminderHistory, setReminderHistory] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<'all' | 'email'>('all');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Custom message modals
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [clientRes, projectsRes, invoicesRes] = await Promise.all([
        axios.get(`/api/clients/${clientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/projects?client_id=${clientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { success: true, data: [] } })),
        axios.get(`/api/invoices?client_id=${clientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { success: true, data: [] } })),
      ]);

      if (clientRes.data.success) {
        setClient(clientRes.data.data);
      }
      if (projectsRes.data.success) {
        setProjects(projectsRes.data.data || []);
      }
      if (invoicesRes.data.success) {
        setInvoices(invoicesRes.data.data || []);
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Failed to load client data');
      router.push('/dashboard/clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchReminderHistory = async (invoiceId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/reminders/history/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setReminderHistory(response.data.data || []);
        setSelectedInvoice(invoiceId);
        setShowHistoryModal(true);
      }
    } catch (error: any) {
      console.error('Fetch reminder history error:', error);
      toast.error('Failed to load reminder history');
    }
  };

  const filteredHistory = reminderHistory.filter((item) => {
    if (historyTab === 'all') return true;
    // Only show email channel when email tab is selected
    return item.channel === 'EMAIL';
  });

  const handleSendWhatsApp = async () => {
    if (!whatsAppMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSendingWhatsApp(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/clients/${clientId}/send-whatsapp`,
        { message: whatsAppMessage },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('WhatsApp message sent successfully!');
        setShowWhatsAppModal(false);
        setWhatsAppMessage('');
      } else {
        toast.error(response.data.error || 'Failed to send WhatsApp message');
      }
    } catch (error: any) {
      console.error('Send WhatsApp error:', error);
      toast.error(error.response?.data?.error || 'Failed to send WhatsApp message');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Please enter both subject and message');
      return;
    }

    setSendingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/clients/${clientId}/send-email`,
        { subject: emailSubject, message: emailMessage },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('Email sent successfully!');
        setShowEmailModal(false);
        setEmailSubject('');
        setEmailMessage('');
      } else {
        toast.error(response.data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Send email error:', error);
      toast.error(error.response?.data?.error || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendReminder = async (invoiceId: string) => {
    if (!confirm('Send payment reminder for this invoice?')) return;

    setSendingReminder(invoiceId);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/invoices/${invoiceId}/send-reminder`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Reminder sent successfully!');
        fetchData();
      } else {
        toast.error(response.data.error || 'Failed to send reminder');
      }
    } catch (error: any) {
      console.error('Send reminder error:', error);
      toast.error(error.response?.data?.error || 'Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleSendOverdueReminder = async (invoiceId: string) => {
    if (!confirm('Send overdue payment reminder for this invoice?')) return;

    setSendingOverdueReminder(invoiceId);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/invoices/${invoiceId}/send-overdue-reminder`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Overdue reminder sent successfully!');
        fetchData();
      } else {
        toast.error(response.data.error || 'Failed to send overdue reminder');
      }
    } catch (error: any) {
      console.error('Send overdue reminder error:', error);
      toast.error(error.response?.data?.error || 'Failed to send overdue reminder');
    } finally {
      setSendingOverdueReminder(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading client data...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Client not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        subtitle="Client Details"
        backHref="/dashboard/clients"
        actions={
          <>
            <Link
              href={`/dashboard/clients/${clientId}/edit`}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center space-x-2 transition backdrop-blur-sm"
            >
              <Edit size={18} />
              <span>Edit</span>
            </Link>
            <button
              onClick={() => setShowWhatsAppModal(true)}
              disabled={!client.whatsapp && !client.phone}
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
              title="Send WhatsApp Message"
            >
              <WhatsAppIcon size={20} />
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={!client.email}
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
              title="Send Email"
            >
              <GmailIcon size={20} />
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-bold text-gray-800">Client Information</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-800 mt-1">{client.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-800 mt-1">{client.email}</p>
              </div>
              {client.secondary_email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Secondary emails (CC)</label>
                  <p className="text-gray-800 mt-1 whitespace-pre-wrap break-words">{client.secondary_email}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-800 mt-1">{client.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">WhatsApp</label>
                  <p className="text-gray-800 mt-1">{client.whatsapp || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Company</label>
                <p className="text-gray-800 mt-1">{client.company || 'N/A'}</p>
              </div>
              <div className="flex justify-between w-80">
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                    client.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : client.status === 'INACTIVE'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {client.status}
                </span>
              </div>
              {client.address && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-gray-800 mt-1">{client.address}</p>
                </div>
              )}
              {(client.city || client.state || client.country) && (
                <div className="grid grid-cols-3 gap-4">
                  {client.city && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">City</label>
                      <p className="text-gray-800 mt-1">{client.city}</p>
                    </div>
                  )}
                  {client.state && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">State</label>
                      <p className="text-gray-800 mt-1">{client.state}</p>
                    </div>
                  )}
                  {client.country && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Country</label>
                      <p className="text-gray-800 mt-1">{client.country}</p>
                    </div>
                  )}
                </div>
              )}
              {client.gst_no && (
                <div>
                  <label className="text-sm font-medium text-gray-500">GST Number</label>
                  <p className="text-gray-800 mt-1">{client.gst_no}</p>
                </div>
              )}
              {client.remark && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Remarks</label>
                  <p className="text-gray-800 mt-1 whitespace-pre-wrap">{client.remark}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projects & Invoices Summary */}
        <div className="space-y-6">
          {/* Projects */}
          <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <FolderKanban className="mr-2 text-blue-600" size={24} />
                  Projects
                </h2>
                <Link
                  href={`/dashboard/projects/create?client_id=${clientId}`}
                  className="px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                  title="Add Project"
                >
                  <Plus size={18} />
                  <span>Add</span>
                </Link>
              </div>
            </div>
            <div className="p-6">
              {projects.length > 0 ? (
                <div className="space-y-3 h-80 overflow-y-auto overflow-x-hidden" style={{scrollbarWidth: 'thin'}}>
                  {projects.map((project) => (
                    <div key={project.id} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{project.name}</p>
                          <p className="text-sm text-gray-600 mt-1">{project.description || 'No description'}</p>
                          
                        </div>
                        <div className="flex flex-col gap-2">
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Link
                            href={`/dashboard/projects/${project.id}/edit`}
                            className="p-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm hover:shadow-md"
                            title="Edit Project"
                          >
                            <Edit size={14} />
                          </Link>
                          <Link
                            href={`/dashboard/projects/${project.id}`}
                            className="p-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm hover:shadow-md"
                            title="View Project"
                          >
                            <Eye size={14} />
                          </Link>
                        </div>
                        
                        <div className="flex items-center ml-3">
                            <span
                              className={`px-2 py-[3px] rounded-full text-xs font-semibold ${
                                project.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : project.status === 'COMPLETED'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}
                            >
                              {project.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderKanban className="mx-auto text-gray-300 mb-2" size={48} />
                  <p className="text-gray-600">No projects yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <FileText className="mr-2 text-blue-600" size={24} />
                  Invoices
                </h2>
                <Link
                  href={`/dashboard/invoices/create?client_id=${clientId}`}
                  className="px-2 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                  title="Add Invoice"
                >
                  <Plus size={18} />
                  <span>Add</span>
                </Link>
              </div>
            </div>
            <div className="p-6">
              {invoices.length > 0 ? (
                <div className="space-y-3 h-80 overflow-y-auto overflow-x-hidden" style={{scrollbarWidth: 'thin'}}>
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <p className="font-semibold text-sm text-gray-800">#{invoice.invoice_number}</p>
                            <Link
                              href={`/dashboard/invoices/${invoice.id}/edit`}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('token');
                                  const response = await fetch(`/api/invoices/${invoice.id}/export`, {
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `Invoice_${invoice.invoice_number}.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                  toast.success('Invoice PDF downloaded!');
                                } catch (error) {
                                  toast.error('Failed to download PDF');
                                }
                              }}
                              className="text-green-600 hover:text-green-800 text-xs font-medium flex items-center space-x-1"
                            >
                              <Download size={14} />
                              <span>PDF</span>
                            </button>
                          </div>
                          <p className="text-base font-bold text-gray-800">
                            {(invoice.currency_symbol || '₹')}{parseFloat(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <div className="flex gap-4 items-end">
                          {invoice.due_date && (
                            <p className="text-xs text-gray-500 mt-1">Due: <b>{formatDate(invoice.due_date)}</b></p>
                          )}
                          {invoice.issued_date && (
                            <p className="text-xs text-gray-500">Issued: <b>{formatDate(invoice.issued_date)}</b></p>
                          )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSendReminder(invoice.id)}
                              disabled={sendingReminder === invoice.id}
                              className="p-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm hover:shadow-md"
                              title="Send Payment Reminder"
                            >
                              {sendingReminder === invoice.id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Bell size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => handleSendOverdueReminder(invoice.id)}
                              disabled={sendingOverdueReminder === invoice.id || !client?.email}
                              className="p-1 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm hover:shadow-md"
                              title="Overdue Reminder"
                            >
                              {sendingOverdueReminder === invoice.id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <AlertTriangle size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => fetchReminderHistory(invoice.id)}
                              className="p-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm hover:shadow-md"
                              title="View Reminder History"
                            >
                              <History size={14} />
                            </button>
                          </div>
                          <span
                            className={`px-2 py-[3px] rounded-full text-xs font-semibold shadow-sm ${
                              invoice.status === 'PAID'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : invoice.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto text-gray-300 mb-2" size={48} />
                  <p className="text-gray-600">No invoices yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <WhatsAppIcon size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Send WhatsApp Message</h2>
                    <p className="text-sm text-gray-600 mt-1">To: {client.name} ({client.whatsapp || client.phone})</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowWhatsAppModal(false);
                    setWhatsAppMessage('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={whatsAppMessage}
                    onChange={(e) => setWhatsAppMessage(e.target.value)}
                    placeholder="Enter your WhatsApp message here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">{whatsAppMessage.length} characters</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowWhatsAppModal(false);
                  setWhatsAppMessage('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendWhatsApp}
                disabled={sendingWhatsApp || !whatsAppMessage.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2"
              >
                {sendingWhatsApp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <WhatsAppIcon size={18} />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-600 rounded-lg">
                    <GmailIcon size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Send Email</h2>
                    <p className="text-sm text-gray-600 mt-1">To: {client.name} ({client.email})</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailSubject('');
                    setEmailMessage('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Enter your email message here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    rows={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">{emailMessage.length} characters</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailSubject('');
                  setEmailMessage('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject.trim() || !emailMessage.trim()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2"
              >
                {sendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <GmailIcon size={18} />
                    <span>Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Reminder History</h2>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setReminderHistory([]);
                    setSelectedInvoice(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex space-x-4 mt-4 border-b border-gray-200">
                <button
                  onClick={() => setHistoryTab('all')}
                  className={`pb-2 px-4 font-medium transition ${
                    historyTab === 'all'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setHistoryTab('email')}
                  className={`pb-2 px-4 font-medium transition ${
                    historyTab === 'email'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Email
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {filteredHistory.length > 0 ? (
                <div className="space-y-4">
                  {filteredHistory.map((item) => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.channel === 'WHATSAPP'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {item.channel}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.status === 'SENT'
                                  ? 'bg-green-100 text-green-800'
                                  : item.status === 'FAILED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {item.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {item.reminder_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {item.message && (
                            <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{item.message}</p>
                          )}
                          {item.subject && (
                            <p className="text-sm font-medium text-gray-800 mb-1">Subject: {item.subject}</p>
                          )}
                          {item.sent_at && (
                            <p className="text-xs text-gray-500">
                              Sent: {formatDateTime(item.sent_at)}
                            </p>
                          )}
                          {item.error_message && (
                            <p className="text-xs text-red-600 mt-2">
                              Error: {item.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  No reminder history found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
