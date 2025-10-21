// file: src/utils/pdf/generateInvoicePDF.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import openSansBase64 from "./fonts/OpenSans-Regular.base64"; // make sure this path exists

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Sale {
  id: string;
  customer_name: string;
  issuer_name: string;
  total: number;
  sale_date: string;
}

interface InvoiceOptions {
  returnPdfBlob?: boolean;
  logoUrl?: string;
  signatureImageUrl?: string;
  paperSize?: "A4" | "A5";
  watermarkText?: string;
}

export const generateInvoicePDF = (
  sale: Sale,
  items: SaleItem[],
  options: InvoiceOptions = {}
) => {
  try {
    if (!items?.length) throw new Error("No items provided.");
    if (isNaN(sale.total) || sale.total <= 0) throw new Error("Invalid total.");
    const saleDate = new Date(sale.sale_date);
    if (isNaN(saleDate.getTime())) throw new Error("Invalid sale date.");

    const {
      returnPdfBlob = false,
      logoUrl,
      signatureImageUrl,
      paperSize = "A4",
      watermarkText = "YAROTECH NETWORK LIMITED",
    } = options;

    const doc = new jsPDF({ unit: "mm", format: paperSize.toLowerCase() });

    // ✅ Load Unicode font safely
    if (openSansBase64 && openSansBase64.length > 1000) {
      doc.addFileToVFS("OpenSans-Regular.ttf", openSansBase64);
      doc.addFont("OpenSans-Regular.ttf", "OpenSans", "normal");
      doc.setFont("OpenSans");
    } else {
      console.warn("Font not loaded, fallback to helvetica");
      doc.setFont("helvetica", "normal");
    }

    // === Basic setup ===
    const companyName =
      localStorage.getItem("company_name") || "YAROTECH NETWORK LIMITED";
    const companyAddress =
      localStorage.getItem("company_address") ||
      "No. 122 Lukoro Plaza, Farm Center, Kano State";
    const companyEmail =
      localStorage.getItem("company_email") || "info@yarotech.com.ng";
    const companyPhone =
      localStorage.getItem("company_phone") || "+234 814 024 4774";

    const primary: [number, number, number] = [30, 64, 175];
    const accent: [number, number, number] = [59, 130, 246];

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // === Watermark ===
    doc.setFontSize(40);
    doc.setTextColor(230);
    doc.setFont("OpenSans", "bold");
    doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });

    // === Header ===
    doc.setFillColor(...primary);
    doc.rect(0, 0, pageWidth, 30, "F");

    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.text(companyName, 20, 18);

    if (logoUrl) {
      try {
        doc.addImage(logoUrl, "PNG", pageWidth - 40, 8, 25, 15);
      } catch (err) {
        console.warn("Logo failed:", err);
      }
    }

    doc.setFontSize(9);
    doc.setTextColor(255);
    doc.text(companyAddress, 20, 24);
    doc.text(`${companyEmail} | ${companyPhone}`, 20, 28);

    // === Invoice Info ===
    doc.setFont("OpenSans", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...accent);
    doc.text("INVOICE", pageWidth - 50, 45);

    doc.setFontSize(9);
    doc.setFont("OpenSans", "normal");
    doc.setTextColor(0);
    doc.text(`Invoice #: ${sale.id.slice(0, 8).toUpperCase()}`, pageWidth - 50, 50);
    doc.text(`Date: ${format(saleDate, "MMMM dd, yyyy")}`, pageWidth - 50, 55);

    // === Bill To / Issued By ===
    let y = 65;
    doc.setFont("OpenSans", "bold");
    doc.text("BILL TO:", 20, y);
    doc.text("ISSUED BY:", pageWidth / 2 + 10, y);
    y += 6;
    doc.setFont("OpenSans", "normal");
    doc.text(sale.customer_name, 20, y);
    doc.text(sale.issuer_name, pageWidth / 2 + 10, y);

    // === Table ===
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [["#", "Product", "Quantity", "Unit Price", "Subtotal"]],
      body: items.map((it, i) => [
        i + 1,
        it.product_name,
        it.quantity,
        `₦${it.unit_price.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
        `₦${it.subtotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
      ]),
      theme: "grid",
      headStyles: { fillColor: primary, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      bodyStyles: { fontSize: paperSize === "A5" ? 8 : 9, font: "OpenSans" },
      margin: { left: 15, right: 15 },
    });

    // === Total ===
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(239, 246, 255);
    doc.rect(pageWidth - 85, finalY, 70, 15, "F");

    doc.setFont("OpenSans", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primary);
    doc.text("TOTAL:", pageWidth - 80, finalY + 10);
    doc.text(
      `₦${sale.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
      pageWidth - 20,
      finalY + 10,
      { align: "right" }
    );

    // === Footer ===
    const footerY = pageHeight - 15;
    doc.setFont("OpenSans", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Thank you for your business!", pageWidth / 2, footerY, {
      align: "center",
    });
    doc.text("Generated by YaroTech Sales Manager", pageWidth / 2, footerY + 4, {
      align: "center",
    });

    // === Export ===
    const fileName = `Invoice_${sale.id.slice(0, 8)}_${format(
      saleDate,
      "yyyyMMdd"
    )}.pdf`;

    if (returnPdfBlob) return doc.output("blob");
    doc.save(fileName);
    return doc;
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("Unable to generate PDF. Check console for details.");
    return null;
  }
};
