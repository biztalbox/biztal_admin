'use client';

import toast from 'react-hot-toast';
import { readImageFileAsDataUrl } from '@/lib/utils';

type Props = {
  po_no: string;
  po_date: string;
  signature_image: string;
  onChange: (patch: Partial<{ po_no: string; po_date: string; signature_image: string }>) => void;
};

export default function InvoicePdfExtras({ po_no, po_date, signature_image, onChange }: Props) {
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      onChange({ signature_image: dataUrl });
      toast.success('Signature uploaded');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload signature';
      toast.error(message);
    }
    e.target.value = '';
  };

  return (
    <div className="md:col-span-2 pt-2 border-t border-gray-100 space-y-4">
      <h3 className="text-base font-semibold text-gray-800">Invoice PDF extras</h3>
      <p className="text-xs text-gray-500">
        P.O. fields appear below HSN on the PDF. Signature shows at bottom-right when uploaded.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="po_no" className="block text-sm font-medium text-gray-700 mb-2">
            P.O. No. <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            id="po_no"
            name="po_no"
            value={po_no}
            onChange={(e) => onChange({ po_no: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Purchase order number"
          />
        </div>

        <div>
          <label htmlFor="po_date" className="block text-sm font-medium text-gray-700 mb-2">
            P.O. Date <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            id="po_date"
            name="po_date"
            value={po_date}
            onChange={(e) => onChange({ po_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="signature_image" className="block text-sm font-medium text-gray-700 mb-2">
            Authorized signature <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap items-start gap-4">
            <input
              type="file"
              id="signature_image"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleSignatureUpload}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {signature_image ? (
              <div className="flex flex-col items-start gap-2">
                <img
                  src={signature_image}
                  alt="Signature preview"
                  className="h-16 max-w-[180px] object-contain border border-gray-200 rounded bg-white p-1"
                />
                <button
                  type="button"
                  onClick={() => onChange({ signature_image: '' })}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove signature
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
