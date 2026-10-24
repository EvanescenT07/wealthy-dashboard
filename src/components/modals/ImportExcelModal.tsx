"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  UploadCloud,
  X,
} from "lucide-react";

interface ImportResultSummary {
  fileName: string;
  totalRowsRead: number;
  validRowsParsed: number;
  insertedCount: number;
  skippedCount: number;
}

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function ImportExcelModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportExcelModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResultSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isUploading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  const resetState = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setResult(null);
  };

  const handleClose = () => {
    if (isUploading) {
      return;
    }
    resetState();
    onClose();
  };

  const handleFileSelect = (file: File | null) => {
    setErrorMessage(null);
    setResult(null);
    if (!file) {
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      setErrorMessage("Please select a valid .xlsx or .xls spreadsheet file.");
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Select an Excel file before importing.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ImportResultSummary & {
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(
          data.error ?? "Failed to import Excel transactions. Check column format."
        );
        return;
      }

      setResult(data);
      onImportSuccess();
    } catch (error: unknown) {
      console.error("[ImportExcelModal] Upload failed:", error);
      setErrorMessage("Network error while uploading Excel file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-excel-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg rounded-2xl border border-borderSubtle bg-surface p-6 text-textPrimary shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="import-excel-modal-title"
                  className="text-lg font-bold text-textPrimary"
                >
                  Non-Destructive Excel Import
                </h2>
                <p className="mt-1 text-xs text-textSecondary">
                  New transactions are injected via SHA-256 row fingerprinting.
                  Existing history and manual wallet balances stay untouched.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close import dialog"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-borderSubtle bg-elevated text-textSecondary transition hover:text-textPrimary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Download Standard Template Banner */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borderSubtle bg-elevated p-3.5">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet
                  className="h-5 w-5 text-accentPrimary"
                  aria-hidden="true"
                />
                <div>
                  <span className="block text-xs font-semibold text-textPrimary">
                    Need the standard column structure?
                  </span>
                  <span className="block text-[11px] text-textSecondary">
                    Date, Account, Category, Subcategory, Note, IDR, Income/Expense
                  </span>
                </div>
              </div>
              <a
                href="/api/template/excel"
                download="WealthyDashboard_Import_Template.xlsx"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-borderSubtle bg-surface px-3.5 py-2 text-xs font-semibold text-accentPrimary transition hover:bg-canvas"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download Template (.xlsx)
              </a>
            </div>

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const droppedFile = e.dataTransfer.files?.[0] ?? null;
                  handleFileSelect(droppedFile);
                }}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Select or drag and drop an Excel file"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  isDragging
                    ? "border-accentPrimary bg-accentPrimary/5"
                    : "border-borderSubtle bg-elevated/60 hover:border-accentPrimary/60"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <UploadCloud
                  className="mb-2 h-8 w-8 text-accentPrimary"
                  aria-hidden="true"
                />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">
                      {selectedFile.name}
                    </p>
                    <p className="mt-0.5 text-xs text-textSecondary tabular-nums">
                      {(selectedFile.size / 1024).toFixed(1)} KB ready to import
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">
                      Drop your .xlsx or .xls file here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-textSecondary">
                      Supports Money Manager exports and WealthyDashboard templates
                    </p>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-semanticExpense/30 bg-semanticExpense/10 px-3.5 py-2.5 text-xs font-medium text-semanticExpense"
                >
                  {errorMessage}
                </div>
              )}

              {result && (
                <div
                  role="status"
                  className="rounded-xl border border-semanticIncome/30 bg-semanticIncome/10 p-3.5 text-xs"
                >
                  <div className="flex items-center gap-2 font-semibold text-semanticIncome">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>Import Complete: {result.fileName}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-textPrimary tabular-nums">
                    <div className="rounded-lg bg-surface p-2">
                      <span className="block text-[11px] text-textSecondary">
                        Rows Read
                      </span>
                      <span className="text-sm font-bold">
                        {result.totalRowsRead}
                      </span>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <span className="block text-[11px] text-textSecondary">
                        New Injected
                      </span>
                      <span className="text-sm font-bold text-semanticIncome">
                        +{result.insertedCount}
                      </span>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <span className="block text-[11px] text-textSecondary">
                        Duplicates Skipped
                      </span>
                      <span className="text-sm font-bold text-textSecondary">
                        {result.skippedCount}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-[44px] rounded-xl border border-borderSubtle bg-elevated px-4 py-2 text-xs font-semibold text-textPrimary transition hover:bg-canvas sm:text-sm"
                >
                  {result ? "Done" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="min-h-[44px] rounded-xl bg-accentPrimary px-5 py-2 text-xs font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  {isUploading ? "Injecting Transactions..." : "Run Safe Import"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

