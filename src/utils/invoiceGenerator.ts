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
  theme: 'grid', // grid looks sharper for invoices
  margin: { left: margin.left, right: margin.right },

  // Header styling
  headStyles: {
    fillColor: [41, 128, 185], // deep blue
    textColor: 255,
    fontStyle: 'bold',
    fontSize: 11,
    halign: 'center',
    valign: 'middle',
    cellPadding: { top: 6, right: 4, bottom: 6, left: 4 },
  },

  // Body styling
  bodyStyles: {
    fontSize: 10,
    textColor: [40, 40, 40],
    cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
    valign: 'middle',
  },

  // Alternate row background
  alternateRowStyles: {
    fillColor: [250, 250, 250],
  },

  // Column-specific widths and alignment
  columnStyles: {
    0: { cellWidth: 20, halign: 'center' }, // Qty
    1: { cellWidth: pageWidth - (margin.left + margin.right + 100) }, // flexible Item Name
    2: { cellWidth: 40, halign: 'right' }, // Unit Price
    3: { cellWidth: 40, halign: 'right' }, // Total
  },

  // Table-wide styles
  styles: {
    lineWidth: 0.1,
    lineColor: [200, 200, 200],
  },

  // Footer per page (page number)
  didDrawPage: () => {
    doc.setFontSize(8);
    doc.text(
      `Page ${doc.internal.getNumberOfPages()}`,
      pageWidth - margin.right,
      pageHeight - 10,
      { align: 'right' }
    );
  },
});

  return doc;
}
