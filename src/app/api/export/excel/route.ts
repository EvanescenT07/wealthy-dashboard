import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { generateExcelExportBuffer } from "@/lib/excel";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const walletsParam = searchParams.get("wallets");
    const typeParam = searchParams.get("type");
    const categoriesParam = searchParams.get("categories");

    const where: Prisma.TransactionWhereInput = {};

    if (fromParam || toParam) {
      where.date = {};
      if (fromParam) {
        const d = new Date(fromParam);
        if (!Number.isNaN(d.getTime())) {
          where.date.gte = d;
        }
      }
      if (toParam) {
        const d = new Date(toParam);
        if (!Number.isNaN(d.getTime())) {
          where.date.lte = d;
        }
      }
    }

    if (walletsParam) {
      const ids = walletsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        where.walletId = { in: ids };
      }
    }

    if (typeParam === "INCOME" || typeParam === "EXPENSE") {
      where.type = typeParam;
    }

    if (categoriesParam) {
      const cats = categoriesParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (cats.length > 0) {
        where.category = { in: cats };
      }
    }

    const [transactions, wallets, groupedByWallet] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { wallet: true },
        orderBy: { date: "desc" },
      }),
      prisma.wallet.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.transaction.groupBy({
        by: ["walletId", "type"],
        where,
        _sum: { amountIdr: true },
      }),
    ]);

    const walletFlow = new Map<string, { income: number; expense: number }>();
    for (const item of groupedByWallet) {
      const current = walletFlow.get(item.walletId) ?? { income: 0, expense: 0 };
      const sumVal = Number(item._sum.amountIdr ?? BigInt(0));
      if (item.type === "INCOME") {
        current.income += sumVal;
      } else {
        current.expense += sumVal;
      }
      walletFlow.set(item.walletId, current);
    }

    const buffer = generateExcelExportBuffer({
      transactions: transactions.map((t) => ({
        date: t.date,
        walletName: t.wallet.name,
        category: t.category,
        subcategory: t.subcategory,
        note: t.note,
        description: t.description,
        amountIdr: Number(t.amountIdr),
        type: t.type,
        currency: t.currency,
      })),
      wallets: wallets.map((w) => {
        const flow = walletFlow.get(w.id) ?? { income: 0, expense: 0 };
        return {
          name: w.name,
          manualBalance: Number(w.manualBalance),
          excelIncome: flow.income,
          excelExpense: flow.expense,
          netCashflow: flow.income - flow.expense,
        };
      }),
    });

    const dateStamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="WealthyDashboard_Export_${dateStamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("[API GET /api/export/excel] Export error:", error);
    return NextResponse.json(
      { error: "Failed to export Excel report." },
      { status: 500 }
    );
  }
}

