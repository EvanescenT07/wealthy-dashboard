import { NextRequest, NextResponse } from "next/server";
import { prisma, serializeBigInt } from "@/lib/prisma";

export async function GET() {
  try {
    const setting = await prisma.budgetSetting.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        monthlyLimitIdr: BigInt(5000000),
      },
    });
    return NextResponse.json(serializeBigInt({ budget: setting }));
  } catch (error: unknown) {
    console.error("[API GET /api/settings/budget] Error fetching budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly budget target." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { monthlyLimitIdr?: number | string };
    const rawLimit = body.monthlyLimitIdr;
    const numeric =
      typeof rawLimit === "string"
        ? Number.parseFloat(rawLimit.replace(/[^0-9.-]+/g, ""))
        : Number(rawLimit);

    if (!Number.isFinite(numeric) || numeric <= 0) {
      return NextResponse.json(
        { error: "Monthly budget limit must be a positive IDR amount." },
        { status: 400 }
      );
    }

    const updated = await prisma.budgetSetting.upsert({
      where: { id: "default" },
      update: {
        monthlyLimitIdr: BigInt(Math.round(numeric)),
      },
      create: {
        id: "default",
        monthlyLimitIdr: BigInt(Math.round(numeric)),
      },
    });

    return NextResponse.json(
      serializeBigInt({
        budget: updated,
      })
    );
  } catch (error: unknown) {
    console.error("[API PATCH /api/settings/budget] Failed to update budget:", error);
    return NextResponse.json(
      { error: "Failed to update monthly budget target." },
      { status: 500 }
    );
  }
}

