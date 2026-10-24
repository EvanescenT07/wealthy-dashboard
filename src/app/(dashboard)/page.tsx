"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GlobalFilterBar,
  GlobalFilterState,
} from "@/components/layout/GlobalFilterBar";
import {
  DashboardTabKey,
  TopPillNavbar,
} from "@/components/layout/TopPillNavbar";
import { EditBalanceModal } from "@/components/modals/EditBalanceModal";
import { ImportExcelModal } from "@/components/modals/ImportExcelModal";
import { AnalyticsTab } from "@/components/tabs/AnalyticsTab";
import {
  DashboardSummaryData,
  DashboardTab,
} from "@/components/tabs/DashboardTab";
import { ReportsTab } from "@/components/tabs/ReportsTab";
import { TransactionsTab } from "@/components/tabs/TransactionsTab";
import { WalletsTab } from "@/components/tabs/WalletsTab";
import { generateFinancialReportPdf } from "@/lib/pdf";

const INITIAL_FILTERS: GlobalFilterState = {
  preset: "all",
  from: "",
  to: "",
  walletId: "",
  category: "",
  type: "ALL",
};

export default function WealthyDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTabKey>("dashboard");
  const [globalFilters, setGlobalFilters] =
    useState<GlobalFilterState>(INITIAL_FILTERS);
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [incomePeriod, setIncomePeriod] = useState<string>("global");

  const [summaryData, setSummaryData] = useState<DashboardSummaryData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const [isMasked, setIsMasked] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isEditBalanceOpen, setIsEditBalanceOpen] = useState<boolean>(false);
  const [focusedWalletId, setFocusedWalletId] = useState<string | null>(null);

  useEffect(() => {
    const savedMask = localStorage.getItem("wealthy_privacy_mask");
    if (savedMask === "true") {
      setIsMasked(true);
    }
  }, []);

  const handleToggleMask = () => {
    setIsMasked((prev) => {
      const next = !prev;
      localStorage.setItem("wealthy_privacy_mask", String(next));
      return next;
    });
  };

  const fetchDashboardSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (globalFilters.from) {
        params.set("from", globalFilters.from);
      }
      if (globalFilters.to) {
        params.set("to", globalFilters.to);
      }
      if (globalFilters.walletId) {
        params.set("wallets", globalFilters.walletId);
      }
      if (globalFilters.category) {
        params.set("categories", globalFilters.category);
      }
      if (globalFilters.type !== "ALL") {
        params.set("type", globalFilters.type);
      }
      if (chartYear) {
        params.set("chartYear", String(chartYear));
      }
      if (incomePeriod) {
        params.set("incomePeriod", incomePeriod);
      }

      const response = await fetch(
        `/api/dashboard/summary?${params.toString()}`
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const json = (await response.json()) as DashboardSummaryData & {
        error?: string;
      };

      if (!response.ok || !json.wallets) {
        setError(
          json.error ??
            "Failed to load dashboard summary. Verify your PostgreSQL environment configuration."
        );
        return;
      }

      setSummaryData(json);
    } catch (err: unknown) {
      console.error("[WealthyDashboardPage] Summary request failed:", err);
      setError("Network error while connecting to dashboard API.");
    } finally {
      setIsLoading(false);
    }
  }, [globalFilters, chartYear, incomePeriod, router]);

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary, refreshTrigger]);

  const triggerGlobalRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (globalFilters.from) {
      params.set("from", globalFilters.from);
    }
    if (globalFilters.to) {
      params.set("to", globalFilters.to);
    }
    if (globalFilters.walletId) {
      params.set("wallets", globalFilters.walletId);
    }
    if (globalFilters.category) {
      params.set("categories", globalFilters.category);
    }
    if (globalFilters.type !== "ALL") {
      params.set("type", globalFilters.type);
    }
    const qs = params.toString();
    window.location.href = `/api/export/excel${qs ? `?${qs}` : ""}`;
  };

  const handleExportPdf = () => {
    if (!summaryData) {
      return;
    }
    const periodLabel =
      globalFilters.from || globalFilters.to
        ? `${globalFilters.from || "Start"} to ${globalFilters.to || "Present"}`
        : "All Recorded Periods";

    generateFinancialReportPdf({
      periodLabel,
      totalBalance: summaryData.totalManualBalance,
      totalIncome: summaryData.incomeSummary.totalIncome,
      totalExpense: summaryData.expenseSummary.totalExpense,
      netCashflow: summaryData.analytics.netCashflow,
      transactions: summaryData.recentTransactions,
    });
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (err: unknown) {
      console.error("[WealthyDashboardPage] Logout failed:", err);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <TopPillNavbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onLogout={handleLogout}
      />

      <GlobalFilterBar
        filters={globalFilters}
        onChange={setGlobalFilters}
        onReset={() => setGlobalFilters(INITIAL_FILTERS)}
        wallets={(summaryData?.wallets ?? []).map((w) => ({
          id: w.id,
          name: w.name,
        }))}
        categories={summaryData?.availableCategories ?? []}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === "dashboard" && (
          <DashboardTab
            data={summaryData}
            isLoading={isLoading}
            error={error}
            isMasked={isMasked}
            onToggleMask={handleToggleMask}
            chartYear={chartYear}
            onChangeChartYear={setChartYear}
            incomePeriod={incomePeriod}
            onChangeIncomePeriod={setIncomePeriod}
            onOpenEditBalance={() => {
              setFocusedWalletId(null);
              setIsEditBalanceOpen(true);
            }}
            onOpenImportExcel={() => setIsImportModalOpen(true)}
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
            onRetry={fetchDashboardSummary}
            onResetFilters={() => setGlobalFilters(INITIAL_FILTERS)}
            onBudgetSaved={triggerGlobalRefresh}
          />
        )}

        {activeTab === "wallets" && (
          <WalletsTab
            from={globalFilters.from}
            to={globalFilters.to}
            isMasked={isMasked}
            refreshTrigger={refreshTrigger}
            onOpenBulkEdit={() => {
              setFocusedWalletId(null);
              setIsEditBalanceOpen(true);
            }}
            onOpenSingleEdit={(walletId) => {
              setFocusedWalletId(walletId);
              setIsEditBalanceOpen(true);
            }}
            onOpenImportExcel={() => setIsImportModalOpen(true)}
            onWalletsMutated={triggerGlobalRefresh}
          />
        )}

        {activeTab === "transactions" && (
          <TransactionsTab
            globalFilters={globalFilters}
            isMasked={isMasked}
            refreshTrigger={refreshTrigger}
            onOpenImportExcel={() => setIsImportModalOpen(true)}
            onResetFilters={() => setGlobalFilters(INITIAL_FILTERS)}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsTab
            data={summaryData}
            isLoading={isLoading}
            error={error}
            isMasked={isMasked}
            onRetry={fetchDashboardSummary}
            onOpenImportExcel={() => setIsImportModalOpen(true)}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab
            data={summaryData}
            onOpenImportExcel={() => setIsImportModalOpen(true)}
          />
        )}
      </main>

      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={triggerGlobalRefresh}
      />

      <EditBalanceModal
        isOpen={isEditBalanceOpen}
        onClose={() => {
          setIsEditBalanceOpen(false);
          setFocusedWalletId(null);
        }}
        wallets={(summaryData?.wallets ?? []).map((w) => ({
          id: w.id,
          name: w.name,
          color: w.color,
          manualBalance: w.manualBalance,
          isVisible: w.isVisible,
          isDefault: w.isDefault,
        }))}
        focusedWalletId={focusedWalletId}
        onSaved={triggerGlobalRefresh}
      />
    </div>
  );
}

