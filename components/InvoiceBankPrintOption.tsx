'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { isBankConfigured, printableBankRows, type CompanyBankDetails } from '@/lib/company-bank';

type Props = {
  printBankDetails: boolean;
  onChange: (value: boolean) => void;
};

export default function InvoiceBankPrintOption({ printBankDetails, onChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [bank, setBank] = useState<CompanyBankDetails | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/settings/bank', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data?.success) {
          setBank(response.data.data);
        }
      } catch (error) {
        console.error('Load bank details error:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const configured = isBankConfigured(bank);
  const rows = printableBankRows(bank);

  return (
    <div className="md:col-span-2 pt-2 border-t border-gray-100 space-y-3">
      <h3 className="text-base font-semibold text-gray-800">Bank details on invoice</h3>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={printBankDetails}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <span className="block text-sm font-medium text-gray-800">Print bank details on this invoice</span>
          <span className="block text-xs text-gray-500 mt-1">
            Uses the company account saved in Settings. Turn this off if this invoice should not show payment details.
          </span>
        </span>
      </label>

      {loading ? (
        <p className="text-xs text-gray-500">Loading saved bank account…</p>
      ) : configured && printBankDetails ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Will appear on the PDF</p>
          <dl className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-3 gap-y-1 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-gray-500">{row.label}</dt>
                <dd className="text-gray-900 font-medium break-all">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : !configured ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No bank account saved yet.{' '}
          <Link href="/dashboard/settings" className="font-medium underline">
            Add it in Settings
          </Link>
          . Invoices keep this option on, and the details show up after you save them.
        </p>
      ) : (
        <p className="text-xs text-gray-500">Bank details will be left off this invoice.</p>
      )}
    </div>
  );
}
