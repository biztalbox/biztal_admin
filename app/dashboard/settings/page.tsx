'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import {
  EMPTY_COMPANY_BANK,
  printableBankRows,
  validateCompanyBank,
  type CompanyBankDetails,
} from '@/lib/company-bank';

const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyBankDetails>(EMPTY_COMPANY_BANK);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/settings/bank', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data?.success && response.data.data) {
          setFormData({ ...EMPTY_COMPANY_BANK, ...response.data.data });
        }
      } catch (error: any) {
        console.error('Load bank settings error:', error);
        toast.error(error.response?.data?.error || 'Failed to load bank details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateCompanyBank({
      ...formData,
      account_number: formData.account_number.replace(/[\s-]/g, ''),
      ifsc_code: formData.ifsc_code.toUpperCase().replace(/\s/g, ''),
      swift_code: formData.swift_code.toUpperCase().replace(/\s/g, ''),
      upi_id: formData.upi_id.replace(/\s/g, ''),
    });
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/settings/bank', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success) {
        setFormData(response.data.data);
        toast.success('Bank details saved. They will show on invoices that have printing turned on.');
      } else {
        toast.error(response.data?.error || 'Failed to save bank details');
      }
    } catch (error: any) {
      console.error('Save bank settings error:', error);
      toast.error(error.response?.data?.error || 'Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const previewRows = printableBankRows(formData);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Company bank account printed on invoices"
        backHref="/dashboard"
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Company bank account</h2>
            <p className="text-sm text-gray-600 mt-1">
              Save this once. Every invoice can print it at the bottom in the standard payment block
              (account holder, bank, account number, type, branch, IFSC, and SWIFT or UPI when you add them).
              You can still turn printing off on a single invoice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="account_holder_name" className="block text-sm font-medium text-gray-700 mb-2">
                Account holder name <span className="text-red-500">*</span>
              </label>
              <input
                id="account_holder_name"
                name="account_holder_name"
                value={formData.account_holder_name}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="Name as printed on the bank account"
              />
            </div>

            <div>
              <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
                Bank name <span className="text-red-500">*</span>
              </label>
              <input
                id="bank_name"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="HDFC Bank"
              />
            </div>

            <div>
              <label htmlFor="account_number" className="block text-sm font-medium text-gray-700 mb-2">
                Account number <span className="text-red-500">*</span>
              </label>
              <input
                id="account_number"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                required
                inputMode="numeric"
                autoComplete="off"
                className={inputClass}
                placeholder="9 to 18 digits"
              />
            </div>

            <div>
              <label htmlFor="ifsc_code" className="block text-sm font-medium text-gray-700 mb-2">
                IFSC <span className="text-red-500">*</span>
              </label>
              <input
                id="ifsc_code"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleChange}
                required
                maxLength={11}
                className={`${inputClass} uppercase`}
                placeholder="HDFC0001234"
              />
            </div>

            <div>
              <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700 mb-2">
                Branch name <span className="text-red-500">*</span>
              </label>
              <input
                id="branch_name"
                name="branch_name"
                value={formData.branch_name}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="Dwarka, New Delhi"
              />
            </div>

            <div>
              <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 mb-2">
                Account type
              </label>
              <select
                id="account_type"
                name="account_type"
                value={formData.account_type}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
                <option value="Overdraft">Overdraft</option>
                <option value="Cash Credit">Cash Credit</option>
              </select>
            </div>

            <div>
              <label htmlFor="swift_code" className="block text-sm font-medium text-gray-700 mb-2">
                SWIFT / BIC <span className="text-gray-400 font-normal">(optional, for foreign payments)</span>
              </label>
              <input
                id="swift_code"
                name="swift_code"
                value={formData.swift_code}
                onChange={handleChange}
                maxLength={11}
                className={`${inputClass} uppercase`}
                placeholder="HDFCINBB"
              />
            </div>

            <div>
              <label htmlFor="upi_id" className="block text-sm font-medium text-gray-700 mb-2">
                UPI ID <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="upi_id"
                name="upi_id"
                value={formData.upi_id}
                onChange={handleChange}
                className={inputClass}
                placeholder="company@okhdfcbank"
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800 mb-2">
              Company&apos;s Bank Details
            </p>
            {previewRows.length > 0 ? (
              <dl className="space-y-1 text-sm">
                {previewRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[150px_12px_1fr] gap-1">
                    <dt className="font-medium text-gray-700">{row.label}</dt>
                    <dd className="text-gray-500">:</dd>
                    <dd className="text-gray-900 break-all">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-gray-500">Fill in the account to preview the invoice block.</p>
            )}
            <p className="text-xs text-gray-500 mt-3">
              Kindly transfer the payment to the account mentioned above.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save bank details'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
