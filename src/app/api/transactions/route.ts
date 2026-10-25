import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, serializeBigInt } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      200,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "25", 10) || 25)
    );
    const search = (searchParams.get("search") ?? "").trim();
    const typeParam = searchParams.get("type");
    const walletIdParam = searchParams.get("walletId");
    const walletsParam = searchParams.get("wallets");
    const categoriesParam = searchParams.get("categories");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const baseWhere: Prisma.TransactionWhereInput = {};

    if (fromParam || toParam) {
      baseWhere.date = {};
      if (fromParam) {
        const fromStr =
          fromParam.length === 10 ? `${fromParam}T00:00:00.000Z` : fromParam;
        const d = new Date(fromStr);
        if (!Number.isNaN(d.getTime())) {
          baseWhere.date.gte = d;
        }
      }
      if (toParam) {
        const toStr =
          toParam.length === 10 ? `${toParam}T23:59:59.999Z` : toParam;
        const d = new Date(toStr);
        if (!Number.isNaN(d.getTime())) {
          baseWhere.date.lte = d;
        }
      }
    }

    if (walletIdParam) {
      baseWhere.walletId = walletIdParam;
    } else if (walletsParam) {
      const ids = walletsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        baseWhere.walletId = { in: ids };
      }
    }

    if (categoriesParam) {
      const cats = categoriesParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (cats.length > 0) {
        baseWhere.category = { in: cats };
      }
    }

    if (search) {
      baseWhere.OR = [
        { note: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { subcategory: { contains: search, mode: "insensitive" } },
        { wallet: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const whereWithType: Prisma.TransactionWhereInput = {
      ...baseWhere,
      ...(typeParam === "INCOME" || typeParam === "EXPENSE"
        ? { type: typeParam }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [
      transactions,
      totalFilteredCount,
      countsByType,
      expenseRecordsForKpi,
      highestExpenseRecord,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: whereWithType,
        include: { wallet: true },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: whereWithType }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.transaction.findMany({
        where: { ...baseWhere, type: "EXPENSE" },
        select: { date: true, amountIdr: true },
      }),
      prisma.transaction.findFirst({
        where: { ...baseWhere, type: "EXPENSE" },
        include: { wallet: true },
        orderBy: { amountIdr: "desc" },
      }),
    ]);

    let incomeCount = 0;
    let expenseCount = 0;
    for (const c of countsByType) {
      if (c.type === "INCOME") {
        incomeCount = c._count._all;
      } else if (c.type === "EXPENSE") {
        expenseCount = c._count._all;
      }
    }

    const uniqueExpenseDays = new Set<string>();
    let totalExpenseSum = 0;
    for (const rec of expenseRecordsForKpi) {
      uniqueExpenseDays.add(rec.date.toISOString().slice(0, 10));
      totalExpenseSum += Number(rec.amountIdr);
    }

    const activeSpendingDays = uniqueExpenseDays.size;
    const avgDailyExpense =
      activeSpendingDays > 0 ? Math.round(totalExpenseSum / activeSpendingDays) : 0;

    return NextResponse.json(
      serializeBigInt({
        transactions: transactions.map((t) => ({
          id: t.id,
          externalHash: t.externalHash,
          date: t.date,
          walletId: t.walletId,
          walletName: t.wallet.name,
          walletColor: t.wallet.color,
          walletIcon: t.wallet.icon,
          category: t.category,
          subcategory: t.subcategory,
          note: t.note,
          description: t.description,
          amountIdr: Number(t.amountIdr),
          type: t.type,
          currency: t.currency,
        })),
        pagination: {
          page,
          limit,
          totalCount: totalFilteredCount,
          totalPages: Math.max(1, Math.ceil(totalFilteredCount / limit)),
        },
        counts: {
          all: incomeCount + expenseCount,
          income: incomeCount,
          expense: expenseCount,
        },
        kpi: {
          totalTransactions: totalFilteredCount,
          activeSpendingDays,
          highestSingleExpense: highestExpenseRecord
            ? {
                amountIdr: Number(highestExpenseRecord.amountIdr),
                category: highestExpenseRecord.category,
                subcategory: highestExpenseRecord.subcategory,
                note: highestExpenseRecord.note,
                walletName: highestExpenseRecord.wallet.name,
                date: highestExpenseRecord.date,
              }
            : null,
          avgDailyExpense,
        },
      })
    );
  } catch (error: unknown) {
    console.error("[API GET /api/transactions] Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to load transactions." },
      { status: 500 }
    );
  }
}

