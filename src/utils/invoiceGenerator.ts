import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

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
  total: number | string;
  sale_date: string;
}

/**
 * Generate an invoice PDF and optionally download it or return the PDF Blob.
 *
 * - Supports remote or data-url logos (will fetch & convert remote images to data URLs).
 * - Validates items and total; if totals don't match, the function recalculates the total from items
 *   and logs a warning.
 * - Works in browser environments (auto-download) and can return a Blob for server-side or custom handling.
 *
 * Returns: Promise<Blob | null>
 *  - Blob when successful (regardless of download), null on validation/error.
 *
 * Options:
 *  - returnPdfBlob?: boolean (default false) - if true, function resolves to the Blob.
 *  - autoDownload?: boolean (default true in browser) - trigger automatic browser download (doc.save).
 *  - logoUrl?: string - data URL, base64 or remote URL to include in header (optional).
 *  - fileName?: string - override filename (default: Invoice_<id>_<yyyyMMdd>.pdf)
 */
export async function generateInvoicePDF(
  sale: Sale,
  items: SaleItem[],
  options: {
    returnPdfBlob?: boolean;
    logoUrl?: string;
    autoDownload?: boolean;
    fileName?: string;
  } = {}
): Promise<Blob | null> {
  try {
    // Basic validation
    if (!Array.isArray(items) || items.length === 0) {
      console.warn("No items provided for invoice.");
      return null;
    }

    // Normalize and validate numeric values
    const parsedTotal = typeof sale.total === "string" ? Number(sale.total) : sale.total;
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      console.warn("Invalid total amount on sale. Recomputing from items if possible.");
    }

    // Validate date
    const saleDate = new Date(sale.sale_date);
    if (isNaN(saleDate.getTime())) {
      console.warn("Invalid sale date.");
      return null;
    }

    // Ensure item subtotals are numbers and compute sum
    let computedTotal = 0;
    const sanitizedItems = items.map((it, idx) => {
      const qty = Number(it.quantity) || 0;
      const unit = Number(it.unit_price) || 0;
      const subtotal = Number(it.subtotal);
      const computedSubtotal = qty * unit;
      const finalSubtotal = isNaN(subtotal) || subtotal <= 0 ? computedSubtotal : subtotal;
      computedTotal += finalSubtotal;
      return {
        ...it,
        quantity: qty,
        unit_price: unit,
        subtotal: finalSubtotal,
        // keep product_name as-is
      };
    });

    // If provided total is missing or mismatched, prefer computed total and log a warning
    let finalTotal = Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : computedTotal;
    if (Math.abs(finalTotal - computedTotal) > 0.01) {
      console.warn(
        `Provided sale.total (${parsedTotal}) does not match sum of items (${computedTotal}). Using computed total.`
      );
      finalTotal = computedTotal;
    }

    // Check for environment with no localStorage (SSR)
    const hasLocalStorage = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
    const companyName = hasLocalStorage
      ? window.localStorage.getItem("company_name") || "YAROTECH NETWORK LIMITED"
      : "YAROTECH NETWORK LIMITED";
    const companyAddress = hasLocalStorage
      ? window.localStorage.getItem("company_address") || "No. 122 Lukoro Plaza, Farm Center, Kano State"
      : "No. 122 Lukoro Plaza, Farm Center, Kano State";
    const companyEmail = hasLocalStorage ? window.localStorage.getItem("company_email") || "info@yarotech.com.ng" : "info@yarotech.com.ng";
    const companyPhone = hasLocalStorage ? window.localStorage.getItem("company_phone") || "+234 814 024 4774" : "+234 814 024 4774";

    const { returnPdfBlob = false, logoUrl, autoDownload = typeof window !== "undefined", fileName } = options;

    // Helper: convert remote image URL or blob to data URL (PNG)
    async function imageUrlToDataUrl(url: string): Promise<string | null> {
      try {
        // If it's already a data URL, return as-is
        if (url.startsWith("data:")) return url;

        // Try to fetch the image
        const resp = await fetch(url, { mode: "cors" });
        if (!resp.ok) {
          console.warn("Failed to fetch logo image:", resp.statusText);
          return null;
        }
        const blob = await resp.blob();
        // Convert blob to data URL via FileReader (works in browser)
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

    // Prepare doc
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
    });
    const pageWidth = (doc.internal.pageSize as any).getWidth();
    const pageHeight = (doc.internal.pageSize as any).getHeight();

    // Colors
    const primaryColor: [number, number, number] = [30, 64, 175]; // Navy blue

    // Header background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 40, "F");

    // Company name and optional logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    // left padding 15mm
    doc.text(companyName, 15, 20);

    // Add logo if provided (try to resolve remote URLs to data URLs)
    if (logoUrl) {
      try {
        const dataUrl = logoUrl.startsWith("data:") ? logoUrl : await imageUrlToDataUrl(logoUrl);
        if (dataUrl) {
          // Determine max size to keep header neat
          const logoW = 18;
          const logoH = 18;
          // Place at right side of header
          const logoX = pageWidth - 15 - logoW;
          const logoY = 10;
          doc.addImage(dataUrl, "PNG", logoX, logoY, logoW, logoH);
        } else {
          console.warn("Logo provided but could not be processed. Skipping logo.");
        }
      } catch (err) {
        console.warn("Failed to add logo:", err);
      }
    }

    // Company details under name
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companyAddress, 15, 27);
    doc.text(`${companyEmail} | ${companyPhone}`, 15, 32);

    // Invoice title and number
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth - 60, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const invoiceNumber = sale.id ? String(sale.id).slice(0, 8).toUpperCase() : `INV-${format(saleDate, "yyyyMMddHHmmss")}`;
    doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - 60, 27);
    doc.text(`Date: ${format(saleDate, "MMMM dd, yyyy")}`, pageWidth - 60, 32);

    // Body text color
    doc.setTextColor(0, 0, 0);

    // Bill To and Issued By
    let yPos = 55;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 15, yPos);
    doc.text("ISSUED BY:", pageWidth / 2 + 10, yPos);

    yPos += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(sale.customer_name || "-", 15, yPos);
    doc.text(sale.issuer_name || "-", pageWidth / 2 + 10, yPos);

    // Prepare table data
    yPos += 15;
    const tableData = sanitizedItems.map((item, index) => [
      (index + 1).toString(),
      item.product_name || "-",
      Number(item.quantity).toString(),
      `₦${Number(item.unit_price).toLocaleString("en-NG")}`,
      `₦${Number(item.subtotal).toLocaleString("en-NG")}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Product", "Quantity", "Unit Price", "Subtotal"]],
      body: tableData,
      theme: "striped",
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 80 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 40, halign: "right" },
        4: { cellWidth: 40, halign: "right" },
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        // Page numbers centered at bottom
        const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;

    // Total box
    doc.setFillColor(239, 246, 255);
    const boxX = pageWidth - 80;
    doc.rect(boxX, finalY + 10, 65, 18, "F");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("TOTAL:", boxX + 5, finalY + 22);
    doc.text(`₦${Number(finalTotal).toLocaleString("en-NG")}`, pageWidth - 20, finalY + 22, { align: "right" });

    // Footer
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const footerY = pageHeight - 22;
    doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });
    doc.text("Generated by YaroTech Sales Manager", pageWidth / 2, footerY + 5, { align: "center" });

    // Determine filename
    const safeFileName =
      fileName ||
      `Invoice_${invoiceNumber}_${format(saleDate, "yyyyMMdd")}.pdf`;

    // Produce Blob
    const pdfBlob = doc.output("blob");

    // Auto-download in browser if requested
    if (autoDownload && typeof window !== "undefined") {
      try {
        // Use jsPDF's save (this will use user agent download behavior)
        doc.save(safeFileName);
      } catch (err) {
        // Fallback: programmatically create anchor and download
        console.warn("doc.save failed, using fallback download:", err);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(pdfBlob);
        link.download = safeFileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          URL.revokeObjectURL(link.href);
          link.remove();
        }, 1000);
      }
    }

    // Return a blob if requested or always return blob for consistent API
    if (returnPdfBlob) {
      return pdfBlob;
    }
    // Return Blob by default (useful for further processing)
    return pdfBlob;
  } catch (error) {
    console.error("Failed to generate invoice PDF:", error);
    return null;
  }
}

export default generateInvoicePDF;
