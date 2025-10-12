import { useState, useEffect } from 'react';
import { Download, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateInvoicePDF } from '../../utils/invoiceGenerator';

interface InvoicePreviewProps {
  saleId: string;
  onClose: () => void;
}

export function InvoicePreview({ saleId, onClose }: InvoicePreviewProps) {
  const [loading, setLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSaleData = async () => {
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single();

    if (saleError) throw saleError;

    const { data: itemsData, error: itemsError } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId);

    if (itemsError) throw itemsError;

    const { data: settingsData } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    return {
      sale: { ...saleData, items: itemsData },
      settings: settingsData || {
        company_name: 'YAROTECH NETWORK LIMITED',
        address: 'No. 122 Lukoro Plaza, Farm Center, Kano State',
        email: 'info@yarotech.com.ng',
        phone: '+234 814 024 4774',
        currency_symbol: '₦',
      },
    };
  };

  const handleDownload = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { sale, settings } = await fetchSaleData();
      const doc = await generateInvoicePDF(sale, settings);
      doc.save(`Invoice_${sale.id.substring(0, 8)}.pdf`);
      setMessage('Invoice downloaded successfully!');
    } catch (err) {
      setMessage('Failed to generate invoice');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSend = async () => {
    setEmailSending(true);
    setMessage('');

    try {
      const { sale, settings } = await fetchSaleData();
      const doc = await generateInvoicePDF(sale, settings);

      setMessage(
        'Invoice generated! Note: Email functionality requires backend setup. PDF is ready for download.'
      );

      await supabase
        .from('sales')
        .update({ invoice_sent: true })
        .eq('id', saleId);
    } catch (err) {
      setMessage('Failed to send invoice');
      console.error(err);
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Invoice Generated
        </h3>

        <p className="text-gray-600 mb-6">
          Your sale has been recorded successfully. You can now download the invoice
          or send it via email.
        </p>

        {message && (
          <div
            className={`mb-4 px-4 py-2 rounded-lg text-sm ${
              message.includes('Failed')
                ? 'bg-red-50 text-red-600'
                : 'bg-green-50 text-green-600'
            }`}
          >
            {message}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Download size={20} />
            <span>{loading ? 'Generating...' : 'Download Invoice'}</span>
          </button>

          <button
            onClick={handleEmailSend}
            disabled={emailSending}
            className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            <Mail size={20} />
            <span>{emailSending ? 'Processing...' : 'Send via Email'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Invoice ID: {saleId.substring(0, 8).toUpperCase()}
        </p>
      </div>
    </div>
  );
}
