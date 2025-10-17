import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface CompanySettings {
  company_name: string;
  address: string;
  email: string;
  phone: string;
  currency_symbol: string;
  /** Optional: base64 data URL or base64 string for the logo (png/jpeg). */
  logoBase64?: string | null;
  /** Optional: desired logo width in mm (default 20) */
  logoWidthMm?: number;
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
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12; // left/right margin
  const contentWidth = pageWidth - margin * 2;

  // === Header: logo (optional) + company name + subtitle (address, email, phone) ===
  const topY = 12;
  const logoWidth = companySettings.logoWidthMm ?? 20; // mm
  const logoHeightEstimate = 20; // will scale if actual aspect available

  if (companySettings.logoBase64) {
    try {
      // Accept both data URI or raw base64 - ensure starts with data:image
      const imgData =
        companySettings.logoBase64.indexOf('data:image') === 0
          ? companySettings.logoBase64
          : `data:image/png;base64,${companySettings.logoBase64}`;

      // Put logo at top-left
      doc.addImage(imgData, 'PNG', margin, topY - 2, logoWidth, logoHeightEstimate, undefined, 'FAST');
    } catch (err) {
      // if addImage fails, continue without logo
      // console.warn('Logo could not be added', err);
    }
  }

  // Company name to the right of logo (or at margin if no logo)
  const companyNameX = companySettings.logoBase64 ? margin + logoWidth + 6 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(companySettings.company_name, companyNameX, topY + 6);

  // Subtitle (address, email, phone) beneath company name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  const subtitleLines = [
    companySettings.address,
    `Email: ${companySettings.email} | Phone: ${companySettings.phone}`,
  ].filter(Boolean);

  let subtitleY = topY + 12;
  subtitleLines.forEach((line) => {
    doc.text(line, companyNameX, subtitleY);
    subtitleY += 5;
  });

  // Small divider
  doc.setDrawColor(220);
  doc.setLineWidth(0.4);
  doc.line(margin, subtitleY + 2, pageWidth - margin, subtitleY + 2);

  // === Invoice title and meta (ID, Date, Customer, Issuer) ===
  const invoiceStartY = subtitleY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text('INVOICE', margin, invoiceStartY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const metaX = pageWidth - margin;
  doc.text(`Invoice ID: ${sale.id.substring(0, 8).toUpperCase()}`, metaX, invoiceStartY, { align: 'right' });
  doc.text(
    `Date: ${format(new Date(sale.created_at), 'dd MMM yyyy, hh:mm a')}`,
    metaX,
    invoiceStartY + 6,
    { align: 'right' }
  );
  doc.text(`Customer: ${sale.customer_name}`, margin, invoiceStartY + 8);
  doc.text(`Issued by: ${sale.issuer_name}`, margin, invoiceStartY + 14);

  // === Table of items ===
  const tableStartY = invoiceStartY + 20;
  const tableBody = sale.items.map((it) => [
    it.quantity.toString(),
    it.product_name,
    `${companySettings.currency_symbol}${it.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `${companySettings.currency_symbol}${it.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Qty', 'Item Description', 'Unit Price', 'Total']],
    body: tableBody,
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 6,
      overflow: 'linebreak',
      valign: 'middle',
      halign: 'left',
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: 30,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' }, // Qty
      1: { cellWidth: contentWidth - 16 - 40 - 40 }, // Description flexible
      2: { cellWidth: 40, halign: 'right' }, // Unit Price
      3: { cellWidth: 40, halign: 'right' }, // Total
    },
    didDrawPage: (data) => {
      // You can add page footer or header per page here if needed
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? tableStartY + 10;

  // === Grand total emphasized row ===
  const totalBoxWidth = 70;
  const totalBoxHeight = 10;
  const totalBoxX = pageWidth - margin - totalBoxWidth;
  const totalBoxY = finalY + 8;

  // Light fill for grand total
  doc.setFillColor(240, 248, 255);
  doc.roundedRect(totalBoxX - 2, totalBoxY - 2, totalBoxWidth + 4, totalBoxHeight + 4, 1.5, 1.5, 'F');

  // Draw label and amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text('Grand Total', totalBoxX + 4, totalBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    `${companySettings.currency_symbol}${sale.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    pageWidth - margin - 4,
    totalBoxY + 6,
    { align: 'right' }
  );

  // === Small divider and footer text ===
  doc.setDrawColor(220);
  doc.line(margin, totalBoxY + totalBoxHeight + 8, pageWidth - margin, totalBoxY + totalBoxHeight + 8);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text('Thank you for your business!', pageWidth / 2, totalBoxY + totalBoxHeight + 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generated by: ${sale.issuer_name}`, pageWidth / 2, totalBoxY + totalBoxHeight + 21, { align: 'center' });

  return doc;
}
