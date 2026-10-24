import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifyAppPasscode,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { passcode?: string };
    const passcode = typeof body.passcode === "string" ? body.passcode : "";

    if (!passcode) {
      return NextResponse.json(
        { error: "Passcode is required." },
        { status: 400 }
      );
    }

    if (!verifyAppPasscode(passcode)) {
      return NextResponse.json(
        { error: "Invalid passcode. Please check your credentials." },
        { status: 401 }
      );
    }

    const token = await signSessionToken();
    const response = NextResponse.json({ authenticated: true });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      console.error("[API /api/auth/login] Malformed JSON payload:", error.message);
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    console.error("[API /api/auth/login] Authentication failed:", error);
    return NextResponse.json(
      { error: "Internal authentication error." },
      { status: 500 }
    );
  }
}

