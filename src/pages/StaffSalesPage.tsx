import { useState } from 'react';
import { StaffSalesForm } from '../components/Staff/StaffSalesForm';
import { InvoicePreview } from '../components/Sales/InvoicePreview';

export function StaffSalesPage() {
  const [generatedSaleId, setGeneratedSaleId] = useState<string | null>(null);

  const handleSaleCreated = (saleId: string) => {
    setGeneratedSaleId(saleId);
  };

  const handleCloseInvoice = () => {
    setGeneratedSaleId(null);
  };

  return (
    <div>
      <StaffSalesForm onSaleCreated={handleSaleCreated} />
      {generatedSaleId && (
        <InvoicePreview saleId={generatedSaleId} onClose={handleCloseInvoice} />
      )}
    </div>
  );
}
