import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface CompanySettings {
  company_name: string;
  address: string;
  email: string;
  phone: string;
  currency_symbol: string;
}

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Sale {
  id: string;
  customer_name: string;
  issuer_name: string;
  total_amount: number;
  created_at: string;
  items: SaleItem[];
}

export async function generateInvoicePDF(
  sale: Sale,
  companySettings: CompanySettings
): Promise<jsPDF> {
  // Create A4 PDF in mm units
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = { top: 20, left: 15, right: 15, bottom: 20 };

  // Company Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(companySettings.company_name, pageWidth / 2, margin.top, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(companySettings.address, pageWidth / 2, margin.top + 8, {
    align: 'center',
  });
  doc.text(
    `Email: ${companySettings.email} | Phone: ${companySettings.phone}`,
    pageWidth / 2,
    margin.top + 14,
    { align: 'center' }
  );

  // Divider line
  doc.setLineWidth(0.5);
  doc.line(margin.left, margin.top + 18, pageWidth - margin.right, margin.top + 18);

  // Invoice Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('INVOICE', margin.left, margin.top + 30);

  // Invoice Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Invoice ID: ${sale.id.substring(0, 8).toUpperCase()}`, margin.left, margin.top + 38);
  doc.text(
    `Date: ${format(new Date(sale.created_at), 'dd MMM yyyy, hh:mm a')}`,
    margin.left,
    margin.top + 44
  );
  doc.text(`Customer: ${sale.customer_name}`, margin.left, margin.top + 50);
  doc.text(`Issued by: ${sale.issuer_name}`, margin.left, margin.top + 56);

  // Table Data
  const tableData = sale.items.map((item) => [
    item.quantity,
    item.product_name,
    `${companySettings.currency_symbol}${item.unit_price.toFixed(2)}`,
    `${companySettings.currency_symbol}${item.total_price.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: margin.top + 65,
    head: [['Qty', 'Item Name', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 4,
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: margin.left, right: margin.right },
    didDrawPage: () => {
      // Footer with page number
      doc.setFontSize(8);
      doc.text(
        `Page ${doc.internal.getNumberOfPages()}`,
        pageWidth - margin.right,
        pageHeight - 10,
        { align: 'right' }
      );
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || margin.top + 65;

  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Grand Total:', pageWidth - 70, finalY + 10);
  doc.text(
    `${companySettings.currency_symbol}${sale.total_amount.toFixed(2)}`,
    pageWidth - margin.right,
    finalY + 10,
    { align: 'right' }
  );

  // Divider
  doc.setLineWidth(0.5);
  doc.line(margin.left, finalY + 15, pageWidth - margin.right, finalY + 15);

  // Footer Message
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 15, {
    align: 'center',
  });

  return doc;
}
