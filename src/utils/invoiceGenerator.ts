import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

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
  items?: SaleItem[];
}

interface CompanySettings {
  company_name?: string;
  address?: string;
  email?: string;
  phone?: string;
  currency_symbol?: string;
  logo_url?: string | null;
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ✅ Proper Naira formatter
function formatCurrency(value: number, symbol = "₦"): string {
  const formatter = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatter.format(value)}`;
}

export async function generateInvoicePDF(
  sale: Sale,
  companySettings?: CompanySettings
): Promise<jsPDF> {
  const items = sale.items || [];
  if (items.length === 0) throw new Error("No items provided for invoice.");

  const saleDate = new Date(sale.created_at);
  if (isNaN(saleDate.getTime())) throw new Error("Invalid sale date.");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const headerColor: [number, number, number] = [40, 40, 40]; // dark gray
  const borderColor: [number, number, number] = [0, 0, 0]; // black
  const lightGray: [number, number, number] = [245, 245, 245]; // light gray for alternating rows
  const currencySymbol = companySettings?.currency_symbol || "₦";
  const margin = 15;

  // --- HEADER SECTION ---
  let yPos = margin;

  // Company header background
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 30, "F");
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 30);

  let logoDataUrl: string | null = null;
  if (companySettings?.logo_url)
    logoDataUrl = await imageUrlToDataUrl(companySettings.logo_url);

  if (logoDataUrl)
    doc.addImage(logoDataUrl, "PNG", margin + 2, yPos + 2, 12, 12);

  const companyName = companySettings?.company_name || "YAROTECH NETWORK LIMITED";
  const companyAddress = companySettings?.address || "No. 122 Lukoro Plaza, Farm Center, Kano State";
  const companyEmail = companySettings?.email || "info@yarotech.com.ng";
  const companyPhone = companySettings?.phone || "+234 814 024 4774";

  doc.setTextColor(...headerColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(companyName, logoDataUrl ? margin + 16 : margin + 2, yPos + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(companyAddress, logoDataUrl ? margin + 16 : margin + 2, yPos + 12);
  doc.text(`${companyEmail} | ${companyPhone}`, logoDataUrl ? margin + 16 : margin + 2, yPos + 17);

  doc.setTextColor(...headerColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INVOICE", pageWidth - margin - 2, yPos + 8, { align: "right" });

  yPos += 32;

  // --- INVOICE DETAILS ---
  const invoiceNumber = sale.id.substring(0, 8).toUpperCase();

  // Invoice number and date box
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 12, "F");
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 12);

  doc.setTextColor(...headerColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Invoice #: ${invoiceNumber}`, margin + 3, yPos + 5.5);
  doc.text(`Date: ${format(saleDate, "dd MMM yyyy")}`, pageWidth - margin - 3, yPos + 5.5, { align: "right" });

  yPos += 15;

  // --- BILLING SECTION ---
  doc.setTextColor(...headerColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILL TO:", margin + 2, yPos);
  doc.text("ISSUED BY:", pageWidth / 2 + 2, yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  yPos += 6;
  doc.text(sale.customer_name || "-", margin + 2, yPos);
  doc.text(sale.issuer_name || "-", pageWidth / 2 + 2, yPos);

  yPos += 10;

  // --- TABLE ---
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.product_name || "-",
    String(item.quantity),
    formatCurrency(item.unit_price, currencySymbol),
    formatCurrency(item.total_price, currencySymbol),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Product", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 3.5,
      textColor: [0, 0, 0],
      lineColor: borderColor,
      lineWidth: 0.5,
      font: "helvetica",
      halign: "left",
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: headerColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
      halign: "center",
      lineColor: borderColor,
      lineWidth: 0.5,
    },
    bodyStyles: {
      lineColor: borderColor,
      lineWidth: 0.5,
    },
    alternateRowStyles: {
      fillColor: lightGray,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 85, halign: "left" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    margin: { left: margin, right: margin, top: 5, bottom: 5 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos + 40;

  // --- TOTALS SECTION ---
  yPos = finalY + 8;
  const totalsX = pageWidth - margin - 80;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Subtotal:", totalsX, yPos);
  doc.text(formatCurrency(sale.total_amount, currencySymbol), pageWidth - margin - 3, yPos, { align: "right" });

  yPos += 6;

  // Total box
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.rect(totalsX, yPos, 80, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", totalsX + 3, yPos + 6.5);
  doc.text(formatCurrency(sale.total_amount, currencySymbol), pageWidth - margin - 3, yPos + 6.5, { align: "right" });

  // --- FOOTER ---
  yPos = pageHeight - 18;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Thank you for your business!", pageWidth / 2, yPos + 2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`© ${new Date().getFullYear()} ${companyName}. All rights reserved.`, pageWidth / 2, yPos + 6, { align: "center" });

  return doc;
}

export default generateInvoicePDF;
