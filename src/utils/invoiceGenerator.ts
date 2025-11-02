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
  const primaryColor: [number, number, number] = [30, 64, 175]; // deep blue
  const currencySymbol = companySettings?.currency_symbol || "₦";

  // --- HEADER ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 45, "F");

  let logoDataUrl: string | null = null;
  if (companySettings?.logo_url)
    logoDataUrl = await imageUrlToDataUrl(companySettings.logo_url);

  if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 15, 10, 20, 20);

  const companyName = companySettings?.company_name || "YAROTECH NETWORK LIMITED";
  const companyAddress = companySettings?.address || "No. 122 Lukoro Plaza, Farm Center, Kano State";
  const companyEmail = companySettings?.email || "info@yarotech.com.ng";
  const companyPhone = companySettings?.phone || "+234 814 024 4774";

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(companyName, 40, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(companyAddress, 40, 25);
  doc.text(`${companyEmail} | ${companyPhone}`, 40, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INVOICE", pageWidth - 15, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const invoiceNumber = sale.id.substring(0, 8).toUpperCase();
  doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - 15, 25, { align: "right" });
  doc.text(`Date: ${format(saleDate, "MMMM dd, yyyy")}`, pageWidth - 15, 30, { align: "right" });

  // --- BILLING SECTION ---
  let yPos = 60;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BILL TO:", 15, yPos);
  doc.text("ISSUED BY:", pageWidth / 2 + 10, yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  yPos += 6;
  doc.text(sale.customer_name || "-", 15, yPos);
  doc.text(sale.issuer_name || "-", pageWidth / 2 + 10, yPos);

  // --- TABLE ---
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.product_name || "-",
    String(item.quantity),
    formatCurrency(item.unit_price, currencySymbol),
    formatCurrency(item.total_price, currencySymbol),
  ]);

  autoTable(doc, {
    startY: yPos + 10,
    head: [["#", "Product", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "striped",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 90 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 15, right: 15 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos + 40;

  // --- TOTAL BOX ---
  const boxX = pageWidth - 85;
  const boxWidth = 70;
  const boxHeight = 20;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(boxX, finalY + 10, boxWidth, boxHeight, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TOTAL:", boxX + 5, finalY + 22);
  doc.text(
    formatCurrency(sale.total_amount, currencySymbol),
    pageWidth - 18,
    finalY + 22,
    { align: "right" }
  );

  // --- FOOTER ---
  const footerY = pageHeight - 25;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated by ${companyName}`, pageWidth / 2, footerY + 5, { align: "center" });

  return doc;
}

export default generateInvoicePDF;
