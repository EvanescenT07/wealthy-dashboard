"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Upload,
} from "lucide-react";
import { DashboardSummaryData } from "./DashboardTab";
import { generateFinancialReportPdf } from "@/lib/pdf";

interface ReportsTabProps {
  data: DashboardSummaryData | null;
  onOpenImportExcel: () => void;
}

export function ReportsTab({ data, onOpenImportExcel }: ReportsTabProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [walletId, setWalletId] = useState("");
  const [txType, setTxType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const wallets = data?.wallets ?? [];
  const importLogs = data?.importLogs ?? [];

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (fromDate) {
      params.set("from", fromDate);
    }
    if (toDate) {
      params.set("to", toDate);
    }
    if (walletId) {
      params.set("wallets", walletId);
    }
    if (txType !== "ALL") {
      params.set("type", txType);
    }
    return params.toString();
  };

  const handleExportExcel = () => {
    const qs = buildQueryString();
    window.location.href = `/api/export/excel${qs ? `?${qs}` : ""}`;
  };

  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const qs = buildQueryString();
      const response = await fetch(
        `/api/transactions?limit=200${qs ? `&${qs}` : ""}`
      );
      const json = (await response.json()) as {
        transactions?: Array<{
          date: string;
          walletName: string;
          category: string;
          subcategory: string | null;
          note: string | null;
          type: "INCOME" | "EXPENSE";
          amountIdr: number;
        }>;
      };

      const rows = json.transactions ?? [];
      let totalIncome = 0;
      let totalExpense = 0;
      for (const r of rows) {
        if (r.type === "INCOME") {
          totalIncome += r.amountIdr;
        } else {
          totalExpense += r.amountIdr;
        }
      }

      const periodLabel =
        fromDate || toDate
          ? `${fromDate || "Start"} to ${toDate || "Present"}`
          : "All Recorded Dates";

      generateFinancialReportPdf({
        periodLabel,
        totalBalance: data?.totalManualBalance ?? 0,
        totalIncome,
        totalExpense,
        netCashflow: totalIncome - totalExpense,
        transactions: rows,
      });
    } catch (error: unknown) {
      console.error("[ReportsTab] Failed to generate PDF report:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Custom Export Panel */}
      <section className="rounded-2xl border border-borderSubtle bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-textPrimary">
              Custom Report Exporter (PDF &amp; Excel)
            </h2>
            <p className="mt-1 text-xs text-textSecondary">
              Configure date boundaries, specific wallets, and cashflow type
              before downloading your statement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/template/excel"
              download="WealthyDashboard_Import_Template.xlsx"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-borderSubtle bg-elevated px-4 py-2 text-xs font-semibold text-textPrimary transition hover:bg-canvas"
            >
              <Download className="h-4 w-4 text-accentPrimary" aria-hidden="true" />
              <span>Download Blank Template (.xlsx)</span>
            </a>
            <button
              type="button"
              onClick={onOpenImportExcel}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accentPrimary px-4 py-2 text-xs font-semibold text-white transition hover:opacity-95"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>Import New Excel File</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="report-from-date"
              className="block text-xs font-semibold text-textSecondary"
            >
              Start Date
            </label>
            <input
              id="report-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-xs text-textPrimary sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="report-to-date"
              className="block text-xs font-semibold text-textSecondary"
            >
              End Date
            </label>
            <input
              id="report-to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-xs text-textPrimary sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="report-wallet-select"
              className="block text-xs font-semibold text-textSecondary"
            >
              Target Wallet
            </label>
            <select
              id="report-wallet-select"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-xs font-medium text-textPrimary sm:text-sm"
            >
              <option value="">All Wallets</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="report-type-select"
              className="block text-xs font-semibold text-textSecondary"
            >
              Cashflow Type
            </label>
            <select
              id="report-type-select"
              value={txType}
              onChange={(e) =>
                setTxType(e.target.value as "ALL" | "INCOME" | "EXPENSE")
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-borderSubtle bg-elevated px-3 py-2 text-xs font-medium text-textPrimary sm:text-sm"
            >
              <option value="ALL">All Transactions</option>
              <option value="INCOME">Income Only</option>
              <option value="EXPENSE">Expense Only</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-borderSubtle pt-5">
          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={handleExportPdf}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accentPrimary px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-95 disabled:opacity-50 sm:text-sm"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>
              {isGeneratingPdf ? "Generating PDF..." : "Export to PDF"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#A3E635] px-5 py-2.5 text-xs font-bold text-[#0F172A] transition hover:opacity-95 sm:text-sm"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span>Export to Excel (.xlsx)</span>
          </button>
        </div>
      </section>

      {/* ImportLog Audit History Table */}
      <section className="rounded-2xl border border-borderSubtle bg-surface p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accentPrimary/10 text-accentPrimary">
            <History className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-textPrimary">
              Excel Import Audit Log (Non-Destructive History)
            </h2>
            <p className="text-xs text-textSecondary">
              Records every Excel upload, new rows injected, and duplicate rows
              safely skipped via SHA-256 externalHash
            </p>
          </div>
        </div>

        {importLogs.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-borderSubtle bg-elevated/40 p-8 text-center">
            <p className="text-sm font-semibold text-textPrimary">
              No Excel imports recorded yet
            </p>
            <p className="mt-1 text-xs text-textSecondary">
              Click &ldquo;Import New Excel File&rdquo; above to run your
              initial non-destructive import.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-borderSubtle text-[11px] font-semibold uppercase tracking-wider text-textSecondary">
                  <th className="pb-3 pr-3">Imported At</th>
                  <th className="pb-3 px-3">File Name</th>
                  <th className="pb-3 px-3 text-right">Rows Read</th>
                  <th className="pb-3 px-3 text-right">New Injected</th>
                  <th className="pb-3 pl-3 text-right">Duplicates Skipped</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle tabular-nums">
                {importLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition hover:bg-elevated/70"
                  >
                    <td className="whitespace-nowrap py-3.5 pr-3 text-xs text-textSecondary">
                      {new Date(log.importedAt).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs font-semibold text-textPrimary">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2
                          className="h-3.5 w-3.5 text-semanticIncome"
                          aria-hidden="true"
                        />
                        {log.fileName}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-textPrimary">
                      {log.totalRowsRead}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-semanticIncome">
                      +{log.insertedCount}
                    </td>
                    <td className="py-3.5 pl-3 text-right font-medium text-textSecondary">
                      {log.skippedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

