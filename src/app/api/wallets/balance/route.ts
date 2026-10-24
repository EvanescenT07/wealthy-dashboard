import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, serializeBigInt } from "@/lib/prisma";

interface WalletBalanceUpdateItem {
  walletId: string;
  manualBalance?: number | string;
  isVisible?: boolean;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      updates?: WalletBalanceUpdateItem[];
    };

    if (!Array.isArray(body.updates) || body.updates.length === 0) {
      return NextResponse.json(
        { error: "Provide a non-empty updates array." },
        { status: 400 }
      );
    }

    const operations = body.updates.map((item) => {
      const data: Prisma.WalletUpdateInput = {};

      if (item.manualBalance !== undefined) {
        const numeric =
          typeof item.manualBalance === "string"
            ? Number.parseFloat(item.manualBalance.replace(/[^0-9.-]+/g, ""))
            : item.manualBalance;

        if (Number.isFinite(numeric)) {
          data.manualBalance = BigInt(Math.round(numeric));
        }
      }

      if (typeof item.isVisible === "boolean") {
        data.isVisible = item.isVisible;
      }

      return prisma.wallet.update({
        where: { id: item.walletId },
        data,
      });
    });

    const updated = await prisma.$transaction(operations);

    return NextResponse.json(
      serializeBigInt({
        updatedCount: updated.length,
        wallets: updated,
      })
    );
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(
        "[API PATCH /api/wallets/balance] Prisma update error:",
        error.code,
        error.message
      );
      return NextResponse.json(
        { error: `Database error updating wallet balances (${error.code}).` },
        { status: 500 }
      );
    }
    console.error("[API PATCH /api/wallets/balance] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to update wallet balances." },
      { status: 500 }
    );
  }
}

