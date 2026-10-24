import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatIdr } from "./utils";

export interface PdfReportTransaction {
  date: string;
  walletName: string;
  category: string;
  subcategory: string | null;
  note: string | null;
  type: "INCOME" | "EXPENSE";
  amountIdr: number;
}

export interface PdfReportOptions {
  periodLabel: string;
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  transactions: PdfReportTransaction[];
}

export function generateFinancialReportPdf(options: PdfReportOptions): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Header Banner
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, 210, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("WealthyDashboard Financial Report", 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Active Filter Period: ${options.periodLabel}`, 14, 23);
  doc.text(`Generated At: ${new Date().toLocaleString("id-ID")}`, 14, 29);

  // Summary KPI Box
  doc.setFillColor(244, 245, 247);
  doc.roundedRect(14, 40, 182, 24, 3, 3, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL MANUAL BALANCE", 19, 48);
  doc.text("TOTAL INCOME", 68, 48);
  doc.text("TOTAL EXPENSE", 114, 48);
  doc.text("NET CASHFLOW", 158, 48);

  doc.setFontSize(10.5);
  doc.setTextColor(29, 78, 216);
  doc.text(formatIdr(options.totalBalance), 19, 57);

  doc.setTextColor(21, 128, 61);
  doc.text(formatIdr(options.totalIncome), 68, 57);

  doc.setTextColor(185, 28, 28);
  doc.text(formatIdr(options.totalExpense), 114, 57);

  doc.setTextColor(options.netCashflow >= 0 ? 21 : 185, options.netCashflow >= 0 ? 128 : 28, options.netCashflow >= 0 ? 61 : 28);
  doc.text(formatIdr(options.netCashflow), 158, 57);

  // Transactions Table
  const tableBody = options.transactions.map((tx, idx) => [
    String(idx + 1),
    new Date(tx.date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    tx.walletName,
    tx.subcategory ? `${tx.category} / ${tx.subcategory}` : tx.category,
    tx.note ?? "-",
    tx.type,
    formatIdr(tx.amountIdr),
  ]);

  autoTable(doc, {
    startY: 70,
    head: [["#", "Date", "Wallet", "Category", "Note", "Type", "Amount (IDR)"]],
    body:
      tableBody.length > 0
        ? tableBody
        : [["-", "-", "-", "No transactions in selected filter", "-", "-", "Rp 0"]],
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 24 },
      2: { cellWidth: 25 },
      3: { cellWidth: 38 },
      4: { cellWidth: 40 },
      5: { cellWidth: 18 },
      6: { cellWidth: 27, halign: "right" },
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`WealthyDashboard_Report_${stamp}.pdf`);
}

