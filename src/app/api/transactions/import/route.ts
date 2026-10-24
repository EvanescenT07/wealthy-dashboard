import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { parseExcelTransactions } from "@/lib/excel";
import { prisma, serializeBigInt } from "@/lib/prisma";
import { resolveWalletStyle, slugifyWalletName } from "@/lib/utils";

export async function GET() {
  try {
    const logs = await prisma.importLog.findMany({
      orderBy: { importedAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ logs: serializeBigInt(logs) });
  } catch (error: unknown) {
    console.error("[API GET /api/transactions/import] Failed to fetch import logs:", error);
    return NextResponse.json(
      { error: "Failed to load import history." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        { error: "Please attach a valid .xlsx or .xls file." },
        { status: 400 }
      );
    }

    const fileName = uploadedFile.name || "Uploaded_Transactions.xlsx";
    const arrayBuffer = await uploadedFile.arrayBuffer();
    const { rows, totalRowsRead } = parseExcelTransactions(arrayBuffer);

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid transaction rows found. Ensure columns Date, Account, Category, IDR, and Income/Expense are filled.",
        },
        { status: 422 }
      );
    }

    // Upsert all unique wallet accounts found in the file without touching existing manualBalance
    const uniqueAccounts = Array.from(new Set(rows.map((r) => r.account.trim())));
    const walletMap = new Map<string, string>();

    for (const accountName of uniqueAccounts) {
      const style = resolveWalletStyle(accountName);
      const baseSlug = slugifyWalletName(accountName) || `wallet-${Date.now()}`;

      const existing = await prisma.wallet.findFirst({
        where: {
          OR: [
            { name: { equals: accountName, mode: "insensitive" } },
            { slug: baseSlug },
          ],
        },
      });

      if (existing) {
        walletMap.set(accountName.toLowerCase(), existing.id);
      } else {
        const created = await prisma.wallet.create({
          data: {
            name: accountName,
            slug: baseSlug,
            manualBalance: BigInt(0),
            color: style.color,
            icon: style.icon,
            isDefault: style.isDefault,
            isVisible: true,
            sortOrder: style.sortOrder,
          },
        });
        walletMap.set(accountName.toLowerCase(), created.id);
      }
    }

    const createPayload: Prisma.TransactionCreateManyInput[] = [];
    for (const row of rows) {
      const walletId = walletMap.get(row.account.trim().toLowerCase());
      if (!walletId) {
        continue;
      }
      createPayload.push({
        externalHash: row.externalHash,
        date: row.date,
        walletId,
        category: row.category,
        subcategory: row.subcategory,
        note: row.note,
        description: row.description,
        amountIdr: row.amountIdr,
        type: row.type,
        currency: row.currency,
      });
    }

    const batchResult = await prisma.transaction.createMany({
      data: createPayload,
      skipDuplicates: true,
    });

    const insertedCount = batchResult.count;
    const skippedCount = Math.max(0, rows.length - insertedCount);

    const logEntry = await prisma.importLog.create({
      data: {
        fileName,
        totalRowsRead,
        insertedCount,
        skippedCount,
      },
    });

    return NextResponse.json(
      serializeBigInt({
        fileName,
        totalRowsRead,
        validRowsParsed: rows.length,
        insertedCount,
        skippedCount,
        importLog: logEntry,
      })
    );
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(
        "[API POST /api/transactions/import] Prisma error:",
        error.code,
        error.message
      );
      return NextResponse.json(
        { error: `Database error during Excel import (${error.code}).` },
        { status: 500 }
      );
    }
    console.error("[API POST /api/transactions/import] Excel import failed:", error);
    return NextResponse.json(
      { error: "Failed to process Excel file. Verify file format and database connection." },
      { status: 500 }
    );
  }
}

