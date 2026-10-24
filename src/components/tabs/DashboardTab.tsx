"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import {
  EmptyStateCard,
  ErrorStateCard,
  SkeletonCard,
} from "@/components/ui/SkeletonCard";
import { formatCompactIdr, formatIdr } from "@/lib/utils";

export interface DashboardSummaryData {
  totalManualBalance: number;
  wallets: Array<{
    id: string;
    name: string;
    slug: string;
    manualBalance: number;
    color: string;
    icon: string;
    isDefault: boolean;
    isVisible: boolean;
    sharePct: number;
  }>;
  incomeSummary: {
    totalIncome: number;
    primaryIncome: number;
    otherIncome: number;
    previousIncome: number;
    diffIdr: number;
    changePct: number;
  };
  expenseSummary: {
    totalExpense: number;
    previousExpense: number;
    diffIdr: number;
    changePct: number;
    topCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
  budget: {
    monthlyLimitIdr: number;
    currentExpenseIdr: number;
    utilizationPct: number;
    priorityCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
  monthlyOverview: {
    selectedYear: number;
    availableYears: number[];
    months: Array<{
      monthIndex: number;
      month: string;
      income: number;
      expense: number;
      netCashflow: number;
    }>;
  };
  analytics: {
    netCashflow: number;
    netCashflowChangePct: number;
    totalTransactionsCount: number;
    savingsRatePct: number;
    avgTransactionSizeIdr: number;
    dailySeries: Array<{
      label: string;
      income: number;
      expense: number;
      netCashflow: number;
    }>;
    spendingVsTarget: Array<{
      date: string;
      actualCumulativeExpense: number;
      targetLine: number;
      monthlyLimit: number;
    }>;
    categoryShareExpense: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    categoryShareIncome: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    expenseFunnel: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    topWalletsExpense: Array<{
      name: string;
      color: string;
      amount: number;
    }>;
    topSubcategoriesExpense: Array<{
      name: string;
      amount: number;
      percentage: number;
    }>;
  };
  recentTransactions: Array<{
    id: string;
    date: string;
    walletId: string;
    walletName: string;
    walletColor: string;
    category: string;
    subcategory: string | null;
    note: string | null;
    description: string | null;
    amountIdr: number;
    type: "INCOME" | "EXPENSE";
  }>;
  availableCategories: string[];
  importLogs: Array<{
    id: string;
    fileName: string;
    totalRowsRead: number;
    insertedCount: number;
    skippedCount: number;
    importedAt: string;
  }>;
}

interface DashboardTabProps {
  data: DashboardSummaryData | null;
  isLoading: boolean;
  error: string | null;
  isMasked: boolean;
  onToggleMask: () => void;
  chartYear: number;
  onChangeChartYear: (year: number) => void;
  incomePeriod: string;
  onChangeIncomePeriod: (period: string) => void;
  onOpenEditBalance: () => void;
  onOpenImportExcel: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onRetry: () => void;
  onResetFilters: () => void;
  onBudgetSaved: () => void;
}

const STACK_COLORS = ["#EF4444", "#F97316", "#F59E0B", "#64748B"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

export function DashboardTab({
  data,
  isLoading,
  error,
  isMasked,
  onToggleMask,
  chartYear,
  onChangeChartYear,
  incomePeriod,
  onChangeIncomePeriod,
  onOpenEditBalance,
  onOpenImportExcel,
  onExportPdf,
  onExportExcel,
  onRetry,
  onResetFilters,
  onBudgetSaved,
}: DashboardTabProps) {
  const [monthRange, setMonthRange] = useState<"6M" | "12M">("12M");
  const [recentSearch, setRecentSearch] = useState("");
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard heightClass="h-64" label="Loading Total Balance card" />
        <SkeletonCard heightClass="h-64" label="Loading Total Income card" />
        <SkeletonCard heightClass="h-64" label="Loading Total Expense card" />
        <SkeletonCard heightClass="h-80" label="Loading Monthly Budget gauge" />
        <div className="md:col-span-2">
          <SkeletonCard
            heightClass="h-80"
            label="Loading Monthly Cashflow Overview chart"
          />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorStateCard
        message={error ?? "Unable to load dashboard summary."}
        onRetry={onRetry}
      />
    );
  }

  const visibleWallets = data.wallets.filter((w) => w.isVisible);
  const displayedMonths =
    monthRange === "6M"
      ? data.monthlyOverview.months.slice(-6)
      : data.monthlyOverview.months;

  const filteredRecent = data.recentTransactions.filter((tx) => {
    if (!recentSearch.trim()) {
      return true;
    }
    const q = recentSearch.toLowerCase();
    return (
      tx.category.toLowerCase().includes(q) ||
      (tx.subcategory ?? "").toLowerCase().includes(q) ||
      (tx.note ?? "").toLowerCase().includes(q) ||
      tx.walletName.toLowerCase().includes(q)
    );
  });

  const handleSaveBudget = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingBudget(true);
    try {
      const response = await fetch("/api/settings/budget", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyLimitIdr: budgetInput }),
      });
      if (response.ok) {
        setIsEditingBudget(false);
        onBudgetSaved();
      }
    } catch (err: unknown) {
      console.error("[DashboardTab] Failed to update budget limit:", err);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const gaugeClampedPct = Math.min(100, Math.max(0, data.budget.utilizationPct));
  const arcRadius = 72;
  const arcCircumference = Math.PI * arcRadius;
  const arcDashOffset =
    arcCircumference - (gaugeClampedPct / 100) * arcCircumference;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Top Row: Hero Total Balance + Total Income + Total Expense */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 1. Hero Card: Total Balance (Royal Blue Anchor) */}
        <motion.article
          variants={cardVariants}
          className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#1D4ED8] p-6 text-white lg:col-span-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                  Total Active Balance (IDR)
                </span>
                <button
                  type="button"
                  onClick={onToggleMask}
                  aria-label={
                    isMasked ? "Show currency values" : "Mask currency values"
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
                >
                  {isMasked ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                <AnimatedCounter
                  value={data.totalManualBalance}
                  format="idr"
                  isMasked={isMasked}
                />
              </div>
              <p className="mt-1 text-xs text-blue-100">
                Aggregated across {visibleWallets.length} visible wallets
              </p>
            </div>

            {/* Wallet Proportion Matrix Grid */}
            <div
              aria-label="Wallet balance proportion matrix"
              className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-950/25 p-2.5"
            >
              {visibleWallets.slice(0, 9).map((w) => (
                <div
                  key={w.id}
                  title={`${w.name}: ${formatIdr(w.manualBalance)} (${w.sharePct}%)`}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: w.color }}
                >
                  {w.name.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {/* 3 Quick Action Buttons */}
          <div className="mt-6 grid grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={onOpenEditBalance}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#0F172A] transition hover:bg-blue-50"
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>+ Edit Balance</span>
            </button>
            <button
              type="button"
              onClick={onOpenImportExcel}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Import Excel</span>
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#A3E635] px-3 py-2 text-xs font-bold text-[#0F172A] transition hover:opacity-95"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export .xlsx</span>
            </button>
          </div>
        </motion.article>

        {/* 2. Summary Card: Total Income */}
        <motion.article
          variants={cardVariants}
          className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-6 lg:col-span-3"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-semanticIncome/15 text-semanticIncome">
                  <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-textPrimary">
                    Total Income
                  </h2>
                  <span className="text-[11px] text-textSecondary">
                    Inbound Cashflow
                  </span>
                </div>
              </div>

              <label htmlFor="income-card-period" className="sr-only">
                Income Card Period Filter
              </label>
              <select
                id="income-card-period"
                value={incomePeriod}
                onChange={(e) => onChangeIncomePeriod(e.target.value)}
                className="min-h-[38px] rounded-lg border border-borderSubtle bg-elevated px-2.5 py-1 text-xs font-medium text-textPrimary"
              >
                <option value="global">Global Period</option>
                <option value="this_month">This Month</option>
                <option value="last_3_months">3 Months</option>
                <option value="this_year">This Year</option>
              </select>
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-2">
              <div className="text-2xl font-extrabold text-textPrimary">
                <AnimatedCounter
                  value={data.incomeSummary.totalIncome}
                  format="idr"
                  isMasked={isMasked}
                />
              </div>
              <span
                className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums ${
                  data.incomeSummary.changePct >= 0
                    ? "bg-semanticIncome/15 text-semanticIncome"
                    : "bg-semanticExpense/15 text-semanticExpense"
                }`}
              >
                {data.incomeSummary.changePct >= 0 ? "+" : ""}
                {data.incomeSummary.changePct}%
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-borderSubtle pt-4">
            <div className="rounded-xl bg-elevated p-2.5">
              <span className="block text-[11px] font-medium text-textSecondary">
                Primary (Salary/THR)
              </span>
              <span className="mt-0.5 block text-xs font-bold tabular-nums text-textPrimary">
                {isMasked
                  ? "Rp ••••••"
                  : formatCompactIdr(data.incomeSummary.primaryIncome)}
              </span>
            </div>
            <div className="rounded-xl bg-elevated p-2.5">
              <span className="block text-[11px] font-medium text-textSecondary">
                Other Income
              </span>
              <span className="mt-0.5 block text-xs font-bold tabular-nums text-textPrimary">
                {isMasked
                  ? "Rp ••••••"
                  : formatCompactIdr(data.incomeSummary.otherIncome)}
              </span>
            </div>
          </div>
        </motion.article>

        {/* 3. Summary Card: Total Expense */}
        <motion.article
          variants={cardVariants}
          className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-6 lg:col-span-4"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-semanticExpense/15 text-semanticExpense">
                  <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-textPrimary">
                    Total Expense
                  </h2>
                  <span className="text-[11px] text-textSecondary">
                    Top 3 Categories Breakdown
                  </span>
                </div>
              </div>

              <span
                className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums ${
                  data.expenseSummary.changePct <= 0
                    ? "bg-semanticIncome/15 text-semanticIncome"
                    : "bg-semanticExpense/15 text-semanticExpense"
                }`}
              >
                {data.expenseSummary.changePct >= 0 ? "+" : ""}
                {data.expenseSummary.changePct}% vs prior
              </span>
            </div>

            <div className="mt-4 text-2xl font-extrabold text-textPrimary">
              <AnimatedCounter
                value={data.expenseSummary.totalExpense}
                format="idr"
                isMasked={isMasked}
              />
            </div>
          </div>

          {/* Horizontal Stacked Bar for Top Expense Categories */}
          <div className="mt-4 space-y-2.5">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-elevated">
              {data.expenseSummary.topCategories.length > 0 ? (
                data.expenseSummary.topCategories.map((cat, idx) => (
                  <div
                    key={cat.category}
                    style={{
                      width: `${Math.max(5, cat.percentage)}%`,
                      backgroundColor:
                        STACK_COLORS[idx % STACK_COLORS.length],
                    }}
                    title={`${cat.category}: ${formatIdr(cat.amount)} (${cat.percentage}%)`}
                  />
                ))
              ) : (
                <div className="h-full w-full bg-borderSubtle" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {data.expenseSummary.topCategories.slice(0, 3).map((cat, idx) => (
                <div key={cat.category} className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          STACK_COLORS[idx % STACK_COLORS.length],
                      }}
                    />
                    <span className="truncate text-[11px] font-medium text-textSecondary">
                      {cat.category}
                    </span>
                  </div>
                  <span className="block text-xs font-bold tabular-nums text-textPrimary">
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.article>
      </div>

      {/* Middle Row: Monthly Budget Target Gauge + Monthly Income vs Expense Chart + Quick Export */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 4. Monthly Budget Target Gauge (Dark Card) */}
        <motion.article
          variants={cardVariants}
          className="flex flex-col justify-between rounded-2xl bg-[#0F172A] p-6 text-white lg:col-span-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white">
                Monthly Budget Target
              </h2>
              <p className="text-xs text-slate-300">
                Spending realization against limit
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBudgetInput(String(data.budget.monthlyLimitIdr));
                setIsEditingBudget((prev) => !prev);
              }}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Edit Limit</span>
            </button>
          </div>

          {isEditingBudget && (
            <form
              onSubmit={handleSaveBudget}
              className="mt-3 flex items-center gap-2 rounded-xl bg-slate-800/90 p-2.5"
            >
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                aria-label="Monthly budget limit in IDR"
                className="min-h-[40px] flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-bold tabular-nums text-white"
              />
              <button
                type="submit"
                disabled={isSavingBudget}
                className="min-h-[40px] rounded-lg bg-[#A3E635] px-3 py-1.5 text-xs font-bold text-slate-950"
              >
                {isSavingBudget ? "..." : "Save"}
              </button>
            </form>
          )}

          {/* Circular Arc Gauge */}
          <div className="my-4 flex flex-col items-center">
            <svg
              viewBox="0 0 180 105"
              className="h-36 w-56 overflow-visible"
              aria-label={`Budget utilization ${data.budget.utilizationPct}%`}
            >
              <path
                d="M 18 90 A 72 72 0 0 1 162 90"
                fill="none"
                stroke="#1E293B"
                strokeWidth="16"
                strokeLinecap="round"
              />
              <path
                d="M 18 90 A 72 72 0 0 1 162 90"
                fill="none"
                stroke={
                  data.budget.utilizationPct > 90 ? "#F87171" : "#A3E635"
                }
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={arcCircumference}
                strokeDashoffset={arcDashOffset}
              />
              <text
                x="90"
                y="72"
                textAnchor="middle"
                className="fill-white text-2xl font-extrabold tabular-nums"
              >
                {data.budget.utilizationPct}%
              </text>
              <text
                x="90"
                y="92"
                textAnchor="middle"
                className="fill-slate-300 text-[11px]"
              >
                of {formatCompactIdr(data.budget.monthlyLimitIdr)} limit
              </text>
            </svg>
          </div>

          {/* Priority Category Progress Bars */}
          <div className="space-y-2.5 border-t border-slate-800 pt-4">
            {data.budget.priorityCategories.slice(0, 3).map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-200">
                    {cat.category}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-300">
                    {isMasked ? "Rp ••••••" : formatIdr(cat.amount)} (
                    {cat.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[#3B82F6]"
                    style={{ width: `${Math.min(100, cat.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.article>

        {/* 5. Monthly Income vs Expense Overview Chart (Per-Chart Filter) */}
        <motion.article
          variants={cardVariants}
          className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-6 lg:col-span-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-textPrimary">
                Monthly Income vs Expense Overview ({chartYear})
              </h2>
              <p className="text-xs text-textSecondary">
                Compare monthly cash inflow and outflow across the selected year
              </p>
            </div>

            {/* Per-Chart Filter Controls */}
            <div className="flex items-center gap-2">
              <label htmlFor="overview-year-select" className="sr-only">
                Select Chart Year
              </label>
              <select
                id="overview-year-select"
                value={chartYear}
                onChange={(e) => onChangeChartYear(Number(e.target.value))}
                className="min-h-[40px] rounded-xl border border-borderSubtle bg-elevated px-3 py-1.5 text-xs font-semibold text-textPrimary"
              >
                {data.monthlyOverview.availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-xl border border-borderSubtle bg-elevated p-1">
                <button
                  type="button"
                  onClick={() => setMonthRange("6M")}
                  className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    monthRange === "6M"
                      ? "bg-accentPrimary text-white"
                      : "text-textSecondary hover:text-textPrimary"
                  }`}
                >
                  6 Month
                </button>
                <button
                  type="button"
                  onClick={() => setMonthRange("12M")}
                  className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    monthRange === "12M"
                      ? "bg-accentPrimary text-white"
                      : "text-textSecondary hover:text-textPrimary"
                  }`}
                >
                  12 Month
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayedMonths}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border-subtle)"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val: number) => formatCompactIdr(val)}
                  tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={68}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }
                    const inc = Number(payload[0]?.value ?? 0);
                    const exp = Number(payload[1]?.value ?? 0);
                    const net = inc - exp;
                    return (
                      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-white shadow-xl">
                        <p className="font-bold text-slate-200">
                          {label} {chartYear}
                        </p>
                        <div className="mt-1.5 space-y-1 tabular-nums">
                          <p className="text-emerald-400">
                            Income: {formatIdr(inc)}
                          </p>
                          <p className="text-rose-400">
                            Expense: {formatIdr(exp)}
                          </p>
                          <p className="border-t border-slate-700 pt-1 font-bold text-white">
                            Net Cashflow: {formatIdr(net)}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#1D4ED8"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="#A3E635"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.article>
      </div>

      {/* Bottom Row: Quick Export Card + Recent Transactions Table */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 6A. Track & Print Report Card */}
        <motion.article
          variants={cardVariants}
          className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-6 lg:col-span-4"
        >
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accentPrimary/10 text-accentPrimary">
              <Printer className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-bold text-textPrimary">
              Track &amp; Print Financial Report
            </h2>
            <p className="mt-1.5 text-xs text-textSecondary">
              Download your filtered financial statement as a formatted A4 PDF
              or multi-sheet Excel workbook.
            </p>
          </div>

          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={onExportPdf}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-accentPrimary px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-95 sm:text-sm"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>Print PDF Report</span>
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-borderSubtle bg-elevated px-4 py-2.5 text-xs font-semibold text-textPrimary transition hover:bg-canvas sm:text-sm"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span>Export Filtered Excel (.xlsx)</span>
            </button>
          </div>
        </motion.article>

        {/* 6B. Recent Transactions Table (10 Latest) */}
        <motion.article
          variants={cardVariants}
          className="rounded-2xl border border-borderSubtle bg-surface p-6 lg:col-span-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-textPrimary">
                Recent Transactions
              </h2>
              <p className="text-xs text-textSecondary">
                Latest 10 recorded entries in the active filter scope
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
                aria-hidden="true"
              />
              <input
                type="search"
                value={recentSearch}
                onChange={(e) => setRecentSearch(e.target.value)}
                placeholder="Filter recent entries..."
                aria-label="Search recent transactions"
                className="min-h-[40px] w-full rounded-xl border border-borderSubtle bg-elevated pl-9 pr-3 py-1.5 text-xs text-textPrimary"
              />
            </div>
          </div>

          {filteredRecent.length === 0 ? (
            <div className="mt-4">
              <EmptyStateCard
                title="No recent transactions match this view"
                description="Import an Excel transaction history file or clear the active filter to inspect your records."
                onImportClick={onOpenImportExcel}
                onResetFilterClick={onResetFilters}
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-borderSubtle text-[11px] font-semibold uppercase tracking-wider text-textSecondary">
                    <th className="pb-3 pr-3">Date</th>
                    <th className="pb-3 px-3">Wallet</th>
                    <th className="pb-3 px-3">Category</th>
                    <th className="pb-3 px-3">Note</th>
                    <th className="pb-3 pl-3 text-right">Amount (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderSubtle">
                  {filteredRecent.map((tx) => (
                    <tr
                      key={tx.id}
                      className="transition hover:bg-elevated/70"
                    >
                      <td className="whitespace-nowrap py-3 pr-3 font-medium tabular-nums text-textSecondary">
                        {new Date(tx.date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-textPrimary">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: tx.walletColor }}
                          />
                          {tx.walletName}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-textPrimary">
                          {tx.category}
                        </span>
                        {tx.subcategory && (
                          <span className="block text-[11px] text-textSecondary">
                            {tx.subcategory}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[180px] truncate py-3 px-3 text-textSecondary">
                        {tx.note ?? tx.description ?? "-"}
                      </td>
                      <td
                        className={`whitespace-nowrap py-3 pl-3 text-right font-bold tabular-nums ${
                          tx.type === "INCOME"
                            ? "text-semanticIncome"
                            : "text-semanticExpense"
                        }`}
                      >
                        {isMasked
                          ? "Rp ••••••"
                          : `${tx.type === "INCOME" ? "+" : "-"}${formatIdr(
                              tx.amountIdr
                            )}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.article>
      </div>
    </motion.div>
  );
}

