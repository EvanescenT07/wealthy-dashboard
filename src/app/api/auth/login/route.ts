import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

async function ensureDefaultAdminExists() {
  const count = await prisma.user.count();
  if (count > 0) {
    return;
  }
  const defaultUsername = (process.env.ADMIN_USERNAME ?? "admin")
    .trim()
    .toLowerCase();
  const defaultPassword = (process.env.ADMIN_PASSWORD ?? "admin123").trim();

  await prisma.user.upsert({
    where: { username: defaultUsername },
    update: {},
    create: {
      username: defaultUsername,
      passwordHash: hashPassword(defaultPassword),
      displayName: "Primary Account Owner",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      displayName?: string;
      mode?: "login" | "register";
    };

    const rawUsername = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const rawPassword = typeof body.password === "string" ? body.password : "";
    const mode = body.mode === "register" ? "register" : "login";

    if (!rawUsername || !rawPassword) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    if (mode === "register") {
      if (rawUsername.length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters." },
          { status: 400 }
        );
      }
      if (rawPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { username: rawUsername },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Username is already registered. Please sign in." },
          { status: 409 }
        );
      }

      const newUser = await prisma.user.create({
        data: {
          username: rawUsername,
          passwordHash: hashPassword(rawPassword),
          displayName: body.displayName?.trim() || rawUsername,
        },
      });

      const token = await signSessionToken({
        id: newUser.id,
        username: newUser.username,
      });

      const response = NextResponse.json({
        authenticated: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          displayName: newUser.displayName,
        },
      });

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
    }

    await ensureDefaultAdminExists();

    const user = await prisma.user.findUnique({
      where: { username: rawUsername },
    });

    if (!user || !verifyPassword(rawPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      id: user.id,
      username: user.username,
    });

    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });

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
