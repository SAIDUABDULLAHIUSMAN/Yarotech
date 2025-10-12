import { useState } from 'react';
import { SalesForm } from '../components/Sales/SalesForm';
import { InvoicePreview } from '../components/Sales/InvoicePreview';

export function SalesPage() {
  const [generatedSaleId, setGeneratedSaleId] = useState<string | null>(null);

  const handleSaleCreated = (saleId: string) => {
    setGeneratedSaleId(saleId);
  };

  const handleCloseInvoice = () => {
    setGeneratedSaleId(null);
  };

  return (
    <div className="max-w-4xl">
      <SalesForm onSaleCreated={handleSaleCreated} />
      {generatedSaleId && (
        <InvoicePreview saleId={generatedSaleId} onClose={handleCloseInvoice} />
      )}
    </div>
  );
}
