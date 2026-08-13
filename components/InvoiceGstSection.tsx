'use client';

import { computeInvoiceGstTotals, type GstMode } from '@/lib/invoice-gst';

export type InvoiceGstFormValues = {
  gst_mode: GstMode;
  sgst_igst_percent: string;
  cgst_percent: string;
};

type Props = {
  amount: string;
  discount: string;
  currencySymbol?: string;
  value: InvoiceGstFormValues;
  onChange: (patch: Partial<InvoiceGstFormValues>) => void;
  onTotalsChange: (totals: { tax: string; total_amount: string }) => void;
};

export default function InvoiceGstSection({
  amount,
  discount,
  currencySymbol = '₹',
  value,
  onChange,
  onTotalsChange,
}: Props) {
  const totals = computeInvoiceGstTotals({
    amount,
    discount,
    gst_mode: value.gst_mode,
    sgst_igst_percent: value.sgst_igst_percent,
    cgst_percent: value.cgst_percent,
  });

  const fmt = (n: number) =>
    `${currencySymbol}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const setMode = (mode: GstMode) => {
    if (mode === 'INTER') {
      onChange({ gst_mode: 'INTER', cgst_percent: '0' });
    } else {
      onChange({
        gst_mode: 'INTRA',
        sgst_igst_percent: value.sgst_igst_percent || '9',
        cgst_percent: value.cgst_percent === '0' ? '9' : value.cgst_percent || '9',
      });
    }
    const next = computeInvoiceGstTotals({
      amount,
      discount,
      gst_mode: mode,
      sgst_igst_percent: value.sgst_igst_percent,
      cgst_percent: mode === 'INTRA' ? value.cgst_percent || '9' : '0',
    });
    onTotalsChange({
      tax: next.tax.toFixed(2),
      total_amount: next.total_amount.toFixed(2),
    });
  };

  const handlePercentChange = (field: 'sgst_igst_percent' | 'cgst_percent', nextValue: string) => {
    const patch = { [field]: nextValue } as Partial<InvoiceGstFormValues>;
    onChange(patch);
    const next = computeInvoiceGstTotals({
      amount,
      discount,
      gst_mode: value.gst_mode,
      sgst_igst_percent: field === 'sgst_igst_percent' ? nextValue : value.sgst_igst_percent,
      cgst_percent: field === 'cgst_percent' ? nextValue : value.cgst_percent,
    });
    onTotalsChange({
      tax: next.tax.toFixed(2),
      total_amount: next.total_amount.toFixed(2),
    });
  };

  return (
    <div className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-800">GST breakdown</h3>
        <p className="text-xs text-gray-600 mt-1">
          GST is calculated on the invoice amount. Total GST = SGST/IGST + CGST (when applicable).
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="gst_mode"
            checked={value.gst_mode === 'INTRA'}
            onChange={() => setMode('INTRA')}
            className="text-blue-600 focus:ring-blue-500"
          />
          Intra-state (SGST + CGST)
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="gst_mode"
            checked={value.gst_mode === 'INTER'}
            onChange={() => setMode('INTER')}
            className="text-blue-600 focus:ring-blue-500"
          />
          Inter-state (IGST)
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="text-sm font-medium text-gray-800">
            {value.gst_mode === 'INTER' ? 'IGST' : 'SGST'}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rate (%)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={value.sgst_igst_percent}
              onChange={(e) => handlePercentChange('sgst_igst_percent', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-700">
            Amount: <span className="font-semibold">{fmt(totals.sgst_igst_amount)}</span>
          </div>
        </div>

        {value.gst_mode === 'INTRA' ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <div className="text-sm font-medium text-gray-800">CGST</div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rate (%)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={value.cgst_percent}
                onChange={(e) => handlePercentChange('cgst_percent', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-700">
              Amount: <span className="font-semibold">{fmt(totals.cgst_amount)}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white/60 p-4 flex items-center text-sm text-gray-500">
            Inter-state invoices use IGST only. CGST is not applied.
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-gray-500">Total GST:</span>{' '}
          <span className="font-semibold text-gray-900">{fmt(totals.tax)}</span>
        </div>
        <div>
          <span className="text-gray-500">Grand total (incl. GST − discount):</span>{' '}
          <span className="font-semibold text-blue-700">{fmt(totals.total_amount)}</span>
        </div>
      </div>
    </div>
  );
}

export function recalcGstTotals(
  amount: string,
  discount: string,
  gst: InvoiceGstFormValues
): { tax: string; total_amount: string } {
  const totals = computeInvoiceGstTotals({
    amount,
    discount,
    gst_mode: gst.gst_mode,
    sgst_igst_percent: gst.sgst_igst_percent,
    cgst_percent: gst.cgst_percent,
  });
  return {
    tax: totals.tax.toFixed(2),
    total_amount: totals.total_amount.toFixed(2),
  };
}
