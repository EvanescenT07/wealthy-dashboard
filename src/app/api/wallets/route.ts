import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, serializeBigInt } from "@/lib/prisma";
import { resolveWalletStyle, slugifyWalletName } from "@/lib/utils";

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

async function ensureDefaultWalletsExist() {
  const count = await prisma.wallet.count();
  if (count > 0) {
    return;
  }
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

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultWalletsExist();

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const dateFilter: Prisma.DateTimeFilter = {};
    if (fromParam) {
      const fromStr =
        fromParam.length === 10 ? `${fromParam}T00:00:00.000Z` : fromParam;
      const parsedFrom = new Date(fromStr);
      if (!Number.isNaN(parsedFrom.getTime())) {
        dateFilter.gte = parsedFrom;
      }
    }
    if (toParam) {
      const toStr =
        toParam.length === 10 ? `${toParam}T23:59:59.999Z` : toParam;
      const parsedTo = new Date(toStr);
      if (!Number.isNaN(parsedTo.getTime())) {
        dateFilter.lte = parsedTo;
      }
    }

    const txWhere: Prisma.TransactionWhereInput =
      Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const [wallets, groupedMutations] = await Promise.all([
      prisma.wallet.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.transaction.groupBy({
        by: ["walletId", "type"],
        where: txWhere,
        _sum: { amountIdr: true },
        _count: { _all: true },
      }),
    ]);

    const statsByWallet = new Map<
      string,
      { income: number; expense: number; count: number }
    >();

    for (const group of groupedMutations) {
      const current = statsByWallet.get(group.walletId) ?? {
        income: 0,
        expense: 0,
        count: 0,
      };
      const sumAmount = Number(group._sum.amountIdr ?? BigInt(0));
      if (group.type === "INCOME") {
        current.income += sumAmount;
      } else {
        current.expense += sumAmount;
      }
      current.count += group._count._all;
      statsByWallet.set(group.walletId, current);
    }

    const enrichedWallets = wallets.map((w) => {
      const stats = statsByWallet.get(w.id) ?? {
        income: 0,
        expense: 0,
        count: 0,
      };
      const manualBalanceNum = Number(w.manualBalance);
      return {
        id: w.id,
        name: w.name,
        slug: w.slug,
        manualBalance: manualBalanceNum,
        color: w.color,
        icon: w.icon,
        isDefault: w.isDefault,
        isVisible: w.isVisible,
        sortOrder: w.sortOrder,
        updatedAt: w.updatedAt,
        excelIncome: stats.income,
        excelExpense: stats.expense,
        netCashflow: stats.income - stats.expense,
        transactionCount: stats.count,
      };
    });

    const totalManualBalance = enrichedWallets
      .filter((w) => w.isVisible)
      .reduce((acc, w) => acc + w.manualBalance, 0);

    return NextResponse.json(
      serializeBigInt({
        wallets: enrichedWallets,
        totalManualBalance,
      })
    );
  } catch (error: unknown) {
    console.error("[API GET /api/wallets] Failed to load wallets:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallets from database." },
      { status: 500 }
    );
  }
}

