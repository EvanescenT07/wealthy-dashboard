import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, serializeBigInt } from "@/lib/prisma";
import {
  calculatePercentageChange,
  isPrimaryIncomeCategory,
  resolveWalletStyle,
  slugifyWalletName,
} from "@/lib/utils";

const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const INITIAL_9_WALLETS = [
  "Shopeepay",
  "Gopay",
  "Jago",
  "Blu",
  "Mandiri",
  "Ovo",
  "Seabank",
  "Paypal",
  "Jenius",
];

async function ensureInitialized() {
  const walletCount = await prisma.wallet.count();
  if (walletCount === 0) {
    for (const name of INITIAL_9_WALLETS) {
      const style = resolveWalletStyle(name);
      await prisma.wallet.upsert({
        where: { name },
        update: {},
        create: {
          name,
          slug: slugifyWalletName(name),
          manualBalance: BigInt(0),
          color: style.color,
          icon: style.icon,
          isDefault: true,
          isVisible: true,
          sortOrder: style.sortOrder,
        },
      });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const walletsParam = searchParams.get("wallets");
    const typeParam = searchParams.get("type");
    const categoriesParam = searchParams.get("categories");
    const chartYearParam = searchParams.get("chartYear");
    const incomePeriodParam = searchParams.get("incomePeriod");
    const expensePeriodParam = searchParams.get("expensePeriod");

    const where: Prisma.TransactionWhereInput = {};
    let parsedFrom: Date | null = null;
    let parsedTo: Date | null = null;

    if (fromParam) {
      const fromStr =
        fromParam.length === 10 ? `${fromParam}T00:00:00.000Z` : fromParam;
      const d = new Date(fromStr);
      if (!Number.isNaN(d.getTime())) {
        parsedFrom = d;
      }
    }
    if (toParam) {
      const toStr =
        toParam.length === 10 ? `${toParam}T23:59:59.999Z` : toParam;
      const d = new Date(toStr);
      if (!Number.isNaN(d.getTime())) {
        parsedTo = d;
      }
    }

    if (parsedFrom || parsedTo) {
      where.date = {
        ...(parsedFrom ? { gte: parsedFrom } : {}),
        ...(parsedTo ? { lte: parsedTo } : {}),
      };
    }

    if (walletsParam) {
      const walletIds = walletsParam
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
      if (walletIds.length > 0) {
        where.walletId = { in: walletIds };
      }
    }

    if (typeParam === "INCOME" || typeParam === "EXPENSE") {
      where.type = typeParam;
    }

    if (categoriesParam) {
      const cats = categoriesParam
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cats.length > 0) {
        where.category = { in: cats };
      }
    }

    const [
      wallets,
      budgetSetting,
      filteredTransactions,
      allTxYearsRaw,
      allCategoriesRaw,
      recentImportLogs,
    ] = await Promise.all([
      prisma.wallet.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.budgetSetting.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", monthlyLimitIdr: BigInt(5000000) },
      }),
      prisma.transaction.findMany({
        where,
        include: { wallet: true },
        orderBy: { date: "desc" },
      }),
      prisma.transaction.findMany({
        select: { date: true },
        orderBy: { date: "desc" },
      }),
      prisma.transaction.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      }),
      prisma.importLog.findMany({
        orderBy: { importedAt: "desc" },
        take: 15,
      }),
    ]);

    const availableYearsSet = new Set<number>();
    for (const item of allTxYearsRaw) {
      availableYearsSet.add(item.date.getFullYear());
    }
    const currentYear = new Date().getFullYear();
    if (availableYearsSet.size === 0) {
      availableYearsSet.add(currentYear);
    }
    const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);
    const selectedChartYear =
      chartYearParam && Number.isFinite(Number(chartYearParam))
        ? Number(chartYearParam)
        : availableYears[0];

    // Previous period comparison calculation
    let prevIncomeTotal = 0;
    let prevExpenseTotal = 0;
    if (parsedFrom && parsedTo) {
      const spanMs = Math.max(86_400_000, parsedTo.getTime() - parsedFrom.getTime());
      const prevFrom = new Date(parsedFrom.getTime() - spanMs);
      const prevTo = new Date(parsedFrom.getTime() - 1);
      const prevTxs = await prisma.transaction.findMany({
        where: {
          ...where,
          date: { gte: prevFrom, lte: prevTo },
        },
        select: { type: true, amountIdr: true },
      });
      for (const p of prevTxs) {
        if (p.type === "INCOME") {
          prevIncomeTotal += Number(p.amountIdr);
        } else {
          prevExpenseTotal += Number(p.amountIdr);
        }
      }
    }

    // Independent Income Card Period Override if selected
    let incomeSourceTransactions = filteredTransactions;
    if (incomePeriodParam && incomePeriodParam !== "global") {
      const now = new Date();
      let incFrom: Date | null = null;
      if (incomePeriodParam === "this_month") {
        incFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (incomePeriodParam === "last_3_months") {
        incFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      } else if (incomePeriodParam === "this_year") {
        incFrom = new Date(now.getFullYear(), 0, 1);
      }
      if (incFrom) {
        incomeSourceTransactions = filteredTransactions.filter(
          (tx) => tx.date >= incFrom!
        );
      }
    }

    // Independent Expense Card Period Override if selected
    let expenseSourceTransactions = filteredTransactions;
    if (expensePeriodParam && expensePeriodParam !== "global") {
      const now = new Date();
      let expFrom: Date | null = null;
      if (expensePeriodParam === "this_month") {
        expFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (expensePeriodParam === "last_3_months") {
        expFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      } else if (expensePeriodParam === "this_year") {
        expFrom = new Date(now.getFullYear(), 0, 1);
      }
      if (expFrom) {
        expenseSourceTransactions = filteredTransactions.filter(
          (tx) => tx.date >= expFrom!
        );
      }
    }

    let totalIncome = 0;
    let primaryIncome = 0;
    let otherIncome = 0;

    for (const tx of incomeSourceTransactions) {
      if (tx.type === "INCOME") {
        const amt = Number(tx.amountIdr);
        totalIncome += amt;
        if (isPrimaryIncomeCategory(tx.category)) {
          primaryIncome += amt;
        } else {
          otherIncome += amt;
        }
      }
    }

    let totalExpense = 0;
    const expenseByCategory = new Map<string, number>();
    const incomeByCategory = new Map<string, number>();
    const expenseBySubcategory = new Map<string, number>();
    const expenseByWallet = new Map<
      string,
      { name: string; color: string; amount: number }
    >();

    for (const tx of expenseSourceTransactions) {
      const amt = Number(tx.amountIdr);
      if (tx.type === "EXPENSE") {
        totalExpense += amt;
        expenseByCategory.set(
          tx.category,
          (expenseByCategory.get(tx.category) ?? 0) + amt
        );
        const subLabel = tx.subcategory
          ? `${tx.category} - ${tx.subcategory}`
          : tx.category;
        expenseBySubcategory.set(
          subLabel,
          (expenseBySubcategory.get(subLabel) ?? 0) + amt
        );
        const wCurrent = expenseByWallet.get(tx.walletId) ?? {
          name: tx.wallet.name,
          color: tx.wallet.color,
          amount: 0,
        };
        wCurrent.amount += amt;
        expenseByWallet.set(tx.walletId, wCurrent);
      }
    }

    for (const tx of filteredTransactions) {
      if (tx.type === "INCOME") {
        const amt = Number(tx.amountIdr);
        incomeByCategory.set(
          tx.category,
          (incomeByCategory.get(tx.category) ?? 0) + amt
        );
      }
    }

    const sortedExpenseCategories = Array.from(expenseByCategory.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage:
          totalExpense > 0 ? Number(((amount / totalExpense) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const sortedIncomeCategories = Array.from(incomeByCategory.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage:
          totalIncome > 0 ? Number(((amount / totalIncome) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Year-specific Monthly Overview (JAN..DEC)
    const yearStart = new Date(Date.UTC(selectedChartYear, 0, 1, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(selectedChartYear, 11, 31, 23, 59, 59));

    const yearTransactions = await prisma.transaction.findMany({
      where: {
        ...(walletsParam ? { walletId: where.walletId } : {}),
        ...(categoriesParam ? { category: where.category } : {}),
        date: { gte: yearStart, lte: yearEnd },
      },
      select: { date: true, type: true, amountIdr: true },
    });

    const monthlyBuckets = MONTH_LABELS.map((month, index) => ({
      monthIndex: index,
      month,
      income: 0,
      expense: 0,
      netCashflow: 0,
    }));

    for (const tx of yearTransactions) {
      const m = tx.date.getMonth();
      const amt = Number(tx.amountIdr);
      if (tx.type === "INCOME") {
        monthlyBuckets[m].income += amt;
      } else {
        monthlyBuckets[m].expense += amt;
      }
      monthlyBuckets[m].netCashflow =
        monthlyBuckets[m].income - monthlyBuckets[m].expense;
    }

    // Analytics Time Series (Daily / Weekly / Monthly)
    const dailyMap = new Map<
      string,
      { label: string; income: number; expense: number; netCashflow: number }
    >();
    const ascTransactions = [...filteredTransactions].reverse();
    for (const tx of ascTransactions) {
      const dayKey = tx.date.toISOString().slice(0, 10);
      const entry = dailyMap.get(dayKey) ?? {
        label: dayKey,
        income: 0,
        expense: 0,
        netCashflow: 0,
      };
      const amt = Number(tx.amountIdr);
      if (tx.type === "INCOME") {
        entry.income += amt;
      } else {
        entry.expense += amt;
      }
      entry.netCashflow = entry.income - entry.expense;
      dailyMap.set(dayKey, entry);
    }

    const dailySeries = Array.from(dailyMap.values());

    // Spending vs Target cumulative line
    const monthlyLimitNum = Number(budgetSetting.monthlyLimitIdr);
    let runningExpense = 0;
    const totalPoints = Math.max(1, dailySeries.length);
    const spendingVsTarget = dailySeries.map((pt, idx) => {
      runningExpense += pt.expense;
      const linearTarget = Math.round(((idx + 1) / totalPoints) * monthlyLimitNum);
      return {
        date: pt.label,
        actualCumulativeExpense: runningExpense,
        targetLine: linearTarget,
        monthlyLimit: monthlyLimitNum,
      };
    });

    // Monthly Budget Target trimmed from Transaction.date (YYYY-MM)
    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    let budgetMonthKey = currentMonthKey;
    const hasCurrentMonthTx = allTxYearsRaw.some(
      (t) => t.date.toISOString().slice(0, 7) === currentMonthKey
    );
    if (!hasCurrentMonthTx && allTxYearsRaw.length > 0) {
      budgetMonthKey = allTxYearsRaw[0].date.toISOString().slice(0, 7);
    }
    if (parsedFrom) {
      budgetMonthKey = parsedFrom.toISOString().slice(0, 7);
    }

    const [bYearStr, bMonthStr] = budgetMonthKey.split("-");
    const bYear = parseInt(bYearStr, 10);
    const bMonthIndex = parseInt(bMonthStr, 10) - 1;
    const budgetMonthStart = new Date(Date.UTC(bYear, bMonthIndex, 1, 0, 0, 0));
    const budgetMonthEnd = new Date(Date.UTC(bYear, bMonthIndex + 1, 0, 23, 59, 59, 999));

    const budgetMonthTransactions = await prisma.transaction.findMany({
      where: {
        type: "EXPENSE",
        date: { gte: budgetMonthStart, lte: budgetMonthEnd },
        ...(walletsParam ? { walletId: where.walletId } : {}),
      },
      select: {
        category: true,
        amountIdr: true,
      },
    });

    let currentMonthlyExpense = 0;
    const budgetCategoryMap = new Map<string, number>();
    for (const tx of budgetMonthTransactions) {
      const amt = Number(tx.amountIdr);
      currentMonthlyExpense += amt;
      budgetCategoryMap.set(
        tx.category,
        (budgetCategoryMap.get(tx.category) ?? 0) + amt
      );
    }

    const budgetPriorityCategories = Array.from(budgetCategoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage:
          currentMonthlyExpense > 0
            ? Number(((amount / currentMonthlyExpense) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const visibleWallets = wallets.filter((w) => w.isVisible);
    const totalManualBalance = visibleWallets.reduce(
      (sum, w) => sum + Number(w.manualBalance),
      0
    );

    const netCashflow = totalIncome - totalExpense;
    const prevNetCashflow = prevIncomeTotal - prevExpenseTotal;
    const savingsRatePct =
      totalIncome > 0
        ? Number((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1))
        : 0;
    const avgTransactionSizeIdr =
      filteredTransactions.length > 0
        ? Math.round(
            (totalIncome + totalExpense) / filteredTransactions.length
          )
        : 0;

    return NextResponse.json(
      serializeBigInt({
        totalManualBalance,
        wallets: wallets.map((w) => {
          const bal = Number(w.manualBalance);
          return {
            id: w.id,
            name: w.name,
            slug: w.slug,
            manualBalance: bal,
            color: w.color,
            icon: w.icon,
            isDefault: w.isDefault,
            isVisible: w.isVisible,
            sharePct:
              totalManualBalance > 0 && w.isVisible
                ? Number(((bal / totalManualBalance) * 100).toFixed(1))
                : 0,
          };
        }),
        incomeSummary: {
          totalIncome,
          primaryIncome,
          otherIncome,
          previousIncome: prevIncomeTotal,
          diffIdr: totalIncome - prevIncomeTotal,
          changePct: calculatePercentageChange(totalIncome, prevIncomeTotal),
        },
        expenseSummary: {
          totalExpense,
          previousExpense: prevExpenseTotal,
          diffIdr: totalExpense - prevExpenseTotal,
          changePct: calculatePercentageChange(totalExpense, prevExpenseTotal),
          topCategories: sortedExpenseCategories.slice(0, 4),
        },
        budget: {
          monthlyLimitIdr: monthlyLimitNum,
          currentExpenseIdr: currentMonthlyExpense,
          monthKey: budgetMonthKey,
          monthLabel: new Intl.DateTimeFormat("en-US", {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }).format(budgetMonthStart),
          utilizationPct:
            monthlyLimitNum > 0
              ? Number(
                  ((currentMonthlyExpense / monthlyLimitNum) * 100).toFixed(1)
                )
              : 0,
          priorityCategories: budgetPriorityCategories.slice(0, 4),
        },
        monthlyOverview: {
          selectedYear: selectedChartYear,
          availableYears,
          months: monthlyBuckets,
        },
        analytics: {
          netCashflow,
          netCashflowChangePct: calculatePercentageChange(
            netCashflow,
            prevNetCashflow
          ),
          totalTransactionsCount: filteredTransactions.length,
          savingsRatePct,
          avgTransactionSizeIdr,
          dailySeries,
          spendingVsTarget,
          categoryShareExpense: sortedExpenseCategories,
          categoryShareIncome: sortedIncomeCategories,
          expenseFunnel: sortedExpenseCategories.slice(0, 6),
          topWalletsExpense: Array.from(expenseByWallet.values())
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6),
          topSubcategoriesExpense: Array.from(expenseBySubcategory.entries())
            .map(([name, amount]) => ({
              name,
              amount,
              percentage:
                totalExpense > 0
                  ? Number(((amount / totalExpense) * 100).toFixed(1))
                  : 0,
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6),
        },
        recentTransactions: filteredTransactions.slice(0, 10).map((t) => ({
          id: t.id,
          date: t.date,
          walletId: t.walletId,
          walletName: t.wallet.name,
          walletColor: t.wallet.color,
          category: t.category,
          subcategory: t.subcategory,
          note: t.note,
          description: t.description,
          amountIdr: Number(t.amountIdr),
          type: t.type,
        })),
        availableCategories: allCategoriesRaw.map((c) => c.category),
        importLogs: recentImportLogs,
      })
    );
  } catch (error: unknown) {
    console.error("[API GET /api/dashboard/summary] Summary error:", error);
    return NextResponse.json(
      { error: "Failed to compute dashboard summary." },
      { status: 500 }
    );
  }
}

