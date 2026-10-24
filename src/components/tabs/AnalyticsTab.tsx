"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Award,
  Hash,
  Percent,
  PieChart as PieChartIcon,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
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
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { DashboardSummaryData } from "./DashboardTab";
import { formatCompactIdr, formatIdr } from "@/lib/utils";

interface AnalyticsTabProps {
  data: DashboardSummaryData | null;
  isLoading: boolean;
  error: string | null;
  isMasked: boolean;
  onRetry: () => void;
  onOpenImportExcel: () => void;
}

const DONUT_PALETTE = [
  "#1D4ED8",
  "#A3E635",
  "#0284C7",
  "#F97316",
  "#7C3AED",
  "#10B981",
  "#E11D48",
];

export function AnalyticsTab({
  data,
  isLoading,
  error,
  isMasked,
  onRetry,
  onOpenImportExcel,
}: AnalyticsTabProps) {
  const [splineMetric, setSplineMetric] = useState<
    "expense" | "income" | "netCashflow"
  >("expense");
  const [splineGranularity, setSplineGranularity] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [donutMode, setDonutMode] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [rankMode, setRankMode] = useState<"wallets" | "subcategories">(
    "wallets"
  );

  const aggregatedTrendSeries = useMemo(() => {
    if (!data) {
      return [];
    }
    const raw = data.analytics.dailySeries;
    if (splineGranularity === "daily") {
      return raw;
    }

    const bucketMap = new Map<
      string,
      { label: string; income: number; expense: number; netCashflow: number }
    >();

    for (const point of raw) {
      const d = new Date(point.label);
      let key = point.label.slice(0, 7);
      if (splineGranularity === "weekly") {
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = Math.floor(
          (d.getTime() - firstDayOfYear.getTime()) / 86_400_000
        );
        const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
      }
      const existing = bucketMap.get(key) ?? {
        label: key,
        income: 0,
        expense: 0,
        netCashflow: 0,
      };
      existing.income += point.income;
      existing.expense += point.expense;
      existing.netCashflow = existing.income - existing.expense;
      bucketMap.set(key, existing);
    }

    return Array.from(bucketMap.values());
  }, [data, splineGranularity]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} heightClass="h-36" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SkeletonCard heightClass="h-80" />
          <SkeletonCard heightClass="h-80" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorStateCard
        message={error ?? "Unable to load analytics data."}
        onRetry={onRetry}
      />
    );
  }

  const donutData =
    donutMode === "EXPENSE"
      ? data.analytics.categoryShareExpense.slice(0, 6)
      : data.analytics.categoryShareIncome.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 4 Top Analytic KPI Cards (Card 1 in Royal Blue #1D4ED8) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Royal Blue Net Cashflow */}
        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col justify-between rounded-2xl bg-[#1D4ED8] p-5 text-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
              Net Cashflow (IDR)
            </span>
            <TrendingUp className="h-4 w-4 text-[#A3E635]" aria-hidden="true" />
          </div>
          <div className="mt-3 text-2xl font-extrabold">
            <AnimatedCounter
              value={data.analytics.netCashflow}
              format="idr"
              isMasked={isMasked}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-blue-100">vs previous period</span>
            <span className="rounded-lg bg-white/15 px-2 py-0.5 font-bold tabular-nums text-[#BEF264]">
              {data.analytics.netCashflowChangePct >= 0 ? "+" : ""}
              {data.analytics.netCashflowChangePct}%
            </span>
          </div>
        </motion.article>

        {/* Card 2: Total Transactions Count */}
        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Total Transactions Count
            </span>
            <Hash className="h-4 w-4 text-accentPrimary" aria-hidden="true" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-textPrimary">
            <AnimatedCounter
              value={data.analytics.totalTransactionsCount}
              format="number"
            />
          </div>
          <p className="mt-3 text-xs text-textSecondary">
            Verified rows in selected window
          </p>
        </motion.article>

        {/* Card 3: Savings Rate (%) */}
        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Savings Rate (%)
            </span>
            <Percent
              className="h-4 w-4 text-semanticIncome"
              aria-hidden="true"
            />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-textPrimary">
            <AnimatedCounter
              value={data.analytics.savingsRatePct}
              format="percent"
            />
          </div>
          <p className="mt-3 text-xs text-textSecondary">
            (Income - Expense) / Income ratio
          </p>
        </motion.article>

        {/* Card 4: Average Transaction Size */}
        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Average Transaction Size
            </span>
            <Activity
              className="h-4 w-4 text-accentPrimary"
              aria-hidden="true"
            />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-textPrimary">
            <AnimatedCounter
              value={data.analytics.avgTransactionSizeIdr}
              format="idr"
              isMasked={isMasked}
            />
          </div>
          <p className="mt-3 text-xs text-textSecondary">
            Mean ticket size across cashflows
          </p>
        </motion.article>
      </div>

      {/* Middle Row: Cashflow Trend Spline Chart + Spending vs Target Line Chart */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Middle: Cashflow Trend Spline Chart (Per-Chart Filter) */}
        <article className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-textPrimary">
                Cashflow Trend Spline
              </h2>
              <p className="text-xs text-textSecondary">
                Inspect trajectory by metric and time granularity
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="spline-metric-select" className="sr-only">
                Select Spline Metric
              </label>
              <select
                id="spline-metric-select"
                value={splineMetric}
                onChange={(e) =>
                  setSplineMetric(
                    e.target.value as "expense" | "income" | "netCashflow"
                  )
                }
                className="min-h-[38px] rounded-xl border border-borderSubtle bg-elevated px-3 py-1.5 text-xs font-semibold text-textPrimary"
              >
                <option value="expense">Metric: Expense</option>
                <option value="income">Metric: Income</option>
                <option value="netCashflow">Metric: Net Cashflow</option>
              </select>

              <SlidingTabs
                layoutGroupId="analyticsSplineGranularitySlide"
                value={splineGranularity}
                onChange={setSplineGranularity}
                options={[
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ]}
              />
            </div>
          </div>

          {aggregatedTrendSeries.length === 0 ? (
            <div className="mt-6">
              <EmptyStateCard
                title="No trend points available"
                description="Import Excel transactions to visualize daily, weekly, and monthly cashflow curves."
                onImportClick={onOpenImportExcel}
              />
            </div>
          ) : (
            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={aggregatedTrendSeries}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="splineBlueFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border-subtle)"
                  />
                  <XAxis
                    dataKey="label"
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
                      const val = Number(payload[0]?.value ?? 0);
                      return (
                        <div className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white shadow-xl">
                          <span className="block text-[11px] text-slate-300">
                            {label}
                          </span>
                          <span className="mt-0.5 block text-sm font-extrabold tabular-nums text-[#BEF264]">
                            {formatIdr(val)}
                          </span>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={splineMetric}
                    stroke="#1D4ED8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#splineBlueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        {/* Right Middle: Spending vs Target Line Chart */}
        <article className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-6 lg:col-span-5">
          <div>
            <h2 className="text-base font-bold text-textPrimary">
              Cumulative Spending vs Target Line
            </h2>
            <p className="text-xs text-textSecondary">
              Actual cumulative expenditure (blue) against linear monthly budget
              pace (slate)
            </p>
          </div>

          {data.analytics.spendingVsTarget.length === 0 ? (
            <div className="mt-6">
              <EmptyStateCard
                title="No cumulative spending data"
                description="Once expenses are imported, this chart tracks your cumulative burn rate against your monthly target."
              />
            </div>
          ) : (
            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.analytics.spendingVsTarget}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border-subtle)"
                  />
                  <XAxis
                    dataKey="date"
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
                      const actual = Number(payload[0]?.value ?? 0);
                      const target = Number(payload[1]?.value ?? 0);
                      return (
                        <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-white shadow-xl tabular-nums">
                          <p className="font-bold text-slate-200">{label}</p>
                          <p className="mt-1 text-blue-400">
                            Actual Cumulative: {formatIdr(actual)}
                          </p>
                          <p className="text-slate-300">
                            Target Pace: {formatIdr(target)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualCumulativeExpense"
                    stroke="#1D4ED8"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetLine"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>

      {/* 3 Bottom Breakdown Cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* 1. Category Share (Donut Chart) */}
        <article className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PieChartIcon
                className="h-4 w-4 text-accentPrimary"
                aria-hidden="true"
              />
              <h2 className="text-sm font-bold text-textPrimary">
                Category Share
              </h2>
            </div>

            <SlidingTabs
              layoutGroupId="analyticsDonutModeSlide"
              value={donutMode}
              onChange={setDonutMode}
              options={[
                { value: "EXPENSE", label: "Expense" },
                { value: "INCOME", label: "Income" },
              ]}
            />
          </div>

          {donutData.length === 0 ? (
            <p className="py-12 text-center text-xs text-textSecondary">
              No category share data for {donutMode.toLowerCase()}
            </p>
          ) : (
            <>
              <div className="my-3 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={50}
                      outerRadius={76}
                      paddingAngle={3}
                    >
                      {donutData.map((entry, idx) => (
                        <Cell
                          key={entry.category}
                          fill={DONUT_PALETTE[idx % DONUT_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => formatIdr(val)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 border-t border-borderSubtle pt-3 text-xs">
                {donutData.slice(0, 4).map((item, idx) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 font-medium text-textPrimary">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            DONUT_PALETTE[idx % DONUT_PALETTE.length],
                        }}
                      />
                      {item.category}
                    </span>
                    <span className="font-bold tabular-nums text-textSecondary">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>

        {/* 2. Expense Funnel / Allocation Progress */}
        <article className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-6">
          <div>
            <h2 className="text-sm font-bold text-textPrimary">
              Expense Allocation Funnel
            </h2>
            <p className="text-xs text-textSecondary">
              Ordered from highest to lowest spending group
            </p>

            <div className="mt-4 space-y-3">
              {data.analytics.expenseFunnel.length === 0 ? (
                <p className="py-10 text-center text-xs text-textSecondary">
                  No expenses recorded in current period
                </p>
              ) : (
                data.analytics.expenseFunnel.map((item, idx) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-textPrimary">
                        {idx + 1}. {item.category}
                      </span>
                      <span className="font-bold tabular-nums text-textSecondary">
                        {isMasked ? "Rp ••••••" : formatCompactIdr(item.amount)}{" "}
                        ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(6, item.percentage)}%`,
                          backgroundColor:
                            idx === 0
                              ? "#1D4ED8"
                              : idx === 1
                              ? "#A3E635"
                              : "#3B82F6",
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </article>

        {/* 3. Top Wallets & Subcategories (Horizontal Bars) */}
        <article className="flex flex-col justify-between rounded-2xl border border-borderSubtle bg-surface p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award
                  className="h-4 w-4 text-accentPrimary"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-bold text-textPrimary">
                  Top Spending Rank
                </h2>
              </div>

              <SlidingTabs
                layoutGroupId="analyticsRankModeSlide"
                value={rankMode}
                onChange={setRankMode}
                options={[
                  { value: "wallets", label: "Wallets" },
                  { value: "subcategories", label: "Subcategories" },
                ]}
              />
            </div>

            <div className="mt-4 space-y-3">
              {rankMode === "wallets" ? (
                data.analytics.topWalletsExpense.length === 0 ? (
                  <p className="py-10 text-center text-xs text-textSecondary">
                    No wallet expenses recorded
                  </p>
                ) : (
                  data.analytics.topWalletsExpense.map((w) => {
                    const maxAmt =
                      data.analytics.topWalletsExpense[0]?.amount || 1;
                    const pct = Math.round((w.amount / maxAmt) * 100);
                    return (
                      <div key={w.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-textPrimary">
                            {w.name}
                          </span>
                          <span className="font-bold tabular-nums text-textSecondary">
                            {isMasked ? "Rp ••••••" : formatIdr(w.amount)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-elevated">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(6, pct)}%`,
                              backgroundColor: w.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )
              ) : data.analytics.topSubcategoriesExpense.length === 0 ? (
                <p className="py-10 text-center text-xs text-textSecondary">
                  No subcategory expenses recorded
                </p>
              ) : (
                data.analytics.topSubcategoriesExpense.map((sub) => (
                  <div key={sub.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-semibold text-textPrimary">
                        {sub.name}
                      </span>
                      <span className="font-bold tabular-nums text-textSecondary">
                        {isMasked ? "Rp ••••••" : formatCompactIdr(sub.amount)} (
                        {sub.percentage}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full bg-accentPrimary"
                        style={{ width: `${Math.max(6, sub.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
