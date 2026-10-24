"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Wallet,
} from "lucide-react";
import { BrandLogoSvg } from "@/components/ui/BrandAssets";
import { ThemeToggleCircular } from "./ThemeToggleCircular";

export type DashboardTabKey =
  | "dashboard"
  | "wallets"
  | "transactions"
  | "analytics"
  | "reports";

interface TopPillNavbarProps {
  activeTab: DashboardTabKey;
  onSelectTab: (tab: DashboardTabKey) => void;
  onOpenImportModal: () => void;
  onLogout: () => void;
}

const NAV_ITEMS: Array<{
  key: DashboardTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "wallets", label: "Wallets", icon: Wallet },
  { key: "transactions", label: "Transactions", icon: ListOrdered },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "reports", label: "Reports", icon: FileText },
];

export function TopPillNavbar({
  activeTab,
  onSelectTab,
  onOpenImportModal,
  onLogout,
}: TopPillNavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-borderSubtle bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Identity with Custom SVG Asset */}
        <div className="flex items-center gap-3">
          <BrandLogoSvg className="h-10 w-10 shrink-0 shadow-sm" />
          <div>
            <span className="text-base font-bold tracking-tight text-textPrimary sm:text-lg">
              WealthyDashboard
            </span>
            <span className="block text-xs text-textSecondary">
              Personal Finance &amp; Multi-Wallet Ledger
            </span>
          </div>
        </div>

        {/* Desktop & Tablet Floating Pill Navigation */}
        <nav
          aria-label="Primary dashboard sections"
          className="order-3 flex w-full items-center justify-start gap-1 overflow-x-auto rounded-full border border-borderSubtle bg-surface p-1.5 lg:order-2 lg:w-auto"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectTab(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={`relative inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition lg:flex-initial ${
                  isActive
                    ? "text-white"
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeNavPill"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                    className="absolute inset-0 rounded-full bg-textPrimary dark:bg-accentPrimary"
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" aria-hidden="true" />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Controls: Quick Import, Circular Theme Reveal, Sign Out */}
        <div className="order-2 flex items-center gap-2 lg:order-3">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accentPrimary px-4 py-2 text-xs font-semibold text-white transition hover:opacity-95 sm:text-sm"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Import Excel</span>
          </button>

          <ThemeToggleCircular />

          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out of session"
            title="Sign out"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-borderSubtle bg-surface text-textSecondary transition hover:bg-elevated hover:text-semanticExpense"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
