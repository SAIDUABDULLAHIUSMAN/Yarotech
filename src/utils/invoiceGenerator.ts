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
    if (!resp.ok) {
      console.warn("Failed to fetch logo image:", resp.statusText);
      return null;
    }
    const blob = await resp.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => {
        console.warn("Failed to convert logo blob to data URL.");
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Error loading logo:", err);
    return null;
  }
}

export async function generateInvoicePDF(
  sale: Sale,
  companySettings?: CompanySettings
): Promise<jsPDF> {
  const items = sale.items || [];
  if (items.length === 0) {
    throw new Error("No items provided for invoice.");
  }
  const saleDate = new Date(sale.created_at);
  if (isNaN(saleDate.getTime())) {
    throw new Error("Invalid sale date.");
  }
  const companyName = companySettings?.company_name || "YAROTECH NETWORK LIMITED";
  const companyAddress = companySettings?.address || "No. 122 Lukoro Plaza, Farm Center, Kano State";
  const companyEmail = companySettings?.email || "info@yarotech.com.ng";
  const companyPhone = companySettings?.phone || "+234 814 024 4774";
  const currencySymbol = companySettings?.currency_symbol || "₦";
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor: [number, number, number] = [30, 64, 175];
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 50, "F");
  let logoDataUrl: string | null = null;
  if (companySettings?.logo_url) {
    logoDataUrl = await imageUrlToDataUrl(companySettings.logo_url);
  }
  if (!logoDataUrl) {
    try {
      logoDataUrl = await imageUrlToDataUrl("/yarotech logo copy.png");
    } catch (err) {
      console.warn("Could not load default logo:", err);
    }
  }
  if (logoDataUrl) {
    try {
      const logoSize = 20;
      const logoX = 15;
      const logoY = 10;
      doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
    } catch (err) {
      console.warn("Failed to add logo to PDF:", err);
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  const companyNameX = logoDataUrl ? 40 : 15;
  doc.text(companyName, companyNameX, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(companyAddress, companyNameX, 27);
  doc.text(`${companyEmail} | ${companyPhone}`, companyNameX, 32);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 15, 20, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const invoiceNumber = sale.id.substring(0, 8).toUpperCase();
  doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - 15, 27, { align: "right" });
  doc.text(`Date: ${format(saleDate, "MMMM dd, yyyy")}`, pageWidth - 15, 32, { align: "right" });
  doc.setTextColor(0, 0, 0);
  let yPos = 65;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 15, yPos);
  doc.text("ISSUED BY:", pageWidth / 2 + 10, yPos);
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(sale.customer_name || "-", 15, yPos);
  doc.text(sale.issuer_name || "-", pageWidth / 2 + 10, yPos);
  yPos += 15;
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.product_name || "-",
    Number(item.quantity).toString(),
    `${currencySymbol}${Number(item.unit_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`,
    `${currencySymbol}${Number(item.total_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`,
  ]);
  autoTable(doc, {
    startY: yPos,
    head: [["#", "Product", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "striped",
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 85 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    },
  });
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
  doc.setFillColor(239, 246, 255);
  const boxX = pageWidth - 80;
  const boxWidth = 65;
  const boxHeight = 20;
  doc.rect(boxX, finalY + 10, boxWidth, boxHeight, "F");
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(boxX, finalY + 10, boxWidth, boxHeight);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TOTAL:", boxX + 5, finalY + 22);
  doc.text(
    `${currencySymbol}${Number(sale.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`,
    pageWidth - 20,
    finalY + 22,
    { align: "right" }
  );
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  const footerY = pageHeight - 25;
  doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated by ${companyName}`, pageWidth / 2, footerY + 5, { align: "center" });
  return doc;
}

export default generateInvoicePDF;