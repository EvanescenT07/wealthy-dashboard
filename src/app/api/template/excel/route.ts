import { NextResponse } from "next/server";
import { generateExcelTemplateBuffer } from "@/lib/excel";

export async function GET() {
  try {
    const buffer = generateExcelTemplateBuffer();

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="WealthyDashboard_Import_Template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("[API /api/template/excel] Failed to build template:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel template." },
      { status: 500 }
    );
  }
}

