"use client";

import React from "react";
import { AlertCircle, FileSpreadsheet, RotateCcw } from "lucide-react";
import { EmptyLedgerIllustrationSvg } from "./BrandAssets";

interface SkeletonCardProps {
  lines?: number;
  heightClass?: string;
  label?: string;
}

export function SkeletonCard({
  lines = 3,
  heightClass = "h-44",
  label = "Loading financial metrics...",
}: SkeletonCardProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`w-full rounded-2xl border border-borderSubtle bg-surface p-5 ${heightClass} flex flex-col justify-between animate-pulse`}
    >
      <div className="space-y-3">
        <div className="h-4 w-1/3 rounded bg-elevated" />
        <div className="h-8 w-2/3 rounded bg-elevated" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className="h-3 rounded bg-elevated"
            style={{ width: `${Math.max(40, 90 - idx * 18)}%` }}
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface EmptyStateCardProps {
  title: string;
  description: string;
  onImportClick?: () => void;
  onResetFilterClick?: () => void;
}

export function EmptyStateCard({
  title,
  description,
  onImportClick,
  onResetFilterClick,
}: EmptyStateCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-borderSubtle bg-surface px-6 py-10 text-center">
      <EmptyLedgerIllustrationSvg className="mb-3 h-24 w-32" />
      <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-textSecondary">{description}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {onImportClick && (
          <button
            type="button"
            onClick={onImportClick}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accentPrimary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Import Excel Transactions
          </button>
        )}
        {onResetFilterClick && (
          <button
            type="button"
            onClick={onResetFilterClick}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-borderSubtle bg-elevated px-4 py-2.5 text-sm font-medium text-textPrimary transition hover:bg-canvas"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset Active Filters
          </button>
        )}
      </div>
    </div>
  );
}

interface ErrorStateCardProps {
  title?: string;
  message: string;
  onRetry: () => void;
}

export function ErrorStateCard({
  title = "Unable to load financial data",
  message,
  onRetry,
}: ErrorStateCardProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-semanticExpense/30 bg-surface px-6 py-10 text-center"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-semanticExpense/10 text-semanticExpense">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-textSecondary">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accentPrimary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Retry Request
      </button>
    </div>
  );
}
